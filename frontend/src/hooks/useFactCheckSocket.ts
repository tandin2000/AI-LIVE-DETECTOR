import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { AudioSource, FactCheckResult, HistoryEntry, SessionStatus } from '../types';

const CLIENT_ID_KEY = 'factcheck_client_id';

function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

export function useFactCheckSocket() {
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [sourceType, setSourceType] = useState<AudioSource | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [liveSegment, setLiveSegment] = useState('');
  const [currentClaim, setCurrentClaim] = useState<string | null>(null);
  const [currentResult, setCurrentResult] = useState<FactCheckResult | null>(null);
  const [queuePending, setQueuePending] = useState(0);
  const [queueProcessing, setQueueProcessing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [claimHistory, setClaimHistory] = useState<HistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioEnabledRef = useRef(false);

  const closeSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioEnabledRef.current = false;
  }, []);

  const connect = useCallback(
    async (source: AudioSource, language: string, apiKey: string) => {
      closeSocket();
      setError(null);
      setStatus('connecting');
      setSourceType(source);
      setSegments([]);
      setLiveSegment('');
      setCurrentClaim(null);
      setCurrentResult(null);
      setQueuePending(0);
      setQueueProcessing(false);
      setIsVerifying(false);
      setClaimHistory([]);

      try {
        const res = await fetch('/api/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType: source, language, apiKey, clientId: getClientId() }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          const message =
            typeof data.error === 'string'
              ? data.error
              : data.details?.apiKey?.[0] ?? 'Failed to create session';
          throw new Error(message);
        }

        const data = await res.json();

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        const ws = new WebSocket(`${protocol}//${host}/ws`);
        wsRef.current = ws;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Connection timeout')), 10000);
          let authed = false;

          ws.onopen = () => {
            ws.send(JSON.stringify({ type: 'auth', token: data.token }));
          };

          ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (!authed) {
              if (msg.type === 'connected') {
                clearTimeout(timeout);
                authed = true;
                audioEnabledRef.current = true;
                setStatus('listening');
                resolve();
              } else if (msg.type === 'error') {
                clearTimeout(timeout);
                reject(new Error(msg.message ?? 'Authentication failed'));
              }
              return;
            }

            switch (msg.type) {
            case 'transcript_delta':
              setLiveSegment((prev) => prev + msg.delta);
              break;
            case 'transcript_segment':
              setSegments((prev) => [...prev, msg.segment].slice(-20));
              setLiveSegment('');
              break;
            case 'queue_update':
              setQueuePending(msg.pending ?? 0);
              setQueueProcessing(Boolean(msg.processing));
              setIsVerifying(Boolean(msg.processing) && (msg.pending > 0 || Boolean(msg.current)));
              break;
            case 'claim_detected':
              setCurrentClaim(msg.claim);
              setIsVerifying(true);
              break;
            case 'fact_check':
              setCurrentResult(msg.result);
              setIsVerifying(false);
              setClaimHistory((prev) => [
                {
                  ...msg.result,
                  id: crypto.randomUUID(),
                  timestamp: new Date().toISOString(),
                },
                ...prev,
              ].slice(0, 100));
              break;
            case 'paused':
              setStatus('paused');
              audioEnabledRef.current = false;
              break;
            case 'resumed':
              setStatus('listening');
              audioEnabledRef.current = true;
              break;
            case 'stopped':
              setStatus('stopped');
              audioEnabledRef.current = false;
              break;
            case 'error':
              setError(msg.message);
              break;
          }
          };

          ws.onerror = () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
          };
        });

        ws.onclose = () => {
          audioEnabledRef.current = false;
          setStatus((s) => (s === 'stopped' ? s : 'stopped'));
        };
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Connection failed');
        setStatus('idle');
        closeSocket();
      }
    },
    [closeSocket]
  );

  const commitSegment = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'commit' }));
  }, []);

  const sendAudio = useCallback((base64Pcm: string) => {
    const ws = wsRef.current;
    if (ws?.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'audio', data: base64Pcm }));
  }, []);

  const pause = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'pause' }));
    audioEnabledRef.current = false;
    setStatus('paused');
  }, []);

  const resume = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'resume' }));
    audioEnabledRef.current = true;
    setStatus('listening');
  }, []);

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'stop' }));
    audioEnabledRef.current = false;
    setStatus('stopped');
    closeSocket();
  }, [closeSocket]);

  useEffect(() => () => closeSocket(), [closeSocket]);

  return {
    status,
    sourceType,
    segments,
    liveSegment,
    currentClaim,
    currentResult,
    queuePending,
    queueProcessing,
    isVerifying,
    claimHistory,
    error,
    audioEnabled: audioEnabledRef.current,
    connect,
    sendAudio,
    commitSegment,
    pause,
    resume,
    stop,
    setError,
  };
}
