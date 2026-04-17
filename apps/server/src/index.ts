import Fastify from 'fastify';
import cors from '@fastify/cors';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database

const fastifyLogger = process.env.NODE_ENV === 'production'
  ? true
  : {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    };

const fastify = Fastify({
  logger: fastifyLogger,
  trustProxy: true, // Enable trust proxy for correct client IP logging
});

// Handle favicon requests to prevent unnecessary errors in logs
fastify.get('/favicon.ico', (request, reply) => {
  reply.code(204).send();
});

// Basic health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Routes
fastify.post('/start', GameController.handleStart);
fastify.post('/end', GameController.handleEnd);
fastify.get('/leaderboard', GameController.handleGetLeaderboard);

/**
 * Run the server!
 */
const start = async () => {
  try {
    await fastify.register(cors, {
      origin: '*' // Allow all origins for development
    });

    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || '127.0.0.1';
    
    await fastify.listen({ port, host });
    console.log(`Server listening at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
