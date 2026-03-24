/**
 * API Request/Response Interfaces
 */

// POST /start
export interface StartRequest {
    select_skill_id: number;
}

// POST /end
export interface EndRequest {
    game_id: string;
    name: string;
    score: number;
    msg: string;
}

// GET /board
export interface RankEntry {
    seq_id: number;
    score: number;
    filtered_email: string;
}

export interface BoardResponse {
    ranks: RankEntry[];
}
