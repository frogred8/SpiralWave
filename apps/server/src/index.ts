import Fastify from 'fastify';
import cors from '@fastify/cors';
import pg from 'pg';

const { Pool } = pg;

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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/spiralwave'
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

// Wish endpoint
interface WishBody {
  email: string;
  msg: string;
}

fastify.post('/wish', async (request, reply) => {
  const { email, msg } = request.body as WishBody;
  
  if (!email || !msg) {
    reply.status(400).send({ error: 'Email and message are required' });
    return;
  }

  try {
    const query = 'INSERT INTO wish (email, msg) VALUES ($1, $2) RETURNING *';
    const values = [email, msg];
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: 'Database error' });
  }
});

/**
 * Run the server!
 */
const start = async () => {
  try {
    // Ensure table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wish (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        msg TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
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
