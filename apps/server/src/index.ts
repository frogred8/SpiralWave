import Fastify from 'fastify';
import cors from '@fastify/cors';
import { GameController } from './controllers/game.controller';
import './config/db'; // Initialize database

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
});

// Register CORS
await fastify.register(cors, {
  origin: '*' // Allow all origins for development
});

// Basic health check endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return { message: 'SpiralWave API Server' };
});

// Routes
fastify.post('/start', GameController.handleStart);
fastify.post('/end', GameController.handleEnd);
fastify.get('/leaderboard', GameController.handleGetLeaderBoard);

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
