import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'spiralwave',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
});

// Initialize database tables
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS game (
        game_id VARCHAR(20) PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        select_skill_id INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wish (
        seq_id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        game_id VARCHAR(20) NOT NULL,
        ip VARCHAR(45) NOT NULL,
        score INT NOT NULL,
        msg TEXT,
        created_at TIMESTAMP NOT NULL,
        end_at TIMESTAMP NOT NULL
      )
    `);
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed', err);
  }
};

// Run initialization
initDb();

export default pool;
