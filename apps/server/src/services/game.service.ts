import { StartRequest, EndRequest, BoardResponse } from '@repo/shared';
import pool from '../config/db';
import crypto from 'crypto';

export const GameService = {
  async startGame(data: StartRequest, ip: string) {
    // Generate 8-character UUID (hex of 4 bytes is 8 chars)
    const gameId = crypto.randomBytes(4).toString('hex');

    try {
      await pool.query(
        'INSERT INTO game (game_id, ip) VALUES ($1, $2)',
        [gameId, ip]
      );
      return { status: 'ok', message: 'Game session started', game_id: gameId };
    } catch (err) {
      console.error('Failed to record game session', err);
      throw new Error('Database error');
    }
  },

  async endGame(data: EndRequest) {
    // Business logic for ending game
    return { status: 'ok', message: 'Game session ended' };
  },

  async getBoard(): Promise<BoardResponse> {
    // Business logic for board
    return { 
      ranks: [
        { seq_id: 1, score: 100, filtered_email: 'pl***@gmail.com' },
        { seq_id: 2, score: 89, filtered_email: 'te***@gmail.com' },
        { seq_id: 4, score: 87, filtered_email: '32***@apple.com' },
        { seq_id: 3, score: 85, filtered_email: 'dd***@naver.com' },
        { seq_id: 8, score: 67, filtered_email: 'as***@sec.com' },
        { seq_id: 12, score: 60, filtered_email: 'dd***@eke.com' },
        { seq_id: 22, score: 53, filtered_email: 'vc***@sk.com' },
        { seq_id: 233, score: 23, filtered_email: 'nf***@gmail.com' },
        { seq_id: 62, score: 12, filtered_email: 'jh***@nate.com' },
        { seq_id: 100, score: 11, filtered_email: 'fg***@microsoft.com' }
      ] 
    };
  }
};
