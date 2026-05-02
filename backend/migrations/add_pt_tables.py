"""WODYBODY PT 모델 신규 테이블(user_preferences, daily_assignments, push_tokens)을 생성한다.

PostgreSQL과 SQLite 양쪽에서 IDEMPOTENT하게 동작하도록 작성.
사용법:
    cd backend
    python migrations/add_pt_tables.py
"""

import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app, db  # noqa: E402
from sqlalchemy import text  # noqa: E402


PG_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        goals TEXT,
        equipment TEXT,
        available_minutes INTEGER DEFAULT 20,
        difficulty VARCHAR(20) DEFAULT 'intermediate',
        push_time VARCHAR(5) DEFAULT '09:00',
        timezone VARCHAR(64) DEFAULT 'Asia/Seoul',
        push_enabled BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT user_preferences_user_uniq UNIQUE (user_id)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);",
    """
    CREATE TABLE IF NOT EXISTS daily_assignments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assignment_date DATE NOT NULL,
        program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
        source VARCHAR(20) DEFAULT 'ai_grok',
        ai_rationale TEXT,
        intensity_hint VARCHAR(20),
        duration_estimate_minutes INTEGER,
        refresh_count INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        skipped_at TIMESTAMP,
        feedback_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT uq_daily_assignments_user_date UNIQUE (user_id, assignment_date)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_daily_assignments_user_date ON daily_assignments(user_id, assignment_date);",
    """
    CREATE TABLE IF NOT EXISTS push_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(10) NOT NULL,
        token VARCHAR(512) NOT NULL,
        app_version VARCHAR(32),
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        CONSTRAINT uq_push_tokens_user_token UNIQUE (user_id, token)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);",
]


SQLITE_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        goals TEXT,
        equipment TEXT,
        available_minutes INTEGER DEFAULT 20,
        difficulty VARCHAR(20) DEFAULT 'intermediate',
        push_time VARCHAR(5) DEFAULT '09:00',
        timezone VARCHAR(64) DEFAULT 'Asia/Seoul',
        push_enabled BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);",
    """
    CREATE TABLE IF NOT EXISTS daily_assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        assignment_date DATE NOT NULL,
        program_id INTEGER REFERENCES programs(id) ON DELETE SET NULL,
        source VARCHAR(20) DEFAULT 'ai_grok',
        ai_rationale TEXT,
        intensity_hint VARCHAR(20),
        duration_estimate_minutes INTEGER,
        refresh_count INTEGER DEFAULT 0,
        completed_at TIMESTAMP,
        skipped_at TIMESTAMP,
        feedback_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (user_id, assignment_date)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_daily_assignments_user_date ON daily_assignments(user_id, assignment_date);",
    """
    CREATE TABLE IF NOT EXISTS push_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        platform VARCHAR(10) NOT NULL,
        token VARCHAR(512) NOT NULL,
        app_version VARCHAR(32),
        last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        UNIQUE (user_id, token)
    );
    """,
    "CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);",
]


def is_postgres():
    uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    return uri.startswith('postgres')


def run():
    statements = PG_STATEMENTS if is_postgres() else SQLITE_STATEMENTS
    backend = 'PostgreSQL' if is_postgres() else 'SQLite'
    print('=' * 60)
    print(f'WODYBODY PT 테이블 마이그레이션 시작 ({backend})')
    print('=' * 60)
    with app.app_context():
        for stmt in statements:
            try:
                db.session.execute(text(stmt))
            except Exception as exc:
                print(f'⚠️  실행 실패 (계속 진행): {exc}\n  SQL: {stmt[:80]}…')
        db.session.commit()
    print('✅ 마이그레이션 완료: user_preferences / daily_assignments / push_tokens')


if __name__ == '__main__':
    run()
