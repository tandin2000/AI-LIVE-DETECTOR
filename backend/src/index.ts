import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { registerRoutes } from './routes/index.js';
import { registerStaticAssets } from './static.js';
import { handleWebSocketConnection } from './websocket/handler.js';

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
    redact: ['req.headers.authorization', 'req.body.apiKey', 'OPENAI_API_KEY'],
  },
  trustProxy: config.NODE_ENV === 'production',
});

app.decorate('config', {
  SESSION_TOKEN_TTL_SECONDS: config.SESSION_TOKEN_TTL_SECONDS,
});

async function start(): Promise<void> {
  await app.register(cors, {
    // Single-service on Render is same-origin; allow request origin when deployed there.
    origin: config.IS_RENDER || config.NODE_ENV !== 'production' ? true : config.FRONTEND_URL,
    credentials: true,
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  await app.register(websocket);

  await registerRoutes(app);

  app.get('/ws', { websocket: true }, (socket) => {
    handleWebSocketConnection(socket);
  });

  if (config.NODE_ENV === 'production' || config.IS_RENDER) {
    await registerStaticAssets(app);
  }

  const port = config.PORT;
  const host = config.HOST;
  await app.listen({ port, host });
  console.log(`Server listening on ${host}:${port}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
