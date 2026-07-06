import type { WebSocket } from 'ws';
import { verifySessionToken, verifyHistoryAuthToken } from '../auth.js';
import { config } from '../config.js';
import { detectClaims, factCheckClaim, resetFactCheckState } from '../openai/factcheck.js';
import { RealtimeTranscriptionSession } from '../openai/realtime.js';
import { getApiKey, deleteApiKey } from '../openai/apiKeyStore.js';
import { addHistoryEntry } from '../history/store.js';
import { wsAuthMessageSchema, wsClientMessageSchema } from '../validation.js';

interface QueuedVerification {
  claim: string;
  context: string;
}

interface SessionState {
  realtime: RealtimeTranscriptionSession | null;
  realtimeStarting: boolean;
  segments: string[];
  liveSegment: string;
  sourceType: 'microphone' | 'system_audio';
  language: string;
  apiKey: string;
  sessionId: string;
  userId: string;
  paused: boolean;
  active: boolean;
  historyEnabled: boolean;
  checkedClaims: Set<string>;
  verificationQueue: QueuedVerification[];
  queueProcessing: boolean;
  audioQueue: string[];
  audioRateWindowStart: number;
  audioRateCount: number;
}

const sessions = new WeakMap<WebSocket, SessionState>();

function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function extractTranscriptEvent(
  event: Record<string, unknown>
): { kind: 'delta' | 'completed'; text: string } | null {
  const type = event.type as string;

  if (type === 'conversation.item.input_audio_transcription.completed') {
    const transcript = event.transcript as string | undefined;
    return transcript ? { kind: 'completed', text: transcript } : null;
  }

  if (type === 'conversation.item.input_audio_transcription.delta') {
    const delta = event.delta as string | undefined;
    return delta ? { kind: 'delta', text: delta } : null;
  }

  return null;
}

function getRecentContext(segments: string[]): string {
  return segments.slice(-4).join(' ');
}

function sendQueueUpdate(ws: WebSocket, state: SessionState, current?: string): void {
  send(ws, {
    type: 'queue_update',
    pending: state.verificationQueue.length,
    processing: state.queueProcessing,
    current: current ?? null,
  });
}

function allowAudioMessage(state: SessionState): boolean {
  const now = Date.now();
  if (now - state.audioRateWindowStart > config.WS_AUDIO_RATE_WINDOW_MS) {
    state.audioRateWindowStart = now;
    state.audioRateCount = 0;
  }
  state.audioRateCount += 1;
  return state.audioRateCount <= config.WS_AUDIO_RATE_MAX;
}

function enqueueClaims(ws: WebSocket, state: SessionState, claims: string[], context: string): void {
  let added = 0;

  for (const claim of claims) {
    const claimKey = claim.toLowerCase();
    if (state.checkedClaims.has(claimKey)) continue;

    state.checkedClaims.add(claimKey);
    state.verificationQueue.push({ claim, context });
    added++;
  }

  if (added > 0) {
    sendQueueUpdate(ws, state);
    void processVerificationQueue(ws, state);
  }
}

async function processVerificationQueue(ws: WebSocket, state: SessionState): Promise<void> {
  if (state.queueProcessing) return;

  state.queueProcessing = true;

  while (state.verificationQueue.length > 0) {
    const item = state.verificationQueue.shift()!;
    sendQueueUpdate(ws, state, item.claim);
    send(ws, { type: 'claim_detected', claim: item.claim });

    const result = await factCheckClaim(
      item.claim,
      item.context,
      state.sourceType,
      state.apiKey,
      state.sessionId
    );
    send(ws, { type: 'fact_check', result });

    if (state.historyEnabled) {
      const entry = addHistoryEntry(state.userId, result);
      send(ws, { type: 'history_saved', entry });
    }

    sendQueueUpdate(ws, state);
  }

  state.queueProcessing = false;
  sendQueueUpdate(ws, state);
}

async function processCompletedSegment(
  ws: WebSocket,
  state: SessionState,
  segment: string
): Promise<void> {
  const text = segment.trim();
  if (!text) return;

  state.segments.push(text);
  if (state.segments.length > 20) {
    state.segments = state.segments.slice(-15);
  }
  state.liveSegment = '';

  send(ws, { type: 'transcript_segment', segment: text });

  const context = getRecentContext(state.segments);
  const claims = await detectClaims(text, context, state.apiKey, state.sessionId);
  if (claims.length === 0) return;

  enqueueClaims(ws, state, claims, context);
}

function processTranscriptDelta(ws: WebSocket, state: SessionState, delta: string): void {
  if (!delta) return;
  state.liveSegment += delta;
  send(ws, { type: 'transcript_delta', delta });
}

function flushAudioQueue(state: SessionState): void {
  if (!state.realtime?.isActive()) return;
  for (const chunk of state.audioQueue) {
    state.realtime.appendAudio(chunk);
  }
  state.audioQueue = [];
}

