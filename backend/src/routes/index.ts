import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import {
  createHistoryAuthToken,
  createSessionToken,
  hashUserId,
  verifyHistoryAuthToken,
} from '../auth.js';
import { deleteHistory, getHistory } from '../history/store.js';
import { storeApiKey } from '../openai/apiKeyStore.js';
import { sessionRequestSchema, historyAuthRequestSchema, historyEnableSchema } from '../validation.js';
import { config } from '../config.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  app.post('/api/session', async (request, reply) => {
    const parsed = sessionRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request', details: parsed.error.flatten() });
    }

    const clientId = parsed.data.clientId ?? uuidv4();
    const userId = hashUserId(clientId);
    const language = parsed.data.language ?? 'auto';
    const sessionId = uuidv4();
    storeApiKey(sessionId, parsed.data.apiKey, config.SESSION_TOKEN_TTL_SECONDS);
    const token = createSessionToken(userId, parsed.data.sourceType, language, sessionId);

    return {
      token,
      expiresIn: app.config.SESSION_TOKEN_TTL_SECONDS,
      sourceType: parsed.data.sourceType,
      language,
      wsUrl: '/ws',
    };
  });

  app.post('/api/history/auth', async (request, reply) => {
    const parsed = historyAuthRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    const clientId = parsed.data.clientId ?? uuidv4();
    const userId = hashUserId(clientId);
    const token = createHistoryAuthToken(userId);

    return { token, userId };
  });

  app.get('/api/history', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const payload = verifyHistoryAuthToken(authHeader.slice(7));
      const history = getHistory(payload.sub);
      return { history };
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });

  app.delete('/api/history', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    try {
      const payload = verifyHistoryAuthToken(authHeader.slice(7));
      deleteHistory(payload.sub);
      return { success: true };
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });

  app.post('/api/history/enable', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Authentication required' });
    }

    const parsed = historyEnableSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request' });
    }

    try {
      verifyHistoryAuthToken(authHeader.slice(7));
      return { enabled: parsed.data.enabled };
    } catch {
      return reply.status(401).send({ error: 'Invalid or expired token' });
    }
  });
}

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      SESSION_TOKEN_TTL_SECONDS: number;
    };
  }
}
