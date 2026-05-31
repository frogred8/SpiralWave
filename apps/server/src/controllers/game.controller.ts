import { timingSafeEqual } from 'node:crypto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { GameService } from '../services/game.service';
import type { StartRequest, EndRequest, LeaderboardResetRequest } from '@shared/ApiTypes';

function isValidSeqIdList(seqIds: unknown): seqIds is number[] {
  return Array.isArray(seqIds)
    && seqIds.length > 0
    && seqIds.every((seqId) => Number.isInteger(seqId) && seqId > 0);
}

function isValidResetSecret(secretKey: unknown) {
  const configuredSecretKey = process.env.OCI_SERVER_SECRET_KEY;
  if (!configuredSecretKey || typeof secretKey !== 'string') {
    return false;
  }

  const provided = Buffer.from(secretKey);
  const configured = Buffer.from(configuredSecretKey);
  return provided.length === configured.length && timingSafeEqual(provided, configured);
}

export const GameController = {
  async handleStart(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as StartRequest;
    if (![60, 180, 300].includes(body.play_time_seconds)) {
      return reply.code(400).send({ status: 'error', message: 'Invalid play_time_seconds' });
    }

    request.log.info({ select_skill_id: body.select_skill_id, play_time_seconds: body.play_time_seconds, ip: body.ip }, 'Game session start requested');
    return await GameService.startGame(body.select_skill_id, body.play_time_seconds, body.ip);
  },

  async handleEnd(request: FastifyRequest) {
    const body = request.body as EndRequest;
    request.log.info({ game_id: body.game_id, name: body.name, score: body.score, ip: body.ip }, 'Game session end requested');
    return await GameService.endGame(body.game_id, body.select_skill_id, body.name, body.score, body.msg, body.emoji, body.ip, new Date());
  },

  async handleGetLeaderboard(request: FastifyRequest) {
    request.log.info('Leaderboard data requested');
    return await GameService.getLeaderboard();
  },

  async handleResetLeaderboard(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as LeaderboardResetRequest | undefined;
    const all = body?.all === true;
    const hasSeqIds = body?.seq_ids !== undefined;

    if (!isValidResetSecret(body?.secret_key)) {
      return reply.code(401).send({ status: 'error', message: 'Invalid secret_key' });
    }

    if (all && hasSeqIds) {
      return reply.code(400).send({ status: 'error', message: 'Use either all=true or seq_ids, not both' });
    }

    if (!all && !isValidSeqIdList(body?.seq_ids)) {
      return reply.code(400).send({ status: 'error', message: 'Provide all=true or a non-empty positive integer seq_ids list' });
    }

    request.log.info({ all, seq_ids: body?.seq_ids }, 'Leaderboard reset requested');
    return await GameService.resetLeaderboard(body?.seq_ids, all);
  }
};
