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
        { seq_id: 2, score: 89, filtered_email: 'te***@gmail.com', vote: 5 },
        { seq_id: 4, score: 87, filtered_email: '32***@apple.com', vote: 0 },
        { seq_id: 3, score: 85, filtered_email: 'dd***@naver.com', vote: 0 },
        { seq_id: 8, score: 67, filtered_email: 'as***@sec.com', vote: -1 },
        { seq_id: 12, score: 60, filtered_email: 'dd***@eke.com', vote: 2 },
        { seq_id: 22, score: 53, filtered_email: 'vc***@sk.com', vote: 6 },
        { seq_id: 233, score: 23, filtered_email: 'nf***@gmail.com', vote: 7 },
        { seq_id: 62, score: 12, filtered_email: 'jh***@nate.com', vote: 3 },
        { seq_id: 100, score: 11, filtered_email: 'fg***@microsoft.com', vote: 0 }
      ] 
    };
  }
};
