import WebSocket from 'ws';
import { config } from '../config.js';

export type RealtimeEventHandler = (event: Record<string, unknown>) => void;

const MAX_UTTERANCE_MS = 25000;

export class RealtimeTranscriptionSession {
  private ws: WebSocket | null = null;
  private connected = false;
  private paused = false;
  private closed = false;
  private pendingAudio: string[] = [];
  private hasAudioSinceCommit = false;
  private lastCommitAt = 0;
  private commitTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly language: string,
    private readonly apiKey: string,
    private readonly onEvent: RealtimeEventHandler,
    private readonly onError: (error: string) => void
  ) {}

  async connect(): Promise<void> {
    const url = 'wss://api.openai.com/v1/realtime?intent=transcription';

    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      const timeout = setTimeout(() => {
        reject(new Error('Realtime connection timeout'));
        this.close();
      }, 15000);

      this.ws.on('open', () => {
        clearTimeout(timeout);
        this.connected = true;
        this.configureSession();
        this.startCommitTimer();
        this.flushPendingAudio();
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString()) as Record<string, unknown>;
          this.handleServerEvent(event);
        } catch {
          // ignore malformed events
        }
      });

      this.ws.on('error', () => {
        clearTimeout(timeout);
        this.onError('Realtime connection error');
        reject(new Error('Realtime connection error'));
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.closed = true;
      });
    });
  }

  private configureSession(): void {
    const transcription: Record<string, string> = {
      model: config.OPENAI_TRANSCRIPTION_MODEL,
      delay: 'low',
    };

    if (this.language !== 'auto') {
      transcription.language = this.language;
    }

    this.send({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            transcription,
            // gpt-realtime-whisper does not support server VAD — commit audio manually.
            turn_detection: null,
          },
        },
      },
    });
  }

  private startCommitTimer(): void {
    this.stopCommitTimer();
    // Safety fallback: commit if someone speaks continuously without pausing.
    this.commitTimer = setInterval(() => {
      this.maybeCommitBuffer();
    }, MAX_UTTERANCE_MS);
  }

  private stopCommitTimer(): void {
    if (this.commitTimer) {
      clearInterval(this.commitTimer);
      this.commitTimer = null;
    }
  }

  private maybeCommitBuffer(force = false): void {
    if (!this.connected || this.closed || this.paused) return;
    if (!this.hasAudioSinceCommit && !force) return;

    const now = Date.now();
    if (!force && now - this.lastCommitAt < MAX_UTTERANCE_MS) return;

    this.hasAudioSinceCommit = false;
    this.lastCommitAt = now;
    this.send({ type: 'input_audio_buffer.commit' });
  }

  private handleServerEvent(event: Record<string, unknown>): void {
    const type = event.type as string;

    if (type === 'error') {
      const err = event.error as { message?: string; code?: string } | undefined;
      let message = err?.message ?? 'Realtime API error';
      if (err?.code === 'insufficient_quota') {
        message =
          'OpenAI API quota exceeded. Check your billing at platform.openai.com and add credits.';
      }
      this.onError(message);
      return;
    }

    if (type === 'session.updated' || type === 'session.created') {
      // Session ready
    }

    this.onEvent(event);
  }

  appendAudio(base64Pcm: string): void {
    if (this.closed || this.paused) return;

    if (!this.connected) {
      this.pendingAudio.push(base64Pcm);
      if (this.pendingAudio.length > 200) {
        this.pendingAudio = this.pendingAudio.slice(-100);
      }
      return;
    }

    this.hasAudioSinceCommit = true;
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Pcm,
    });
  }

  private flushPendingAudio(): void {
    for (const chunk of this.pendingAudio) {
      this.hasAudioSinceCommit = true;
      this.send({
        type: 'input_audio_buffer.append',
        audio: chunk,
      });
    }
    this.pendingAudio = [];
  }

  commitBuffer(): void {
    this.maybeCommitBuffer(true);
  }

  setPaused(paused: boolean): void {
    if (paused && !this.paused) {
      this.maybeCommitBuffer(true);
    }
    this.paused = paused;
  }

  private send(payload: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close(): void {
    if (this.closed) return;
    this.maybeCommitBuffer(true);
    this.closed = true;
    this.pendingAudio = [];
    this.stopCommitTimer();
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
    this.ws = null;
    this.connected = false;
  }

  isActive(): boolean {
    return this.connected && !this.closed;
  }
}
