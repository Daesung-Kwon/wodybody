"""입력 데이터 검증 유틸리티"""

def validate_register(data):
    """회원가입 데이터 검증"""
    if not data:
        return '데이터가 필요합니다'
    
    email = (data.get('email') or '').strip()
    name = (data.get('name') or '').strip()
    password = data.get('password') or ''
    
    if '@' not in email:
        return '유효한 이메일을 입력하세요'
    
    if len(name) < 2:
        return '이름은 2자 이상이어야 합니다'
    
    if len(password) < 6:
        return '비밀번호는 6자 이상이어야 합니다'
    
    return None

def validate_program(data):
    """프로그램 데이터 검증"""
    if not data:
        return '데이터가 필요합니다'
    
    title = (data.get('title') or '').strip()
    if not title or len(title) < 3:
        return '제목은 3자 이상이어야 합니다'
    
    # 정원 검증
    if data.get('max_participants') is not None:
        try:
            max_participants = int(data['max_participants'])
            if max_participants < 1 or max_participants > 200:
                return '정원은 1~200 사이여야 합니다'
        except (ValueError, TypeError):
            return '정원은 숫자여야 합니다'
    
    # 운동 타입 검증
    workout_type = data.get('workout_type', 'time_based')
    valid_types = ['time_based', 'rep_based', 'wod']
    if workout_type not in valid_types:
        return '유효하지 않은 운동 타입입니다'
    
    return None

def validate_workout_record(data):
    """운동 기록 데이터 검증"""
    if not data:
        return '데이터가 필요합니다'
    
    completion_time = data.get('completion_time')
    if not completion_time or not isinstance(completion_time, int) or completion_time <= 0:
        return '유효한 완료 시간이 필요합니다'
    
    notes = data.get('notes', '')
    if len(notes) > 1000:
        return '메모는 1000자 이하여야 합니다'
    
    return None

def validate_personal_goal(data):
    """개인 목표 데이터 검증"""
    if not data:
        return '데이터가 필요합니다'
    
    program_id = data.get('program_id')
    target_time = data.get('target_time')
    
    if not program_id:
        return '프로그램 ID가 필요합니다'
    
    if not target_time or not isinstance(target_time, int) or target_time <= 0:
        return '유효한 목표 시간이 필요합니다'
    
    return None

def sanitize_string(value, max_length=None):
    """문자열 정리 및 길이 제한"""
    if not value:
        return ''
    
    sanitized = str(value).strip()
    
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    return sanitized

def validate_email(email):
    """이메일 형식 검증"""
    if not email:
        return False
    
    email = email.strip().lower()
    
    # 기본적인 이메일 형식 검증
    if '@' not in email or '.' not in email:
        return False
    
    parts = email.split('@')
    if len(parts) != 2:
        return False
    
    local, domain = parts
    if not local or not domain:
        return False
    
    return True
