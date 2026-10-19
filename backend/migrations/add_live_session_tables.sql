-- Live session PoC tables (PostgreSQL).
-- NOT applied by this branch. Do not run against production until the PoC is accepted.
-- IDEMPOTENT.

CREATE TABLE IF NOT EXISTS live_sessions (
    id SERIAL PRIMARY KEY,
    host_user_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL DEFAULT 'Live WOD',
    workout_type VARCHAR(16) NOT NULL,
    duration_sec INTEGER NOT NULL,
    reps_per_round INTEGER,
    started_at_ms BIGINT,
    ended_at_ms BIGINT,
    status VARCHAR(16) NOT NULL DEFAULT 'lobby',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_live_sessions_host ON live_sessions(host_user_id);

CREATE TABLE IF NOT EXISTS live_participants (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division VARCHAR(16) NOT NULL,
    cumulative_rounds INTEGER NOT NULL DEFAULT 0,
    cumulative_reps INTEGER NOT NULL DEFAULT 0,
    finished_at_ms BIGINT,
    CONSTRAINT uq_live_participant_session_user UNIQUE (session_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_live_participants_session ON live_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_live_participants_user ON live_participants(user_id);

CREATE TABLE IF NOT EXISTS live_tap_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind VARCHAR(8) NOT NULL,
    cumulative_rounds INTEGER NOT NULL,
    cumulative_reps INTEGER NOT NULL DEFAULT 0,
    server_ts_ms BIGINT NOT NULL,
    client_ts_ms BIGINT
);
CREATE INDEX IF NOT EXISTS idx_live_tap_events_session ON live_tap_events(session_id);
