import { pool } from '../config/db';

export interface Wish {
  id?: number;
  email: string;
  msg: string;
  created_at?: Date;
}

export const WishModel = {
  async initTable() {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wish (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        msg TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  },

  async create(wish: Wish) {
    const query = 'INSERT INTO wish (email, msg) VALUES ($1, $2) RETURNING *';
    const values = [wish.email, wish.msg];
    const result = await pool.query(query, values);
    return result.rows[0];
  }
};
