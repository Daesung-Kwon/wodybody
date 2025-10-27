from datetime import datetime, timedelta
from config.database import db
import secrets

class PasswordReset(db.Model):
    """비밀번호 재설정 인증번호 모델"""
    __tablename__ = 'password_resets'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    email = db.Column(db.String(150), nullable=False)
    verification_code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    verified_at = db.Column(db.DateTime)
    
    # 관계 설정
    user = db.relationship('Users', backref='password_resets')
    
    def __init__(self, user_id, email):
        self.user_id = user_id
        self.email = email
        self.verification_code = self.generate_verification_code()
        self.created_at = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(minutes=10)  # 10분 유효
        self.is_used = False
    
    @staticmethod
    def generate_verification_code():
        """6자리 인증번호 생성"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(6)])
    
    def is_expired(self):
        """인증번호 만료 확인 (UTC 기준)"""
        return datetime.utcnow() > self.expires_at
    
    def verify_code(self, code):
        """인증번호 확인"""
        if self.is_used:
            return False, "이미 사용된 인증번호입니다."
        if self.is_expired():
            return False, "인증번호가 만료되었습니다."
        if self.verification_code != code:
            return False, "인증번호가 일치하지 않습니다."
        return True, "인증 성공"
    
    def mark_as_verified(self):
        """인증 완료로 표시"""
        self.verified_at = datetime.utcnow()
    
    def mark_as_used(self):
        """사용 완료로 표시"""
        self.is_used = True
    
    def __repr__(self):
        return f'<PasswordReset {self.email} - {self.verification_code}>'

