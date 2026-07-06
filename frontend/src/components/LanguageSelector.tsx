import { Globe } from 'lucide-react';
import { LANGUAGES } from '../constants/languages';

interface Props {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function LanguageSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="relative">
      <Globe
        size={15}
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none"
      />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none w-full sm:w-auto min-w-[168px] pl-9 pr-9 py-2.5 rounded-xl border border-line bg-surface-card text-sm font-medium text-ink-primary
          focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40
          disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        {LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.native}
          </option>
        ))}
      </select>
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none text-xs">
        ▾
      </span>
    </div>
  );
}
