import { useState } from 'react';
import { motion } from 'framer-motion';
import { KeyRound, ExternalLink } from 'lucide-react';

interface Props {
  onSave: (key: string) => void;
  initialValue?: string;
  title?: string;
}

export function ApiKeyPrompt({ onSave, initialValue = '', title = 'Enter your OpenAI API key' }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith('sk-') || trimmed.length < 20) {
      setError('Enter a valid key starting with sk-');
      return;
    }
    setError(null);
    onSave(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-primary/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="panel w-full max-w-md p-6 sm:p-8 shadow-float"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-accent-soft text-accent">
            <KeyRound size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-primary tracking-tight">{title}</h2>
            <p className="text-sm text-ink-muted mt-0.5">Stored locally in your browser only</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="api-key" className="sr-only">
              OpenAI API key
            </label>
            <input
              id="api-key"
              type="password"
              autoComplete="off"
              autoFocus
              placeholder="sk-..."
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-line bg-surface-muted text-ink-primary text-sm
                placeholder:text-ink-muted/60 focus:outline-none focus:ring-2 focus:ring-accent/25 focus:border-accent/40"
            />
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-ink-primary text-white text-sm font-semibold hover:bg-ink-secondary transition-colors"
          >
            Continue
          </button>
        </form>

        <a
          href="https://platform.openai.com/api-keys"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-muted hover:text-accent transition-colors"
        >
          Get an API key
          <ExternalLink size={12} />
        </a>
      </motion.div>
    </div>
  );
}
