import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MonitorSpeaker } from 'lucide-react';
import type { AudioSource, SessionStatus } from '../types';

interface Props {
  status: SessionStatus;
  sourceType: AudioSource | null;
}

export function ListeningIndicator({ status, sourceType }: Props) {
  const isListening = status === 'listening';
  const isPaused = status === 'paused';
  const show = isListening || isPaused;

  const SourceIcon = sourceType === 'system_audio' ? MonitorSpeaker : Mic;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={`
            inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
            ${isListening ? 'bg-live-soft text-live' : 'bg-amber-50 text-amber-700'}
          `}
        >
          {isListening ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-live opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-live" />
              </span>
              Live
            </>
          ) : (
            'Paused'
          )}
          {sourceType && (
            <>
              <span className="w-px h-3 bg-current opacity-20" />
              <SourceIcon size={12} />
              {sourceType === 'microphone' ? 'Mic' : 'System'}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
