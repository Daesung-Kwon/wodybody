"""일일 WOD 배정 모델 — (user_id, date) 단위 캐싱 + 피드백 저장."""

from datetime import datetime
import json

from config.database import db
from utils.timezone import get_korea_time


class DailyAssignments(db.Model):
    """매일 1행: 사용자에게 추천된 WOD와 실행 결과/피드백."""

    __tablename__ = 'daily_assignments'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    assignment_date = db.Column(db.Date, nullable=False, index=True)
    program_id = db.Column(
        db.Integer,
        db.ForeignKey('programs.id', ondelete='SET NULL'),
        nullable=True,
    )
    # 'ai_grok' | 'self_pick' | 'fallback'
    source = db.Column(db.String(20), default='ai_grok')
    ai_rationale = db.Column(db.Text)
    intensity_hint = db.Column(db.String(20))
    duration_estimate_minutes = db.Column(db.Integer)
    refresh_count = db.Column(db.Integer, default=0)
    completed_at = db.Column(db.DateTime)
    skipped_at = db.Column(db.DateTime)
    # JSON: { "user_feedback": "easy|hard|skip|refused", "client_meta": {...} }
    feedback_json = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    updated_at = db.Column(
        db.DateTime, default=get_korea_time, onupdate=datetime.utcnow
    )

    user = db.relationship('Users', backref='daily_assignments')
    program = db.relationship('Programs')

    __table_args__ = (
        db.UniqueConstraint(
            'user_id', 'assignment_date', name='uq_daily_assignments_user_date'
        ),
        db.Index('idx_daily_assignments_user_date', 'user_id', 'assignment_date'),
    )

    def feedback_dict(self):
        if not self.feedback_json:
            return {}
        try:
            data = json.loads(self.feedback_json)
            return data if isinstance(data, dict) else {}
        except (TypeError, ValueError):
            return {}

    def set_feedback(self, payload):
        self.feedback_json = json.dumps(payload, ensure_ascii=False)

    def to_dict(self, include_program=False):
        out = {
            'id': self.id,
            'user_id': self.user_id,
            'assignment_date': (
                self.assignment_date.isoformat() if self.assignment_date else None
            ),
            'program_id': self.program_id,
            'source': self.source,
            'ai_rationale': self.ai_rationale,
            'intensity_hint': self.intensity_hint,
            'duration_estimate_minutes': self.duration_estimate_minutes,
            'refresh_count': self.refresh_count or 0,
            'completed_at': (
                self.completed_at.isoformat() if self.completed_at else None
            ),
            'skipped_at': self.skipped_at.isoformat() if self.skipped_at else None,
            'feedback': self.feedback_dict(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_program and self.program is not None:
            try:
                out['program'] = self.program.to_dict()
            except Exception:
                out['program'] = None
        return out

    def __repr__(self):
        return (
            f'<DailyAssignment user={self.user_id} date={self.assignment_date} '
            f'program={self.program_id} source={self.source}>'
        )
