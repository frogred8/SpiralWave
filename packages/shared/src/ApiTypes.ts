/**
 * API Request/Response Interfaces
 */

// POST /start
export interface StartRequest {
    select_skill_id: number;
    ip: string;
}

// POST /end
export interface EndRequest {
    game_id: string;
    select_skill_id: number;
    name: string;
    score: number;
    msg: string;
    emoji: string;
    ip: string;
}

// GET /leaderboard
export interface RankEntry {
    seq_id: number;
    score: number;
    name: string;
    msg: string;
    emoji: string;
}

export interface LeaderboardResponse {
    ranks: RankEntry[];
}

// POST /leaderboard/reset
export interface LeaderboardResetRequest {
    all?: boolean;
    seq_ids?: number[];
}

export interface LeaderboardResetResponse {
    status: 'ok';
    deleted_count: number;
}
