/**
 * API Request/Response Interfaces
 */

// POST /start
export interface StartRequest {
    select_skill_id: number;
}

// POST /end
export interface EndRequest {
    game_id: number;
    hash: string;
    email: string;
    score: number;
    msg: string;
}

// PUT /vote
export interface VoteRequest {
    seq_id: number;
    game_id: number;
    hash: string;
}

// GET /board
export interface RankEntry {
    seq_id: number;
    score: number;
    filtered_email: string;
    vote: number;
}

export interface BoardResponse {
    ranks: RankEntry[];
}
