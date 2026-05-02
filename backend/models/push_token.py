"""푸시 토큰 모델 — iOS(APNs) / Android(FCM) / Web 디바이스 토큰 저장."""

from datetime import datetime

from config.database import db
from utils.timezone import get_korea_time


class PushTokens(db.Model):
    """디바이스 토큰. (user_id, token) 유니크."""

    __tablename__ = 'push_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
    )
    # 'ios' | 'android' | 'web'
    platform = db.Column(db.String(10), nullable=False)
    token = db.Column(db.String(512), nullable=False)
    app_version = db.Column(db.String(32))
    last_seen_at = db.Column(db.DateTime, default=get_korea_time)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    is_active = db.Column(db.Boolean, default=True)

    user = db.relationship('Users', backref='push_tokens')

    __table_args__ = (
        db.UniqueConstraint('user_id', 'token', name='uq_push_tokens_user_token'),
        db.Index('idx_push_tokens_user', 'user_id'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'platform': self.platform,
            # 보안상 토큰 전체 미노출 — 앞 8자만.
            'token_preview': (self.token or '')[:8] + '…',
            'app_version': self.app_version,
            'last_seen_at': (
                self.last_seen_at.isoformat() if self.last_seen_at else None
            ),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'is_active': bool(self.is_active),
        }

    def touch(self):
        self.last_seen_at = datetime.utcnow()

    def __repr__(self):
        return f'<PushToken user={self.user_id} platform={self.platform}>'
