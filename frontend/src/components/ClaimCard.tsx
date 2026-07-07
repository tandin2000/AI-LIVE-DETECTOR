import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface Props {
  claim: string | null;
  queuePending?: number;
  isVerifying?: boolean;
  sourceType?: 'microphone' | 'system_audio' | null;
}

export function ClaimCard({ claim, queuePending = 0, isVerifying = false, sourceType = null }: Props) {
  return (
    <div className="panel h-full flex flex-col min-h-[380px] lg:min-h-0">
      <div className="panel-header">
        <h2 className="panel-title">{sourceType === 'microphone' ? 'Sentence' : 'Claim'}</h2>
        {queuePending > 0 && (
          <span className="ml-auto text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
            +{queuePending} queued
          </span>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-6">
        {claim ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center w-full"
          >
            <p className="text-xl sm:text-2xl font-medium text-ink-primary leading-snug tracking-[-0.02em]">
              {claim}
            </p>
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 mt-5 text-sm text-accent">
                <Loader2 size={14} className="animate-spin" />
                Checking
              </div>
            )}
          </motion.div>
        ) : (
          <p className="text-ink-muted text-sm text-center leading-relaxed">
            {sourceType === 'microphone'
              ? 'Spoken sentences appear here as they are checked'
              : 'Summarized claims appear here as speech is analyzed'}
          </p>
        )}
      </div>
    </div>
  );
}
