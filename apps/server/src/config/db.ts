import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: {
    user: process.env.POSTGRES_USER || 'user',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'spiralwave',
    password: process.env.POSTGRES_PASSWORD || 'password',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
  },
});

// Initialize database tables
const initDb = async () => {
  try {
    const hasGameTable = await db.schema.hasTable('game');
    if (!hasGameTable) {
      await db.schema.createTable('game', (table) => {
        table.string('game_id', 20).primary();
        table.string('ip', 45).notNullable();
        table.integer('select_skill_id');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    }

    const hasWishTable = await db.schema.hasTable('wish');
    if (!hasWishTable) {
      await db.schema.createTable('wish', (table) => {
        table.increments('seq_id').primary();
        table.string('name', 100).notNullable();
        table.string('game_id', 20).notNullable();
        table.string('ip', 45).notNullable();
        table.integer('score').notNullable();
        table.text('msg');
        table.timestamp('created_at').notNullable();
        table.timestamp('end_at').notNullable();
      });
    }
    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed', err);
  }
};

// Run initialization
initDb();

export default db;
