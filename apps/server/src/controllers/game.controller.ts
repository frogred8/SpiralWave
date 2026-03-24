import { FastifyRequest } from 'fastify';
import { GameService } from '../services/game.service';
import { StartRequest, EndRequest } from '@repo/shared';

export const GameController = {
  async handleStart(request: FastifyRequest) {
    const body = request.body as StartRequest;
    request.log.info({ select_skill_id: body.select_skill_id, ip: request.ip }, 'Game session start requested');
    return await GameService.startGame(body.select_skill_id, request.ip);
  },

  async handleEnd(request: FastifyRequest) {
    const body = request.body as EndRequest;
    request.log.info({ game_id: body.game_id, name: body.name, score: body.score, ip: request.ip }, 'Game session end requested');
    return await GameService.endGame(body.game_id, body.name, body.score, body.msg, request.ip, new Date());
  },

  async handleGetBoard(request: FastifyRequest) {
    request.log.info('Board data requested');
    return await GameService.getBoard();
  }
};
