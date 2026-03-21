import { FastifyReply, FastifyRequest } from 'fastify';
import { WishService } from '../services/wish.service';
import { Wish } from '../models/wish.model';

export const WishController = {
  async handlePostWish(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as Wish;
    try {
      const result = await WishService.addWish(body);
      return result;
    } catch (err: any) {
      request.log.error(err);
      if (err.message === 'Email and message are required') {
        reply.status(400).send({ error: err.message });
      } else {
        reply.status(500).send({ error: 'Database error' });
      }
    }
  }
};
