import { config as loadDotenv } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { z } from 'zod';

// Load local .env only — never on Render (avoids dev HOST/NODE_ENV leaking into deploy)
if (!process.env.RENDER) {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env');
  loadDotenv({ path: envPath });
}

const IS_RENDER = process.env.RENDER === 'true';

const DEV_JWT_PLACEHOLDER = 'dev-jwt-secret-change-in-production-32chars';
const DEV_HISTORY_PLACEHOLDER = 'dev-history-secret-key';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_REALTIME_MODEL: z.string().default('gpt-realtime'),
  OPENAI_TRANSCRIPTION_MODEL: z.string().default('gpt-realtime-whisper'),
  OPENAI_CLAIM_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_FACTCHECK_MODEL: z.string().default('gpt-5.5'),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  SESSION_TOKEN_TTL_SECONDS: z.coerce.number().default(900),
  HISTORY_AUTH_SECRET: z.string().min(16),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  WS_AUTH_TIMEOUT_MS: z.coerce.number().default(10000),
  WS_AUDIO_RATE_MAX: z.coerce.number().default(25),
  WS_AUDIO_RATE_WINDOW_MS: z.coerce.number().default(1000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

const data = parsed.data;

const nodeEnv =
  data.NODE_ENV === 'production' || IS_RENDER ? 'production' : data.NODE_ENV;

function resolveFrontendUrl(explicit?: string): string {
  const trim = (url: string) => url.replace(/\/$/, '');

  // On Render, always prefer platform URL — ignore http://localhost from copied .env
  if (IS_RENDER) {
    if (process.env.RENDER_EXTERNAL_URL) {
      return trim(process.env.RENDER_EXTERNAL_URL);
    }
    if (process.env.RENDER_EXTERNAL_HOSTNAME) {
      return `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    }
    if (explicit?.startsWith('https://')) {
      return trim(explicit);
    }
  }

  const raw = explicit ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:5173';
  return trim(raw);
}

const frontendUrl = resolveFrontendUrl(data.FRONTEND_URL);

function resolveHost(explicit?: string): string {
  if (IS_RENDER || nodeEnv === 'production') return '0.0.0.0';
  return explicit ?? '127.0.0.1';
}

function resolvePort(): number {
  // Render injects PORT; always prefer the platform value when present.
  const platformPort = process.env.PORT;
  if (platformPort !== undefined && platformPort !== '') {
    const n = Number(platformPort);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return data.PORT;
}

if (nodeEnv === 'production') {
  const weakSecrets = [DEV_JWT_PLACEHOLDER, DEV_HISTORY_PLACEHOLDER, 'change-this'];
  if (weakSecrets.some((s) => data.JWT_SECRET.includes(s) || data.HISTORY_AUTH_SECRET.includes(s))) {
    console.error('Production requires strong JWT_SECRET and HISTORY_AUTH_SECRET (not dev placeholders).');
    process.exit(1);
  }
  if (!frontendUrl.startsWith('https://')) {
    if (IS_RENDER) {
      console.warn(
        'FRONTEND_URL is not HTTPS on Render — same-origin mode (remove FRONTEND_URL from Render env if set to localhost).'
      );
    } else {
      console.error('Production requires HTTPS FRONTEND_URL (or RENDER_EXTERNAL_URL).');
      process.exit(1);
    }
  }
}

export const config = {
  ...data,
  NODE_ENV: nodeEnv,
  IS_RENDER,
  FRONTEND_URL: frontendUrl,
  HOST: resolveHost(data.HOST),
  PORT: resolvePort(),
};

export function hashUserId(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

export const VERDICTS = [
  'True',
  'Mostly true',
  'Unclear',
  'Mostly false',
  'False',
  'Not enough evidence',
] as const;

export type Verdict = (typeof VERDICTS)[number];

export interface FactCheckResult {
  claim: string;
  verdict: Verdict;
  confidence: number;
  explanation: string;
  supporting_evidence: string[];
  contradicting_evidence: string[];
  missing_information: string[];
  source_type: 'microphone' | 'system_audio';
  should_update_later: boolean;
}
