import './config/env';
import './logger';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database
import { DeploymentsService } from './services/deployments.service';

const fastify = Fastify({
  logger: false,
  trustProxy: true, // Enable trust proxy for correct client IP logging
});

const getClientDistDir = () => {
  const candidates = [
    process.env.CLIENT_DIST_DIR,
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'apps/client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../../../client/dist'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html')));
};

const routeMetrics = {
  start: 0,
  end: 0,
};

// Handle favicon requests to prevent unnecessary errors in logs
fastify.get('/favicon.ico', (request, reply) => {
  reply.code(204).send();
});

// Basic health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
fastify.post('/start', async (request) => {
  routeMetrics.start++;
  return GameController.handleStart(request);
});
fastify.post('/end', async (request) => {
  routeMetrics.end++;
  return GameController.handleEnd(request);
});
fastify.get('/leaderboard', GameController.handleGetLeaderboard);
fastify.post('/leaderboard/reset', GameController.handleResetLeaderboard);

fastify.get('/metrics', async () => {
  return {
    start: routeMetrics.start,
    end: routeMetrics.end,
  };
});

fastify.get('/deployments', async () => {
  return await DeploymentsService.getDeployments();
});
fastify.delete('/deployments/cache', async () => {
  DeploymentsService.clearDeploymentsCache();
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.register(cors, {
      origin: '*' // Allow all origins for development
    });

    const clientDistDir = getClientDistDir();
    if (clientDistDir) {
      await fastify.register(fastifyStatic, {
        root: clientDistDir,
        prefix: '/',
      });

      fastify.setNotFoundHandler((request, reply) => {
        const acceptsHtml = request.headers.accept?.includes('text/html');
        if ((request.method === 'GET' || request.method === 'HEAD') && acceptsHtml) {
          return reply.type('text/html').sendFile('index.html');
        }

        return reply.code(404).send({ error: 'Not Found' });
      });
    } else if (process.env.NODE_ENV === 'production') {
      throw new Error('Client build output not found. Run npm run build before starting release mode.');
    }

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '127.0.0.1';
    
    await fastify.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
