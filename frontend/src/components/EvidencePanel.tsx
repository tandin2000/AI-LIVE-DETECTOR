import { motion } from 'framer-motion';
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import type { FactCheckResult } from '../types';

interface Props {
  result: FactCheckResult;
}

function EvidenceList({
  title,
  items,
  icon: Icon,
  color,
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle;
  color: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-3">
      <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${color} mb-2`}>
        <Icon size={12} />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-ink-secondary leading-relaxed pl-3 border-l-2 border-line">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EvidencePanel({ result }: Props) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      className="mt-3 pt-3 border-t border-line overflow-hidden"
    >
      <EvidenceList
        title="Supporting"
        items={result.supporting_evidence}
        icon={CheckCircle}
        color="text-emerald-600"
      />
      <EvidenceList
        title="Contradicting"
        items={result.contradicting_evidence}
        icon={XCircle}
        color="text-red-600"
      />
      <EvidenceList
        title="Missing"
        items={result.missing_information}
        icon={HelpCircle}
        color="text-ink-muted"
      />
      {result.supporting_evidence.length === 0 &&
        result.contradicting_evidence.length === 0 &&
        result.missing_information.length === 0 && (
          <p className="text-xs text-ink-muted">No detailed evidence available</p>
        )}
    </motion.div>
  );
}
