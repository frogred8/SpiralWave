/**
 * API Request/Response Interfaces
 */
export interface StartRequest {
    select_skill_id: number;
}
export interface EndRequest {
    game_id: number;
    hash: string;
    email: string;
    score: number;
    msg: string;
}
export interface VoteRequest {
    seq_id: number;
    game_id: number;
    hash: string;
}
export interface RankEntry {
    seq_id: number;
    score: number;
    filtered_email: string;
    vote: number;
}
export interface BoardResponse {
    ranks: RankEntry[];
}
