"""사용자 PT 선호 설정 모델."""

from datetime import datetime
import json

from config.database import db
from utils.timezone import get_korea_time


class UserPreferences(db.Model):
    """사용자별 PT 선호 설정 (목표·기구·시간·난이도·푸시 시각)."""

    __tablename__ = 'user_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        unique=True,
        index=True,
    )
    # JSON-encoded list of strings, e.g. '["muscle_gain","conditioning"]'.
    # SQLite/Postgres 양쪽에서 안전하도록 TEXT로 저장.
    goals = db.Column(db.Text)
    equipment = db.Column(db.Text)
    available_minutes = db.Column(db.Integer, default=20)
    difficulty = db.Column(db.String(20), default='intermediate')
    push_time = db.Column(db.String(5), default='09:00')
    timezone = db.Column(db.String(64), default='Asia/Seoul')
    push_enabled = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    updated_at = db.Column(
        db.DateTime, default=get_korea_time, onupdate=datetime.utcnow
    )

    user = db.relationship('Users', backref=db.backref('preferences', uselist=False))

    @staticmethod
    def _parse_list(value):
        if not value:
            return []
        try:
            data = json.loads(value)
            return data if isinstance(data, list) else []
        except (TypeError, ValueError):
            return []

    def goals_list(self):
        return self._parse_list(self.goals)

    def equipment_list(self):
        return self._parse_list(self.equipment)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'goals': self.goals_list(),
            'equipment': self.equipment_list(),
            'available_minutes': self.available_minutes,
            'difficulty': self.difficulty,
            'push_time': self.push_time,
            'timezone': self.timezone,
            'push_enabled': self.push_enabled,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def default_payload(cls):
        """선호 설정 미입력 사용자에 대한 기본값."""
        return {
            'goals': ['general_fitness'],
            'equipment': ['bodyweight'],
            'available_minutes': 20,
            'difficulty': 'intermediate',
            'push_time': '09:00',
            'timezone': 'Asia/Seoul',
            'push_enabled': True,
        }

    def __repr__(self):
        return f'<UserPreferences user={self.user_id} difficulty={self.difficulty}>'
