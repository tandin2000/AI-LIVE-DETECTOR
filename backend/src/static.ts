import path from 'path';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance } from 'fastify';

export function resolveFrontendDist(): string {
  if (process.env.STATIC_ROOT) {
    return path.resolve(process.env.STATIC_ROOT);
  }

  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '../../frontend/dist');
}

export async function registerStaticAssets(app: FastifyInstance): Promise<void> {
  const frontendDist = resolveFrontendDist();

  if (!existsSync(frontendDist)) {
    app.log.warn({ frontendDist }, 'Frontend build not found — API only mode');
    return;
  }

  await app.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
    decorateReply: true,
  });

  app.setNotFoundHandler((request, reply) => {
    const url = request.url.split('?')[0] ?? request.url;

    if (url.startsWith('/api') || url === '/ws') {
      return reply.status(404).send({ error: 'Not found' });
    }

    if (path.extname(url)) {
      return reply.status(404).send({ error: 'Not found' });
    }

    return reply.sendFile('index.html', frontendDist);
  });

  app.log.info({ frontendDist }, 'Serving frontend static assets');
}
