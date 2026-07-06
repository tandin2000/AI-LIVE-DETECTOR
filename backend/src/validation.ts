import { z } from 'zod';
import { VERDICTS } from './config.js';

export const audioSourceSchema = z.enum(['microphone', 'system_audio']);

export const languageSchema = z
  .string()
  .regex(/^[a-z]{2}$|^auto$/, 'Invalid language code')
  .default('auto');

export const apiKeySchema = z
  .string()
  .min(20, 'API key is too short')
  .max(256, 'API key is too long')
  .regex(/^sk-/, 'API key must start with sk-');

export const sessionRequestSchema = z.object({
  sourceType: audioSourceSchema,
  language: languageSchema.optional(),
  apiKey: apiKeySchema,
  clientId: z.string().uuid().optional(),
});

export const historyAuthRequestSchema = z.object({
  clientId: z.string().uuid().optional(),
});

export const historyEnableSchema = z.object({
  enabled: z.boolean(),
});

export const historySaveSchema = z.object({
  claims: z.array(
    z.object({
      claim: z.string().min(1).max(2000),
      verdict: z.enum(VERDICTS),
      confidence: z.number().min(0).max(100),
      explanation: z.string().max(5000),
      supporting_evidence: z.array(z.string().max(1000)).max(20),
      contradicting_evidence: z.array(z.string().max(1000)).max(20),
      missing_information: z.array(z.string().max(1000)).max(20),
      source_type: audioSourceSchema,
      timestamp: z.string().datetime(),
    })
  ).max(500),
});

export const wsAuthMessageSchema = z.object({
  type: z.literal('auth'),
  token: z.string().min(1).max(4096),
  historyToken: z.string().max(4096).optional(),
});

export const wsClientMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('audio'),
    data: z.string().max(500_000),
  }),
  z.object({
    type: z.literal('pause'),
  }),
  z.object({
    type: z.literal('resume'),
  }),
  z.object({
    type: z.literal('stop'),
  }),
  z.object({
    type: z.literal('commit'),
  }),
]);

export function sanitizeText(input: string, maxLength = 5000): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .slice(0, maxLength)
    .trim();
}
