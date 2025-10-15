from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from config.database import db
from utils.timezone import get_korea_time

class Users(db.Model):
    """사용자 모델"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    role = db.Column(db.String(20), default='user')
    is_active = db.Column(db.Boolean, default=True)
    last_login_at = db.Column(db.DateTime)
    
    def set_password(self, password):
        """비밀번호 해시화"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """비밀번호 검증"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """사용자 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'role': self.role,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None
        }
    
    def __repr__(self):
        return f'<User {self.email}>'
