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
        table.integer('play_time_seconds').notNullable().defaultTo(300);
        table.string('game_mode', 20).notNullable().defaultTo('standard');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
    } else {
      if (!(await db.schema.hasColumn('game', 'play_time_seconds'))) {
        await db.schema.alterTable('game', (table) => {
          table.integer('play_time_seconds').notNullable().defaultTo(300);
        });
      }
      if (!(await db.schema.hasColumn('game', 'game_mode'))) {
        await db.schema.alterTable('game', (table) => {
          table.string('game_mode', 20).notNullable().defaultTo('standard');
        });
      }
    }

    const hasWishTable = await db.schema.hasTable('wish');
    if (!hasWishTable) {
      await db.schema.createTable('wish', (table) => {
        table.increments('seq_id').primary();
        table.string('name', 20).notNullable();
        table.string('game_id', 20).notNullable();
        table.string('ip', 45).notNullable();
        table.string('emoji', 10);
        table.integer('score').notNullable();
        table.integer('play_time_seconds').notNullable().defaultTo(300);
        table.string('game_mode', 20).notNullable().defaultTo('standard');
        table.text('msg');
        table.timestamp('created_at').notNullable();
        table.timestamp('end_at').notNullable();
        table.index(['score'], 'wish_score_idx');
        table.index(['game_mode', 'score'], 'wish_game_mode_score_idx');
      });
    } else {
      if (!(await db.schema.hasColumn('wish', 'play_time_seconds'))) {
        await db.schema.alterTable('wish', (table) => {
          table.integer('play_time_seconds').notNullable().defaultTo(300);
        });
      }
      if (!(await db.schema.hasColumn('wish', 'game_mode'))) {
        await db.schema.alterTable('wish', (table) => {
          table.string('game_mode', 20).notNullable().defaultTo('standard');
          table.index(['game_mode', 'score'], 'wish_game_mode_score_idx');
        });
      }
    }

    console.log('Database initialized');
  } catch (err) {
    console.error('Database initialization failed', err);
  }
};

// Run initialization
initDb();

export default db;
