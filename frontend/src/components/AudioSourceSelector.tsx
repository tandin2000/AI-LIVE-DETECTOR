import { motion } from 'framer-motion';
import { Mic, MonitorSpeaker } from 'lucide-react';
import type { AudioSource } from '../types';

interface Props {
  selected: AudioSource | null;
  onSelect: (source: AudioSource) => void;
  disabled: boolean;
}

const sources: { id: AudioSource; label: string; icon: typeof Mic }[] = [
  { id: 'microphone', label: 'Mic', icon: Mic },
  { id: 'system_audio', label: 'System', icon: MonitorSpeaker },
];

export function AudioSourceSelector({ selected, onSelect, disabled }: Props) {
  return (
    <div className="inline-flex p-1 rounded-xl bg-surface-inset border border-line">
      {sources.map((source) => {
        const Icon = source.icon;
        const isSelected = selected === source.id;
        return (
          <motion.button
            key={source.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(source.id)}
            whileTap={disabled ? {} : { scale: 0.97 }}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${isSelected
                ? 'bg-surface-card text-ink-primary shadow-sm'
                : 'text-ink-muted hover:text-ink-secondary'
              }
              ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <Icon size={16} strokeWidth={2} />
            {source.label}
          </motion.button>
        );
      })}
    </div>
  );
}
