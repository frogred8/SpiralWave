import { FastifyRequest } from 'fastify';
import { GameService } from '../services/game.service';
import { StartRequest, EndRequest } from '@repo/shared';

export const GameController = {
  async handleStart(request: FastifyRequest) {
    const body = request.body as StartRequest;
    request.log.info({ select_skill_id: body.select_skill_id, ip: request.ip }, 'Game session start requested');
    return await GameService.startGame(body, request.ip);
  },

  async handleEnd(request: FastifyRequest) {
    const body = request.body as EndRequest;
    request.log.info({ game_id: body.game_id, name: body.name, score: body.score }, 'Game session end requested');
    return await GameService.endGame(body);
  },

  async handleGetBoard(request: FastifyRequest) {
    request.log.info('Board data requested');
    return await GameService.getBoard();
  }
};
