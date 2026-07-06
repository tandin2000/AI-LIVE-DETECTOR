import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  segments: string[];
  liveSegment: string;
  isListening: boolean;
}

export function LiveTranscript({ segments, liveSegment, isListening }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasContent = segments.length > 0 || liveSegment.length > 0;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [segments, liveSegment]);

  return (
    <div className="panel h-full flex flex-col min-h-[380px] lg:min-h-0">
      <div className="panel-header border-b border-line">
        <h2 className="panel-title">Transcript</h2>
        {isListening && (
          <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-live">
            <span className="w-1.5 h-1.5 bg-live rounded-full animate-pulse-soft" />
            Recording
          </span>
        )}
      </div>

      <div
        ref={scrollRef}
        className="scroll-area flex-1 min-h-[280px] max-h-[min(520px,60vh)] px-5 py-4 space-y-3"
      >
        <AnimatePresence mode="popLayout">
          {!hasContent ? (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-ink-muted text-sm leading-relaxed py-8 text-center"
            >
              {isListening
                ? 'Waiting for speech…'
                : 'Select a source and press Start'}
            </motion.p>
          ) : (
            <>
              {segments.map((segment, i) => (
                <motion.div
                  key={`seg-${i}-${segment.slice(0, 20)}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="group"
                >
                  <p className="text-[15px] leading-[1.65] text-ink-primary tracking-[-0.01em]">
                    {segment}
                  </p>
                  {i < segments.length - 1 && (
                    <div className="mt-3 h-px bg-line" />
                  )}
                </motion.div>
              ))}
              {liveSegment && (
                <motion.p
                  key="live"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[15px] leading-[1.65] text-ink-muted"
                >
                  {liveSegment}
                  {isListening && (
                    <span className="inline-block w-[2px] h-[1em] bg-accent ml-0.5 align-middle animate-pulse" />
                  )}
                </motion.p>
              )}
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
