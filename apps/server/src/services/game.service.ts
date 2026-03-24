import { LeaderBoardResponse } from '@repo/shared';
import pool from '../config/db';

/**
 * @param {number} prefix_n - 타임스탬프 기반 접두사 길이
 * @param {number} postfix_n - 랜덤 기반 접미사 길이 (최대 13자리까지 정밀도 유지)
 * @returns {string} 생성된 UUID
 */
function generateUUID(prefix_n = 8, postfix_n = 4) {
  // 1. 타임스탬프 기반 접두사
  const prefix = Date.now().toString(16).slice(-prefix_n);

  // 2. Math.random()의 부동소수점을 16진수로 변환하여 루프 없이 추출
  // Math.random().toString(16)은 "0.abc123..." 형태이므로 2번 인덱스부터 자름
  const postfix = Math.random().toString(16).slice(2, 2 + postfix_n).padEnd(postfix_n, '0');

  return prefix + postfix;
}

/**
 * 게임 세션 유효성 검증
 */
async function validateGameSession(gameId: string, selectSkillId: number, ip: string, endAt: Date): Promise<any | null> {
  const res = await pool.query('SELECT created_at, ip, select_skill_id FROM game WHERE game_id = $1', [gameId]);
  
  // 1. db에서 gameId로 검색하여 레코드가 나오지 않을 때
  if (res.rows.length === 0) { 
    console.log(`Validation failed (1): Game session not found for ID: ${gameId}`); 
    return null; 
  }

  const gameRecord = res.rows[0];

  // 2. 전달받은 selectSkillId와 레코드의 select_skill_id를 비교하여 다를 때
  if (gameRecord.select_skill_id !== selectSkillId) { 
    console.log(`Validation failed (2): Skill ID mismatch. DB: ${gameRecord.select_skill_id}, Received: ${selectSkillId}`); 
    return null; 
  }

  // 3. gameId가 있을 때 해당 레코드의 created_at+5분이 endAt보다 클 때
  const createdAt = new Date(gameRecord.created_at);
  const limitTime = new Date(createdAt.getTime());// + 5 * 60 * 1000);
  if (limitTime >= endAt) { 
    console.log(`Validation failed (3): Time validation error. Limit: ${limitTime.toISOString()}, EndAt: ${endAt.toISOString()}`); 
    return null; 
  }

  // 4. 전달받은 ip와 레코드 ip를 비교하여 다를 때
  if (gameRecord.ip !== ip) { 
    console.log(`Validation failed (4): IP mismatch. DB: ${gameRecord.ip}, Received: ${ip}`); 
    return null; 
  }

  return gameRecord;
}

export const GameService = {
  async startGame(selectSkillId: number, ip: string) {
    // Generate UUID using custom function
    const gameId = generateUUID();

    try {
      await pool.query(
        'INSERT INTO game (game_id, ip, select_skill_id) VALUES ($1, $2, $3)',
        [gameId, ip, selectSkillId]
      );
      return { status: 'ok', message: 'Game session started', game_id: gameId };
    } catch (err) {
      console.error('Failed to record game session', err);
      throw new Error('Database error');
    }
  },

  async endGame(gameId: string, selectSkillId: number, name: string, score: number, msg: string, ip: string, endAt: Date) {
    try {
      const gameRecord = await validateGameSession(gameId, selectSkillId, ip, endAt);
      console.log(gameRecord);
      if (gameRecord) {
        // 모든 검증이 통과하면 game 테이블에서 해당 레코드를 삭제
        await pool.query('DELETE FROM game WHERE game_id = $1', [gameId]);
        
        // wish 테이블에 저장
        await pool.query(
          'INSERT INTO wish (name, game_id, ip, score, msg, created_at, end_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [name, gameId, ip, score, msg, gameRecord.created_at, endAt]
        );
      }

      return { status: 'ok', message: 'Game session ended' };
    } catch (err) {
      console.error('Failed to process end game', err);
      throw new Error('Database error');
    }
  },

  async getLeaderBoard(): Promise<LeaderBoardResponse> {
    // Business logic for leaderboard
    return { 
      ranks: [
        { seq_id: 1, score: 100, name: 'Alice', msg: 'Great game!' },
        { seq_id: 2, score: 89, name: 'Bob', msg: 'I will be back' },
        { seq_id: 4, score: 87, name: 'Charlie', msg: 'Nice center' },
        { seq_id: 3, score: 85, name: 'Dave', msg: 'Spiral!!' },
        { seq_id: 8, score: 67, name: 'Eve', msg: 'Hard one' },
        { seq_id: 12, score: 60, name: 'Frank', msg: 'Love it' },
        { seq_id: 22, score: 53, name: 'Grace', msg: 'Good luck' },
        { seq_id: 233, score: 23, name: 'Heidi', msg: 'Wait' },
        { seq_id: 62, score: 12, name: 'Ivan', msg: 'Hello' },
        { seq_id: 100, score: 11, name: 'Judy', msg: 'Bye' }
      ] 
    };
  }
};
