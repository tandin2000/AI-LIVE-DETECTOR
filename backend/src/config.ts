import 'dotenv/config';
import { createHash } from 'crypto';
import { z } from 'zod';

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
  FRONTEND_URL: z.string().default('http://localhost:5173'),
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

if (data.NODE_ENV === 'production') {
  const weakSecrets = [DEV_JWT_PLACEHOLDER, DEV_HISTORY_PLACEHOLDER, 'change-this'];
  if (weakSecrets.some((s) => data.JWT_SECRET.includes(s) || data.HISTORY_AUTH_SECRET.includes(s))) {
    console.error('Production requires strong JWT_SECRET and HISTORY_AUTH_SECRET (not dev placeholders).');
    process.exit(1);
  }
  if (!data.FRONTEND_URL.startsWith('https://')) {
    console.error('Production FRONTEND_URL must use HTTPS.');
    process.exit(1);
  }
}

export const config = {
  ...data,
  HOST: data.HOST ?? (data.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'),
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
