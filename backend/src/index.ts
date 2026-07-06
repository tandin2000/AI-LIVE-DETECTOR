import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import websocket from '@fastify/websocket';
import { config } from './config.js';
import { registerRoutes } from './routes/index.js';
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
    origin: config.NODE_ENV === 'production' ? config.FRONTEND_URL : true,
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

  const port = config.PORT;
  await app.listen({ port, host: config.HOST });
  console.log(`Server running on http://${config.HOST}:${port}`);
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
