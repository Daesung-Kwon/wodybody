from datetime import datetime, timedelta
from config.database import db
from utils.timezone import get_korea_time

class Programs(db.Model):
    """프로그램 모델"""
    __tablename__ = 'programs'
    
    id = db.Column(db.Integer, primary_key=True)
    creator_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    workout_type = db.Column(db.String(50), default='time_based')
    target_value = db.Column(db.String(100))
    difficulty = db.Column(db.String(20), default='beginner')
    max_participants = db.Column(db.Integer, default=20)
    is_open = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    expires_at = db.Column(db.DateTime)  # 공개 WOD 만료 시간
    
    # 관계 설정
    creator = db.relationship('Users', backref='created_programs')
    
    def to_dict(self):
        """프로그램 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'creator_id': self.creator_id,
            'title': self.title,
            'description': self.description,
            'workout_type': self.workout_type,
            'target_value': self.target_value,
            'difficulty': self.difficulty,
            'max_participants': self.max_participants,
            'is_open': self.is_open,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None
        }
    
    def is_expired(self):
        """WOD가 만료되었는지 확인"""
        if not self.expires_at:
            return False
        return get_korea_time() > self.expires_at
    
    def days_until_expiry(self):
        """만료까지 남은 일수 계산"""
        if not self.expires_at:
            return None
        delta = self.expires_at - get_korea_time()
        return max(0, delta.days)
    
    def __repr__(self):
        return f'<Program {self.title}>'

class Registrations(db.Model):
    """프로그램 등록 모델 (기존 시스템 호환용)"""
    __tablename__ = 'registrations'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    result = db.Column(db.String(100))
    completed = db.Column(db.Boolean, default=False)
    
    # 관계 설정
    program = db.relationship('Programs', backref='registrations')
    user = db.relationship('Users', backref='registrations')
    
    def __repr__(self):
        return f'<Registration {self.user_id} -> {self.program_id}>'

class ProgramParticipants(db.Model):
    """프로그램 참여자 모델 (새로운 참여 시스템)"""
    __tablename__ = 'program_participants'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # 'pending', 'approved', 'rejected', 'left'
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    approved_at = db.Column(db.DateTime)
    left_at = db.Column(db.DateTime)
    
    # 관계 설정
    program = db.relationship('Programs', backref='participants')
    user = db.relationship('Users', backref='program_participations')
    
    # 복합 유니크 제약조건 (한 사용자는 한 프로그램에 한 번만 참여 가능)
    __table_args__ = (db.UniqueConstraint('program_id', 'user_id', name='unique_program_user'),)
    
    def to_dict(self):
        """참여자 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'program_id': self.program_id,
            'user_id': self.user_id,
            'status': self.status,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None,
            'approved_at': self.approved_at.isoformat() if self.approved_at else None,
            'left_at': self.left_at.isoformat() if self.left_at else None
        }
    
    def __repr__(self):
        return f'<ProgramParticipant {self.user_id} -> {self.program_id} ({self.status})>'

class PersonalGoals(db.Model):
    """개인 목표 모델"""
    __tablename__ = 'personal_goals'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    target_time = db.Column(db.Integer, nullable=False)  # 목표 시간 (초)
    created_at = db.Column(db.DateTime, default=get_korea_time)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # 관계 설정
    user = db.relationship('Users', backref='personal_goals')
    program = db.relationship('Programs', backref='personal_goals')
    
    # 복합 유니크 제약조건: 한 사용자는 한 프로그램에 하나의 목표만 설정 가능
    __table_args__ = (db.UniqueConstraint('user_id', 'program_id', name='unique_user_program_goal'),)
    
    def to_dict(self):
        """목표 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'program_id': self.program_id,
            'target_time': self.target_time,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<PersonalGoal {self.user_id} -> {self.program_id}: {self.target_time}s>'
