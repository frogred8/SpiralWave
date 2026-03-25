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
    select_skill_id: number;
    name: string;
    score: number;
    msg: string;
}

// GET /leaderboard
export interface RankEntry {
    seq_id: number;
    score: number;
    name: string;
    msg: string;
}

export interface LeaderboardResponse {
    ranks: RankEntry[];
}
