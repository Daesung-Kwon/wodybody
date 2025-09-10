from datetime import datetime
from config.database import db

class WorkoutRecords(db.Model):
    """운동 기록 모델"""
    __tablename__ = 'workout_records'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    completion_time = db.Column(db.Integer, nullable=False)  # 완료 시간 (초)
    completed_at = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)  # 사용자 메모
    is_public = db.Column(db.Boolean, default=True)  # 기록 공개 여부
    
    # 관계 설정
    program = db.relationship('Programs', backref='workout_records')
    user = db.relationship('Users', backref='workout_records')
    
    # 복합 인덱스: 프로그램별 사용자 기록 조회 최적화
    __table_args__ = (db.Index('idx_program_user_time', 'program_id', 'user_id', 'completed_at'),)
    
    def to_dict(self):
        """운동 기록 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'program_id': self.program_id,
            'user_id': self.user_id,
            'completion_time': self.completion_time,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'notes': self.notes,
            'is_public': self.is_public
        }
    
    def __repr__(self):
        return f'<WorkoutRecord {self.user_id} -> {self.program_id}: {self.completion_time}s>'
