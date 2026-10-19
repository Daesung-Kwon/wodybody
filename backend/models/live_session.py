"""Live WOD session models.

PoC tables. Scores are not stored on workout_records.
Clock columns are UTC epoch milliseconds (timezone-aware epoch), not naive
local datetimes.

Deployment assumption: one gunicorn worker (see docs/LIVE_POC.md). The
leaderboard dirty-set lives in this process.
"""

from datetime import datetime

from config.database import db


class LiveSession(db.Model):
    """Host-owned live session. started_at_ms is null until the host starts."""

    __tablename__ = 'live_sessions'

    id = db.Column(db.Integer, primary_key=True)
    host_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False, default='Live WOD')
    # 'amrap' | 'for_time'
    workout_type = db.Column(db.String(16), nullable=False)
    duration_sec = db.Column(db.Integer, nullable=False)
    # When set, non-finisher / AMRAP total reps = rounds * reps_per_round + reps.
    reps_per_round = db.Column(db.Integer, nullable=True)
    started_at_ms = db.Column(db.BigInteger, nullable=True)
    ended_at_ms = db.Column(db.BigInteger, nullable=True)
    # 'lobby' | 'live' | 'ended'
    status = db.Column(db.String(16), nullable=False, default='lobby')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    host = db.relationship('Users', foreign_keys=[host_user_id])

    def __repr__(self):
        return f'<LiveSession {self.id} {self.workout_type} {self.status}>'


class LiveParticipant(db.Model):
    """One row per user in a session. division is rx or scaled, never converted."""

    __tablename__ = 'live_participants'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('live_sessions.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    division = db.Column(db.String(16), nullable=False)
    cumulative_rounds = db.Column(db.Integer, nullable=False, default=0)
    cumulative_reps = db.Column(db.Integer, nullable=False, default=0)
    # Server UTC epoch ms when a For Time athlete hits Done. Null if DNF.
    finished_at_ms = db.Column(db.BigInteger, nullable=True)

    session = db.relationship('LiveSession', backref='participants')
    user = db.relationship('Users')

    __table_args__ = (
        db.UniqueConstraint('session_id', 'user_id', name='uq_live_participant_session_user'),
    )

    def __repr__(self):
        return f'<LiveParticipant s={self.session_id} u={self.user_id} {self.division}>'


class LiveTapEvent(db.Model):
    """Append-only tap log. cumulative_* is the whiteboard AFTER this tap."""

    __tablename__ = 'live_tap_events'

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('live_sessions.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    # 'round' | 'rep'
    kind = db.Column(db.String(8), nullable=False)
    cumulative_rounds = db.Column(db.Integer, nullable=False)
    cumulative_reps = db.Column(db.Integer, nullable=False, default=0)
    server_ts_ms = db.Column(db.BigInteger, nullable=False)
    client_ts_ms = db.Column(db.BigInteger, nullable=True)

    def __repr__(self):
        return f'<LiveTapEvent s={self.session_id} u={self.user_id} {self.kind} r={self.cumulative_rounds}>'
