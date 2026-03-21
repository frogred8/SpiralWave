import { StartRequest, EndRequest, VoteRequest, BoardResponse } from '@repo/shared';

export const GameService = {
  async startGame(data: StartRequest) {
    // Business logic for starting game
    const gameId = Math.floor(Math.random() * 1000000);
    return { status: 'ok', message: 'Game session started', game_id: gameId };
  },

  async endGame(data: EndRequest) {
    // Business logic for ending game
    return { status: 'ok', message: 'Game session ended' };
  },

  async vote(data: VoteRequest) {
    // Business logic for voting
    return { status: 'ok', message: 'Vote recorded' };
  },

  async getBoard(): Promise<BoardResponse> {
    // Business logic for board
    return { 
      ranks: [
        { seq_id: 1, score: 100, filtered_email: 'pl***@gmail.com', vote: 10 },
        { seq_id: 2, score: 80, filtered_email: 'te***@naver.com', vote: 5 }
      ] 
    };
  }
};
