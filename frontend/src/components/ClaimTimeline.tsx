import { motion } from 'framer-motion';
import type { HistoryEntry } from '../types';
import { getVerdictColor } from '../utils/verdictColors';

interface Props {
  history: HistoryEntry[];
}

export function ClaimTimeline({ history }: Props) {
  return (
    <div className="panel">
      <div className="panel-header border-b border-line">
        <h2 className="panel-title">Timeline</h2>
        {history.length > 0 && (
          <span className="ml-auto text-[11px] font-medium text-ink-muted tabular-nums">
            {history.length}
          </span>
        )}
      </div>

      {history.length === 0 ? (
        <p className="text-ink-muted text-sm py-8 text-center">
          Checked claims will stack here during your session
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto scroll-area px-5 py-4">
          {history.map((entry, i) => {
            const colors = getVerdictColor(entry.verdict);
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.35 }}
                className="flex-shrink-0 w-[220px] p-4 rounded-xl border border-line bg-surface-muted hover:border-line-strong transition-colors"
              >
                <p className="text-[13px] font-medium text-ink-primary line-clamp-3 leading-snug mb-3">
                  {entry.claim}
                </p>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                    {entry.verdict}
                  </span>
                  <span className="text-sm font-semibold text-ink-primary tabular-nums">
                    {entry.confidence}%
                  </span>
                </div>
                <p className="text-[10px] text-ink-muted mt-2.5 tabular-nums">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
