import jwt from 'jsonwebtoken';
import { config, hashUserId } from './config.js';

export { hashUserId };

export interface SessionPayload {
  sub: string;
  sourceType: 'microphone' | 'system_audio';
  language: string;
  sessionId: string;
  type: 'session';
}

export interface HistoryAuthPayload {
  sub: string;
  type: 'history';
}

export function createSessionToken(
  userId: string,
  sourceType: 'microphone' | 'system_audio',
  language: string,
  sessionId: string
): string {
  const payload: SessionPayload = {
    sub: userId,
    sourceType,
    language,
    sessionId,
    type: 'session',
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.SESSION_TOKEN_TTL_SECONDS,
  });
}

export function verifySessionToken(token: string): SessionPayload {
  const payload = jwt.verify(token, config.JWT_SECRET) as SessionPayload;
  if (payload.type !== 'session' || !payload.sessionId) {
    throw new Error('Invalid token type');
  }
  return {
    ...payload,
    language: payload.language ?? 'auto',
    sessionId: payload.sessionId,
  };
}

export function createHistoryAuthToken(userId: string): string {
  const payload: HistoryAuthPayload = { sub: userId, type: 'history' };
  return jwt.sign(payload, config.HISTORY_AUTH_SECRET, { expiresIn: '7d' });
}

export function verifyHistoryAuthToken(token: string): HistoryAuthPayload {
  const payload = jwt.verify(token, config.HISTORY_AUTH_SECRET) as HistoryAuthPayload;
  if (payload.type !== 'history') {
    throw new Error('Invalid history token type');
  }
  return payload;
}
