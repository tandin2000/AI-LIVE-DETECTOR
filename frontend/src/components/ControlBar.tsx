import { motion } from 'framer-motion';
import { Pause, Play, Square, Radio } from 'lucide-react';
import type { SessionStatus } from '../types';

interface Props {
  status: SessionStatus;
  canStart: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function ControlBar({ status, canStart, onStart, onPause, onResume, onStop }: Props) {
  const isListening = status === 'listening';
  const isPaused = status === 'paused';
  const isActive = isListening || isPaused;
  const isConnecting = status === 'connecting';

  if (isConnecting) {
    return (
      <div className="flex items-center gap-2.5 px-5 py-2.5 text-ink-muted text-sm">
        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        Connecting
      </div>
    );
  }

  if (!isActive) {
    return (
      <motion.button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        whileTap={{ scale: canStart ? 0.97 : 1 }}
        className={`
          flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all
          ${canStart
            ? 'bg-ink-primary text-white hover:bg-ink-secondary shadow-sm'
            : 'bg-surface-inset text-ink-muted cursor-not-allowed'
          }
        `}
      >
        <Radio size={16} />
        Start
      </motion.button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isListening ? (
        <button
          type="button"
          onClick={onPause}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-ink-secondary bg-surface-inset hover:bg-line transition-colors"
        >
          <Pause size={15} />
          Pause
        </button>
      ) : (
        <button
          type="button"
          onClick={onResume}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
        >
          <Play size={15} />
          Resume
        </button>
      )}
      <button
        type="button"
        onClick={onStop}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
      >
        <Square size={14} fill="currentColor" />
        Stop
      </button>
    </div>
  );
}
