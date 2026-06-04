import { INITIAL_STATS } from '@repo/shared';
import type { GameMode, LeaderboardResponse } from '@shared/ApiTypes';
import db from '../config/db';

/**
 * Leaderboard Cache Interface
 */
interface LeaderboardCache {
  data: LeaderboardResponse | null;
  lastUpdated: number;
  minScore: number;
  isInvalid: boolean;
}

const leaderboardCaches: Record<GameMode, LeaderboardCache> = {
  standard: {
    data: null,
    lastUpdated: 0,
    minScore: 0,
    isInvalid: true,
  },
  endless: {
    data: null,
    lastUpdated: 0,
    minScore: 0,
    isInvalid: true,
  },
};

const CACHE_TTL = 60 * 1000; // 1 minute
const ALLOWED_PLAY_TIME_SECONDS = new Set([60, 180, 300]);

function normalizeGameMode(gameMode?: string): GameMode {
  return gameMode === 'endless' ? 'endless' : 'standard';
}

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
  const gameRecord = await db('game')
    .where('game_id', gameId)
    .first();
  
  // 1. db에서 gameId로 검색하여 레코드가 나오지 않을 때
  if (!gameRecord) { 
    console.log(`Validation failed (1): Game session not found for ID: ${gameId}`); 
    return null; 
  }

  // 2. 전달받은 selectSkillId와 레코드의 select_skill_id를 비교하여 다를 때
  if (gameRecord.select_skill_id !== selectSkillId) { 
    console.log(`Validation failed (2): Skill ID mismatch. DB: ${gameRecord.select_skill_id}, Received: ${selectSkillId}`); 
    return null; 
  }

  // 3. 제한 시간보다 이르게 종료 요청이 들어온 경우
  const createdAt = new Date(gameRecord.created_at);
  const gameMode = normalizeGameMode(gameRecord.game_mode);
  if (gameMode !== 'endless') {
    const playTimeSeconds = Number(gameRecord.play_time_seconds) || INITIAL_STATS.TIME_LIMIT;
    const earliestValidEndAt = new Date(createdAt.getTime() + playTimeSeconds * 1000);
    if (earliestValidEndAt > endAt) { 
      console.log(`Validation failed (3): Time validation error. Play time: ${playTimeSeconds}s, Earliest valid end: ${earliestValidEndAt.toISOString()}, EndAt: ${endAt.toISOString()}`); 
      return null; 
    }
  }

  // 4. 전달받은 ip와 레코드 ip를 비교하여 다를 때
  if (gameRecord.ip !== ip) { 
    console.log(`Validation failed (4): IP mismatch. DB: ${gameRecord.ip}, Received: ${ip}`); 
    return null; 
  }

  return gameRecord;
}

/**
 * 리더보드 데이터 생성 (wish 테이블에서 score 기준 top 10 추출)
 */
async function generateLeaderboard(gameMode: GameMode): Promise<LeaderboardResponse> {
  try {
    const rows = await db('wish')
      .select('seq_id', 'score', 'name', 'msg', 'emoji')
      .where('game_mode', gameMode)
      .orderBy('score', 'desc')
      .limit(10);
    
    const ranks = rows.map(row => ({
      seq_id: row.seq_id,
      score: parseInt(row.score),
      name: row.name,
      msg: row.msg,
      emoji: row.emoji || ''
    }));

    const result = { ranks };
    return result;
  } catch (err) {
    console.error('Failed to generate leaderboard:', err);
    return { ranks: [] };
  }
}

function isExpiredCache(gameMode: GameMode) {
  const cache = leaderboardCaches[gameMode];
  const now = Date.now();
  const isExpired = now - cache.lastUpdated > CACHE_TTL;
  return !cache.data || cache.isInvalid || isExpired;
}

async function updateCache(gameMode: GameMode) {
  const cache = leaderboardCaches[gameMode];
  cache.data = await generateLeaderboard(gameMode);
  cache.lastUpdated = Date.now();
  cache.minScore = cache.data.ranks.length > 0 ? cache.data.ranks[cache.data.ranks.length - 1].score : 0;
  cache.isInvalid = false;
}

function invalidateLeaderboardCache(gameMode?: GameMode) {
  const caches = gameMode ? [leaderboardCaches[gameMode]] : Object.values(leaderboardCaches);
  caches.forEach((cache) => {
    cache.isInvalid = true;
    cache.minScore = 0;
  });
}

export const GameService = {
  async startGame(selectSkillId: number, playTimeSeconds: number, ip: string, gameMode: GameMode = 'standard') {
    if (gameMode === 'standard' && !ALLOWED_PLAY_TIME_SECONDS.has(playTimeSeconds)) {
      throw new Error('Invalid play time');
    }
    if (gameMode === 'endless' && playTimeSeconds !== 0) {
      throw new Error('Invalid endless play time');
    }

    // Generate UUID using custom function
    const gameId = generateUUID();

    try {
      await db('game').insert({
        game_id: gameId,
        ip: ip,
        select_skill_id: selectSkillId,
        play_time_seconds: playTimeSeconds,
        game_mode: gameMode
      });
      return { status: 'ok', message: 'Game session started', game_id: gameId };
    } catch (err) {
      console.error('Failed to record game session', err);
      throw new Error('Database error');
    }
  },

  async endGame(gameId: string, selectSkillId: number, name: string, score: number, msg: string, emoji: string, ip: string, endAt: Date, requestedGameMode?: GameMode) {
    try {
      const gameRecord = await validateGameSession(gameId, selectSkillId, ip, endAt);
      if (gameRecord) {
        const gameMode = normalizeGameMode(gameRecord.game_mode);
        if (requestedGameMode && requestedGameMode !== gameMode) {
          return { status: 'ok', message: 'Game session ended' };
        }

        // 모든 검증이 통과하면 game 테이블에서 해당 레코드를 삭제
        await db('game')
          .where('game_id', gameId)
          .del();
        
        // wish 테이블에 저장
        await db('wish').insert({
          name: name,
          game_id: gameId,
          ip: ip,
          emoji: emoji,
          score: score,
          play_time_seconds: gameMode === 'endless' ? 0 : Number(gameRecord.play_time_seconds) || INITIAL_STATS.TIME_LIMIT,
          game_mode: gameMode,
          msg: msg,
          created_at: gameRecord.created_at,
          end_at: endAt
        });

        // 캐시 만료 정책: 들어오는 스코어가 캐시에 있는 10위값보다 클 때 캐시 만료 플래그를 키고
        if (score > leaderboardCaches[gameMode].minScore) {
          leaderboardCaches[gameMode].isInvalid = true;
        }
      }

      return { status: 'ok', message: 'Game session ended' };
    } catch (err) {
      console.error('Failed to process end game', err);
      throw new Error('Database error');
    }
  },

  async getLeaderboard(gameMode: GameMode = 'standard'): Promise<LeaderboardResponse> {
    if (isExpiredCache(gameMode)) {
      await updateCache(gameMode);
    }
    return leaderboardCaches[gameMode].data || { ranks: [] };
  },

  async resetLeaderboard(seqIds?: number[], all = false) {
    try {
      const query = db('wish');
      const deletedCount = all
        ? await query.del()
        : await query.whereIn('seq_id', seqIds || []).del();

      invalidateLeaderboardCache();

      return { status: 'ok' as const, deleted_count: deletedCount };
    } catch (err) {
      console.error('Failed to reset leaderboard', err);
      throw new Error('Database error');
    }
  }
};