async function ensureRealtimeSession(ws: WebSocket, state: SessionState): Promise<void> {
  if (state.realtime?.isActive() || state.realtimeStarting) return;

  state.realtimeStarting = true;

  const realtime = new RealtimeTranscriptionSession(
    state.language,
    state.apiKey,
    (event) => {
      const transcriptEvent = extractTranscriptEvent(event);
      if (!transcriptEvent) return;

      if (transcriptEvent.kind === 'delta') {
        processTranscriptDelta(ws, state, transcriptEvent.text);
      } else {
        void processCompletedSegment(ws, state, transcriptEvent.text);
      }
    },
    (error) => {
      send(ws, { type: 'error', message: error });
    }
  );

  try {
    await realtime.connect();
    state.realtime = realtime;
    state.active = true;
    flushAudioQueue(state);
    send(ws, { type: 'session_started', sourceType: state.sourceType });
  } catch {
    send(ws, { type: 'error', message: 'Failed to connect to transcription service' });
  } finally {
    state.realtimeStarting = false;
  }
}

function cleanupSession(ws: WebSocket): void {
  const state = sessions.get(ws);
  if (!state) return;

  state.realtime?.close();
  state.realtime = null;
  state.active = false;
  state.audioQueue = [];
  state.verificationQueue = [];
  state.queueProcessing = false;
  deleteApiKey(state.sessionId);
  resetFactCheckState(state.sessionId);
  sessions.delete(ws);
}

function resolveHistoryEnabled(userId: string, historyToken?: string): boolean {
  if (!historyToken) return false;
  try {
    const historyPayload = verifyHistoryAuthToken(historyToken);
    return historyPayload.sub === userId;
  } catch {
    return false;
  }
}

function attachSessionHandlers(ws: WebSocket, state: SessionState): void {
  sessions.set(ws, state);

  send(ws, {
    type: 'connected',
    sourceType: state.sourceType,
    message: 'Session ready. Send audio to begin transcription.',
  });

  void ensureRealtimeSession(ws, state);

  ws.on('message', (raw) => {
    const current = sessions.get(ws);
    if (!current) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid message format' });
      return;
    }

    const result = wsClientMessageSchema.safeParse(parsed);
    if (!result.success) {
      send(ws, { type: 'error', message: 'Invalid message' });
      return;
    }

    const msg = result.data;

    switch (msg.type) {
      case 'audio':
        if (current.paused) break;
        if (!allowAudioMessage(current)) {
          send(ws, { type: 'error', message: 'Audio rate limit exceeded. Slow down.' });
          break;
        }
        if (current.realtime?.isActive()) {
          current.realtime.appendAudio(msg.data);
        } else {
          current.audioQueue.push(msg.data);
          if (current.audioQueue.length > 200) {
            current.audioQueue = current.audioQueue.slice(-100);
          }
          void ensureRealtimeSession(ws, current);
        }
        break;

      case 'pause':
        current.paused = true;
        current.realtime?.setPaused(true);
        send(ws, { type: 'paused' });
        break;

      case 'resume':
        current.paused = false;
        current.realtime?.setPaused(false);
        send(ws, { type: 'resumed' });
        break;

      case 'commit':
        current.realtime?.commitBuffer();
        break;

      case 'stop':
        current.realtime?.close();
        current.realtime = null;
        current.active = false;
        current.paused = false;
        current.audioQueue = [];
        current.verificationQueue = [];
        current.queueProcessing = false;
        resetFactCheckState(current.sessionId);
        send(ws, { type: 'stopped' });
        break;
    }
  });

  ws.on('close', () => {
    cleanupSession(ws);
  });
}

export function handleWebSocketConnection(ws: WebSocket): void {
  let authenticated = false;

  const authTimeout = setTimeout(() => {
    if (!authenticated) {
      send(ws, { type: 'error', message: 'Authentication timeout' });
      ws.close();
    }
  }, config.WS_AUTH_TIMEOUT_MS);

  const onAuthMessage = (raw: Buffer | ArrayBuffer | Buffer[]): void => {
    if (authenticated) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'error', message: 'Invalid auth message' });
      ws.close();
      return;
    }

    const authResult = wsAuthMessageSchema.safeParse(parsed);
    if (!authResult.success) {
      send(ws, { type: 'error', message: 'Authentication required' });
      ws.close();
      return;
    }

    let payload;
    try {
      payload = verifySessionToken(authResult.data.token);
    } catch {
      send(ws, { type: 'error', message: 'Invalid or expired session token' });
      ws.close();
      return;
    }

    const apiKey = getApiKey(payload.sessionId);
    if (!apiKey) {
      send(ws, { type: 'error', message: 'Session expired. Please start again.' });
      ws.close();
      return;
    }

    authenticated = true;
    clearTimeout(authTimeout);
    ws.off('message', onAuthMessage);

    const historyEnabled = resolveHistoryEnabled(payload.sub, authResult.data.historyToken);

    const state: SessionState = {
      realtime: null,
      realtimeStarting: false,
      segments: [],
      liveSegment: '',
      sourceType: payload.sourceType,
      language: payload.language,
      apiKey,
      sessionId: payload.sessionId,
      userId: payload.sub,
      paused: false,
      active: false,
      historyEnabled,
      checkedClaims: new Set(),
      verificationQueue: [],
      queueProcessing: false,
      audioQueue: [],
      audioRateWindowStart: Date.now(),
      audioRateCount: 0,
    };

    attachSessionHandlers(ws, state);
  };

  ws.on('message', onAuthMessage);

  ws.on('close', () => {
    clearTimeout(authTimeout);
    cleanupSession(ws);
  });
}
