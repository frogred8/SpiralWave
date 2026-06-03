/**
 * API Request/Response Interfaces
 */

// POST /start
export interface StartRequest {
    select_skill_id: number;
    play_time_seconds: number;
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
    play_time_seconds: number;
}

export interface LeaderboardResponse {
    ranks: RankEntry[];
    play_time_seconds: number;
}

// POST /leaderboard/reset
export interface LeaderboardResetRequest {
    secret_key: string;
    all?: boolean;
    seq_ids?: number[];
}

export interface LeaderboardResetResponse {
    status: 'ok';
    deleted_count: number;
}

// GET /deployments
export type ReleaseNoteByLanguage = Partial<Record<'en' | 'ko' | 'zh' | 'ja', string>>;

export interface DeploymentEntry {
    id: string;
    type?: 'stable' | 'preview';
    title: string;
    url: string;
    branch?: string;
    image?: string;
    container?: string;
    port?: number;
    status: 'active' | 'deprecated' | 'failed' | 'hidden';
    released_at: string;
    release_note?: ReleaseNoteByLanguage;
}

export interface DeploymentsResponse {
    deployments: DeploymentEntry[];
}
