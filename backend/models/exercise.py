from datetime import datetime
from config.database import db

class ExerciseCategories(db.Model):
    """운동 카테고리 모델"""
    __tablename__ = 'exercise_categories'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """카테고리 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ExerciseCategory {self.name}>'

class Exercises(db.Model):
    """운동 종류 모델"""
    __tablename__ = 'exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    category_id = db.Column(db.Integer, db.ForeignKey('exercise_categories.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    category = db.relationship('ExerciseCategories', backref='exercises')
    
    def to_dict(self):
        """운동 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'category_id': self.category_id,
            'name': self.name,
            'description': self.description,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'category_name': self.category.name if self.category else ''
        }
    
    def __repr__(self):
        return f'<Exercise {self.name}>'

class ProgramExercises(db.Model):
    """프로그램 운동 모델 (기존 방식)"""
    __tablename__ = 'program_exercises'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    target_value = db.Column(db.String(50))  # '20분', '100회', '3세트'
    order_index = db.Column(db.Integer, default=0)  # 운동 순서
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    program = db.relationship('Programs', backref='program_exercises')
    exercise = db.relationship('Exercises', backref='program_exercises')
    
    def to_dict(self):
        """프로그램 운동 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'program_id': self.program_id,
            'exercise_id': self.exercise_id,
            'exercise_name': self.exercise.name if self.exercise else '',
            'target_value': self.target_value,
            'order_index': self.order_index,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ProgramExercise {self.program_id} -> {self.exercise_id}>'

class WorkoutPatterns(db.Model):
    """WOD 패턴 모델"""
    __tablename__ = 'workout_patterns'
    
    id = db.Column(db.Integer, primary_key=True)
    program_id = db.Column(db.Integer, db.ForeignKey('programs.id'), nullable=False)
    pattern_type = db.Column(db.String(50), nullable=False)  # 'fixed_reps', 'ascending', 'descending', 'mixed_progression', 'time_cap'
    total_rounds = db.Column(db.Integer, nullable=False)
    time_cap_per_round = db.Column(db.Integer)  # 라운드당 시간 제한 (분)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    program = db.relationship('Programs', backref='workout_patterns')
    
    def to_dict(self):
        """WOD 패턴 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'program_id': self.program_id,
            'pattern_type': self.pattern_type,
            'total_rounds': self.total_rounds,
            'time_cap_per_round': self.time_cap_per_round,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<WorkoutPattern {self.program_id}: {self.pattern_type}>'

class ExerciseSets(db.Model):
    """운동 세트 모델"""
    __tablename__ = 'exercise_sets'
    
    id = db.Column(db.Integer, primary_key=True)
    pattern_id = db.Column(db.Integer, db.ForeignKey('workout_patterns.id'), nullable=False)
    exercise_id = db.Column(db.Integer, db.ForeignKey('exercises.id'), nullable=False)
    base_reps = db.Column(db.Integer, nullable=False)  # 기본 횟수
    progression_type = db.Column(db.String(20), nullable=False)  # 'fixed', 'increase', 'decrease', 'mixed'
    progression_value = db.Column(db.Integer)  # 증가/감소 값
    order_index = db.Column(db.Integer, default=0)  # 운동 순서
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 관계 설정
    pattern = db.relationship('WorkoutPatterns', backref='exercise_sets')
    exercise = db.relationship('Exercises', backref='exercise_sets')
    
    def to_dict(self):
        """운동 세트 정보를 딕셔너리로 변환"""
        return {
            'id': self.id,
            'pattern_id': self.pattern_id,
            'exercise_id': self.exercise_id,
            'exercise_name': self.exercise.name if self.exercise else '',
            'base_reps': self.base_reps,
            'progression_type': self.progression_type,
            'progression_value': self.progression_value,
            'order_index': self.order_index,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<ExerciseSet {self.pattern_id} -> {self.exercise_id}: {self.base_reps} reps>'
