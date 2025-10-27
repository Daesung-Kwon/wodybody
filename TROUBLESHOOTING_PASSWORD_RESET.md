# 비밀번호 재설정 오류 해결 가이드

## 🚨 "Load failed" 오류 해결

### 원인 1: Flask-Mail 미설치 (가장 흔한 원인)

**증상**: 서버 시작 시 ImportError 또는 ModuleNotFoundError

**해결**:
```bash
cd backend
source venv/bin/activate
pip install Flask-Mail==0.9.1

# 설치 확인
python -c "import flask_mail; print('OK')"
```

### 원인 2: 환경 변수 미설정

**증상**: 이메일 전송 시 "이메일 전송 중 오류가 발생했습니다"

**해결**:
```bash
# backend/.env.local 파일 생성
cd backend
cat > .env.local << 'EOF'
DATABASE_URL=sqlite:///instance/crossfit.db
SECRET_KEY=your-secret-key-here

MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
EOF
```

**Gmail 앱 비밀번호 생성 (필수!):**
1. https://myaccount.google.com/security
2. "2단계 인증" 활성화
3. "앱 비밀번호" 생성 (Mail 선택)
4. 16자리 비밀번호 복사 → MAIL_PASSWORD에 입력

### 원인 3: 데이터베이스 테이블 미생성

**증상**: "no such table: password_resets" 또는 "relation does not exist"

**해결**:
```bash
cd backend
source venv/bin/activate
python -m migrations.add_password_reset_table
```

**확인**:
```bash
# SQLite
sqlite3 instance/crossfit.db "SELECT name FROM sqlite_master WHERE type='table' AND name='password_resets';"

# 결과가 'password_resets'로 나와야 함
```

### 원인 4: 블루프린트 등록 오류

**증상**: 서버 로그에 "Blueprint 'password_reset' already registered" 또는 404 에러

**확인**:
```bash
# backend/app.py 확인
grep "password_reset" backend/app.py

# 다음이 있어야 함:
# from routes import password_reset
# app.register_blueprint(password_reset.bp)
```

### 원인 5: CORS 설정 문제

**증상**: 브라우저 콘솔에 CORS 에러

**해결**:
```python
# backend/app.py 확인
CORS_ORIGINS = 'http://localhost:3000'  # 개발 환경
```

프론트엔드가 다른 포트에서 실행 중이면 해당 포트 추가

## 🔍 단계별 디버깅

### Step 1: 백엔드 서버 상태 확인

```bash
cd backend
source venv/bin/activate
python app.py
```

**성공 시 출력:**
```
✅ Flask-Mail initialized
✅ Database tables already exist
✅ All blueprints and WebSocket handlers registered successfully!
🚀 Server starting on port 5001
```

**실패 시:**
- ImportError → Flask-Mail 설치 필요
- KeyError → 환경 변수 설정 필요
- SQLAlchemy Error → 데이터베이스 마이그레이션 필요

### Step 2: API 엔드포인트 테스트

```bash
# Health check
curl http://localhost:5001/api/health

# 비밀번호 재설정 요청 테스트
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**성공 응답:**
```json
{
  "message": "인증번호가 이메일로 전송되었습니다. (10분간 유효)",
  "email": "test@example.com"
}
```

**실패 응답:**
```json
{
  "message": "이메일 전송 중 오류가 발생했습니다: ..."
}
```

### Step 3: 로그 확인

```bash
# 실시간 로그 모니터링
tail -f backend/logs/crossfit.log

# 최근 에러만 확인
grep "ERROR" backend/logs/crossfit.log | tail -20

# 비밀번호 재설정 관련 로그만
grep "password" backend/logs/crossfit.log -i
```

### Step 4: 프론트엔드 콘솔 확인

브라우저 개발자 도구 (F12) → Console 탭

**확인할 내용:**
- CORS 에러
- 404 에러 (엔드포인트 없음)
- 500 에러 (서버 내부 오류)
- Network 탭에서 실제 요청/응답 확인

## 🧪 완전 테스트 절차

### 1. 환경 설정 확인

```bash
cd backend

# 1. 가상환경 확인
which python
# /Users/malife/crossfit-system/backend/venv/bin/python 이어야 함

# 2. Flask-Mail 확인
python -c "import flask_mail; print('✅ Flask-Mail OK')"

# 3. 환경 변수 확인
python -c "import os; print('MAIL_USERNAME:', os.getenv('MAIL_USERNAME', 'NOT SET'))"
```

### 2. 테스트 사용자 생성 (없으면)

```bash
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "테스트 사용자",
    "password": "testpass123"
  }'
```

### 3. 비밀번호 재설정 전체 플로우 테스트

```bash
# 1. 인증번호 요청
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' -v

# 2. 이메일 확인 후 인증번호 입력 (예: 123456)
curl -X POST http://localhost:5001/api/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}' -v

# 3. 비밀번호 재설정 (reset_id는 위 응답에서 받은 값)
curl -X POST http://localhost:5001/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "reset_id":1,
    "new_password":"newpass123"
  }' -v
```

## 📧 이메일 전송 문제

### Gmail 설정 체크리스트

- [ ] 2단계 인증 활성화
- [ ] 앱 비밀번호 생성 (16자리)
- [ ] "보안 수준이 낮은 앱" 설정 불필요 (앱 비밀번호 사용 시)
- [ ] 환경 변수에 올바른 이메일/비밀번호 입력
- [ ] 스팸 함 확인

### 이메일 테스트 코드

```python
# backend/test_email.py
import os
from flask import Flask
from utils.email import init_mail, send_verification_code

app = Flask(__name__)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

init_mail(app)

with app.app_context():
    success, message = send_verification_code(
        'your-email@gmail.com',
        '123456',
        '테스트'
    )
    print(f'Success: {success}')
    print(f'Message: {message}')
```

실행:
```bash
cd backend
source venv/bin/activate
python test_email.py
```

## 🔄 완전 초기화 (마지막 수단)

모든 방법이 실패하면 완전히 다시 시작:

```bash
# 1. 데이터베이스 백업 (선택)
cp backend/instance/crossfit.db backend/instance/crossfit.db.backup

# 2. password_resets 테이블만 삭제
sqlite3 backend/instance/crossfit.db "DROP TABLE IF EXISTS password_resets;"

# 3. 가상환경 재생성
cd backend
rm -rf venv
python3 -m venv venv
source venv/bin/activate

# 4. 의존성 재설치
pip install -r requirements.txt

# 5. 마이그레이션
python -m migrations.add_password_reset_table

# 6. 서버 재시작
python app.py
```

## 📞 추가 지원

위 방법으로도 해결되지 않으면:

1. 전체 에러 로그 복사
2. 실행 환경 정보 (OS, Python 버전)
3. 실행한 명령어와 결과
4. 스크린샷

위 정보와 함께 문의해주세요.

## ✅ 성공 확인

모든 것이 정상이면:

1. 서버 시작 시 "Flask-Mail initialized" 출력
2. API 요청 시 200 응답
3. 이메일 수신 (5분 이내)
4. 인증번호 확인 성공
5. 비밀번호 재설정 성공
6. 새 비밀번호로 로그인 가능

---

**마지막 업데이트**: 2025-10-27

