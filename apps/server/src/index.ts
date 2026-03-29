import Fastify from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database

const clientDistDir = path.resolve(process.cwd(), 'apps/client/dist');

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
  trustProxy: true, // Enable trust proxy for correct client IP logging
});

// Handle favicon requests to prevent unnecessary errors in logs
fastify.get('/favicon.ico', (request, reply) => {
  reply.code(204).send();
});

// Register CORS
await fastify.register(cors, {
  origin: '*' // Allow all origins for development
});

await fastify.register(fastifyStatic, {
  root: clientDistDir,
  prefix: '/',
  wildcard: false,
});

// Basic health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
fastify.post('/start', GameController.handleStart);
fastify.post('/end', GameController.handleEnd);
fastify.get('/leaderboard', GameController.handleGetLeaderboard);

fastify.setNotFoundHandler(async (request, reply) => {
  if (request.method !== 'GET') {
    reply.code(404).send({ message: 'Not Found' });
    return;
  }

  return reply.sendFile('index.html');
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
