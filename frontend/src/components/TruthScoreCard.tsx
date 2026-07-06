import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, AlertTriangle, Loader2 } from 'lucide-react';
import type { FactCheckResult } from '../types';
import { getVerdictColor } from '../utils/verdictColors';
import { EvidencePanel } from './EvidencePanel';

interface Props {
  result: FactCheckResult | null;
  isVerifying?: boolean;
  queuePending?: number;
}

export function TruthScoreCard({ result, isVerifying = false, queuePending = 0 }: Props) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!result && isVerifying) {
    return (
      <div className="panel h-full flex flex-col min-h-[380px] lg:min-h-0">
        <div className="panel-header">
          <h2 className="panel-title">Confidence</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 pb-8">
          <Loader2 size={28} className="text-accent animate-spin" />
          <p className="text-sm text-ink-muted">Evaluating</p>
          {queuePending > 0 && (
            <p className="text-xs text-amber-600">{queuePending} waiting</p>
          )}
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="panel h-full flex flex-col min-h-[380px] lg:min-h-0">
        <div className="panel-header">
          <h2 className="panel-title">Confidence</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-6 pb-6">
          <p className="text-ink-muted text-sm text-center leading-relaxed">
            Verdict and confidence score appear after a claim is checked
          </p>
        </div>
      </div>
    );
  }

  const colors = getVerdictColor(result.verdict);

  return (
    <div className="panel h-full flex flex-col min-h-[380px] lg:min-h-0">
      <div className="panel-header">
        <h2 className="panel-title">Confidence</h2>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="text-center w-full"
        >
          <div className="relative inline-flex mb-5">
            <div
              className={`flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${colors.gradient} shadow-float`}
            >
              <span className="text-3xl font-bold text-white tabular-nums tracking-tight">
                {result.confidence}
                <span className="text-lg font-medium opacity-80">%</span>
              </span>
            </div>
          </div>

          <span
            className={`inline-block px-3.5 py-1 rounded-lg text-xs font-semibold tracking-wide uppercase ${colors.bg} ${colors.text}`}
          >
            {result.verdict}
          </span>

          <p className="text-sm text-ink-secondary mt-5 max-w-[260px] mx-auto leading-relaxed">
            {result.explanation}
          </p>

          {result.should_update_later && (
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[11px] text-amber-600">
              <AlertTriangle size={11} />
              May update with more context
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-5 pb-5">
        <button
          type="button"
          onClick={() => setShowEvidence(!showEvidence)}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-surface-inset hover:bg-line text-xs font-semibold text-ink-secondary uppercase tracking-wide transition-colors"
        >
          Why
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showEvidence ? 'rotate-180' : ''}`}
          />
        </button>
        {showEvidence && <EvidencePanel result={result} />}
      </div>
    </div>
  );
}
