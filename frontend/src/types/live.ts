export type LiveWorkoutType = 'amrap' | 'for_time';
export type LiveDivision = 'rx' | 'scaled';
export type LiveStatus = 'lobby' | 'live' | 'ended';

export interface RankedAthlete {
    rank: number;
    user_id: number;
    name: string;
    division: LiveDivision;
    rounds: number;
    reps: number;
    finished: boolean;
    elapsed_ms: number | null;
    total_reps: number | null;
}

export interface LiveSessionState {
    id: number;
    host_user_id: number;
    title: string;
    workout_type: LiveWorkoutType;
    duration_sec: number;
    reps_per_round: number | null;
    started_at_ms: number | null;
    ended_at_ms: number | null;
    status: LiveStatus;
    server_time_ms: number;
}

export interface LiveMe {
    user_id: number;
    is_host: boolean;
    is_participant: boolean;
    division: LiveDivision | null;
    cumulative_rounds: number;
    cumulative_reps: number;
    finished_at_ms: number | null;
}

export interface LiveLeaderboard {
    rx: RankedAthlete[];
    scaled: RankedAthlete[];
}

export interface LiveSessionView {
    session: LiveSessionState;
    me: LiveMe;
    leaderboard: LiveLeaderboard;
}

export interface LiveRoomEvent {
    session: LiveSessionState;
    leaderboard: LiveLeaderboard;
}

export interface LiveLeaderboardEvent {
    session_id: number;
    server_time_ms: number;
    leaderboard: LiveLeaderboard;
}

export interface CreateLiveSessionRequest {
    title?: string;
    workout_type: LiveWorkoutType;
    duration_sec: number;
    reps_per_round?: number | null;
    division?: LiveDivision | null;
}
