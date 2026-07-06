import { useCallback, useEffect, useRef, useState } from 'react';
import type { AudioSource } from '../types';

const TARGET_SAMPLE_RATE = 24000;
const SILENCE_THRESHOLD = 0.012;
const SILENCE_MS = 1000;
const MIN_SPEECH_MS = 500;
const MAX_UTTERANCE_MS = 20000;

function rms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.floor(i * ratio);
    result[i] = buffer[idx] ?? 0;
  }
  return result;
}

function floatTo16BitPCM(float32: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface AudioCaptureState {
  isCapturing: boolean;
  error: string | null;
  sourceType: AudioSource | null;
}

export function useAudioCapture(
  onAudioChunk: (base64Pcm: string) => void,
  onUtteranceEnd: () => void,
  enabled: boolean
) {
  const [state, setState] = useState<AudioCaptureState>({
    isCapturing: false,
    error: null,
    sourceType: null,
  });

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const enabledRef = useRef(enabled);
  const onAudioChunkRef = useRef(onAudioChunk);
  const onUtteranceEndRef = useRef(onUtteranceEnd);
  const vadRef = useRef({
    speechStarted: false,
    speechStartAt: 0,
    silenceStartAt: 0,
  });

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    onAudioChunkRef.current = onAudioChunk;
  }, [onAudioChunk]);

  useEffect(() => {
    onUtteranceEndRef.current = onUtteranceEnd;
  }, [onUtteranceEnd]);

  const stopCapture = useCallback(() => {
    enabledRef.current = false;
    vadRef.current = { speechStarted: false, speechStartAt: 0, silenceStartAt: 0 };
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    contextRef.current?.close().catch(() => {});
    streamRef.current?.getTracks().forEach((t) => t.stop());

    processorRef.current = null;
    sourceRef.current = null;
    contextRef.current = null;
    streamRef.current = null;

    setState((s) => ({ ...s, isCapturing: false }));
  }, []);

  const startCapture = useCallback(
    async (sourceType: AudioSource) => {
      stopCapture();
      setState({ isCapturing: false, error: null, sourceType });

      try {
        let stream: MediaStream;

        if (sourceType === 'microphone') {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
            video: false,
          });
        } else {
          if (!navigator.mediaDevices.getDisplayMedia) {
            throw new Error(
              'System audio capture is not supported in this browser. Try Chrome or Edge and share a tab with audio.'
            );
          }

          stream = await navigator.mediaDevices.getDisplayMedia({
            audio: {
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
            video: true,
          });

          stream.getVideoTracks().forEach((track) => {
            track.stop();
            stream.removeTrack(track);
          });

          if (stream.getAudioTracks().length === 0) {
            stream.getTracks().forEach((t) => t.stop());
            throw new Error(
              'No audio track available. When sharing, select a tab and enable "Share tab audio".'
            );
          }
        }

        streamRef.current = stream;

        const context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
        contextRef.current = context;

        if (context.state === 'suspended') {
          await context.resume();
        }

        const source = context.createMediaStreamSource(stream);
        sourceRef.current = source;

        const processor = context.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (!enabledRef.current) return;
          const input = e.inputBuffer.getChannelData(0);
          const downsampled = downsampleBuffer(input, context.sampleRate, TARGET_SAMPLE_RATE);
          const pcm = floatTo16BitPCM(downsampled);
          onAudioChunkRef.current(arrayBufferToBase64(pcm));

          const volume = rms(downsampled);
          const now = Date.now();
          const vad = vadRef.current;
          const isSpeech = volume > SILENCE_THRESHOLD;

          if (isSpeech) {
            if (!vad.speechStarted) {
              vad.speechStarted = true;
              vad.speechStartAt = now;
            }
            vad.silenceStartAt = 0;
          } else if (vad.speechStarted) {
            if (vad.silenceStartAt === 0) {
              vad.silenceStartAt = now;
            }

            const silenceDuration = now - vad.silenceStartAt;
            const utteranceDuration = now - vad.speechStartAt;

            if (silenceDuration >= SILENCE_MS && utteranceDuration >= MIN_SPEECH_MS) {
              onUtteranceEndRef.current();
              vad.speechStarted = false;
              vad.silenceStartAt = 0;
            }
          }

          if (vad.speechStarted && now - vad.speechStartAt >= MAX_UTTERANCE_MS) {
            onUtteranceEndRef.current();
            vad.speechStarted = false;
            vad.silenceStartAt = 0;
          }
        };

        source.connect(processor);
        processor.connect(context.destination);

        stream.getAudioTracks()[0]?.addEventListener('ended', () => {
          stopCapture();
        });

        enabledRef.current = true;
        setState({ isCapturing: true, error: null, sourceType });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to access audio. Permission denied or unavailable.';
        setState({ isCapturing: false, error: message, sourceType });
        throw err;
      }
    },
    [stopCapture]
  );

  return { ...state, startCapture, stopCapture };
}
