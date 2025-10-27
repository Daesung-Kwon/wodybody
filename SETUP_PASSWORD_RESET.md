# 비밀번호 재설정 기능 설정 가이드

## 🚀 빠른 시작

### 1. Backend 설정

#### 패키지 설치
```bash
cd backend
pip install -r requirements.txt
# Flask-Mail이 추가되었습니다
```

#### 이메일 설정 (Gmail 예시)

1. **Gmail 앱 비밀번호 생성**
   - https://myaccount.google.com/security 접속
   - "2단계 인증" 활성화
   - "앱 비밀번호" 생성
   - 생성된 16자리 비밀번호 복사

2. **환경 변수 설정**

로컬 개발용 `.env.local` 파일 생성:
```bash
cd backend
cat > .env.local << EOF
# 기존 설정
DATABASE_URL=sqlite:///instance/crossfit.db
SECRET_KEY=your-secret-key-here

# 이메일 설정 추가
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=abcd-efgh-ijkl-mnop  # 앱 비밀번호 16자리
MAIL_DEFAULT_SENDER=your-email@gmail.com
EOF
```

#### 데이터베이스 마이그레이션

**SQLite (로컬)**
```bash
cd backend
python -m migrations.add_password_reset_table
```

**PostgreSQL (Railway)**
```bash
# Railway CLI로 마이그레이션
railway login
railway link
cat migrations/add_password_reset_table.sql | railway run psql $DATABASE_URL
```

### 2. Frontend - 변경사항 없음
프론트엔드는 이미 업데이트되었으므로 추가 설정 불필요합니다.

```bash
cd frontend
npm install  # 기존 패키지만 있으면 됨
```

### 3. 실행

#### Backend
```bash
cd backend
python app.py
```

#### Frontend
```bash
cd frontend
npm start
```

## 🧪 기능 테스트

### 1. 웹 UI 테스트

1. http://localhost:3000 접속
2. 로그인 화면에서 "비밀번호를 잊으셨나요?" 버튼 확인
3. 클릭 후 이메일 입력
4. 이메일 수신 확인 (스팸 함 확인)
5. 6자리 인증번호 입력
6. 새 비밀번호 설정
7. 로그인 화면으로 돌아가서 새 비밀번호로 로그인

### 2. API 테스트 (cURL)

```bash
# 테스트용 사용자 생성 (이미 있으면 생략)
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "테스트",
    "password": "oldpassword123"
  }'

# 1. 인증번호 요청
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Response: {"message": "인증번호가 이메일로 전송되었습니다. (10분간 유효)", "email": "test@example.com"}

# 2. 이메일에서 받은 인증번호로 확인
curl -X POST http://localhost:5001/api/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# Response: {"message": "인증이 완료되었습니다.", "verified": true, "reset_id": 1}

# 3. 비밀번호 재설정
curl -X POST http://localhost:5001/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "reset_id":1,
    "new_password":"newpassword123"
  }'

# Response: {"message": "비밀번호가 성공적으로 변경되었습니다.", "success": true}
```

## 📋 체크리스트

### Backend
- [x] Flask-Mail 설치
- [x] 이메일 설정 환경 변수 추가
- [x] password_resets 테이블 생성
- [x] API 엔드포인트 구현
- [x] 이메일 템플릿 작성
- [x] 블루프린트 등록

### Frontend
- [x] 비밀번호 재설정 컴포넌트 생성
- [x] 로그인 페이지에 버튼 추가
- [x] API 연동
- [x] 라우팅 설정

### 테스트
- [ ] 로컬 환경 테스트
- [ ] 이메일 전송 확인
- [ ] 인증번호 검증 확인
- [ ] 비밀번호 재설정 확인
- [ ] 에러 핸들링 테스트

## 🔧 트러블슈팅

### 문제 1: 이메일이 전송되지 않음

**증상**: "이메일 전송 중 오류가 발생했습니다" 메시지

**해결 방법**:
```bash
# 로그 확인
tail -f backend/logs/crossfit.log

# 일반적인 원인:
# 1. Gmail 앱 비밀번호 오류 → 재생성 필요
# 2. 2단계 인증 비활성화 → 활성화 필요
# 3. "보안 수준이 낮은 앱" 차단 → 앱 비밀번호 사용 필요
```

### 문제 2: 인증번호가 만료됨

**증상**: "인증번호가 만료되었습니다" 메시지

**해결 방법**:
- 인증번호는 10분간만 유효합니다
- 새로운 인증번호를 요청하세요
- 서버 시간대 확인 (utils/timezone.py)

### 문제 3: 데이터베이스 오류

**증상**: "재설정 정보가 없습니다" 메시지

**해결 방법**:
```bash
# SQLite 테이블 확인
sqlite3 backend/instance/crossfit.db "SELECT * FROM password_resets;"

# PostgreSQL 테이블 확인
psql $DATABASE_URL -c "SELECT * FROM password_resets;"

# 테이블이 없으면 마이그레이션 재실행
cd backend
python -m migrations.add_password_reset_table
```

## 🚀 배포 (Railway)

### 1. Railway 환경 변수 설정
```bash
railway variables set MAIL_SERVER=smtp.gmail.com
railway variables set MAIL_PORT=587
railway variables set MAIL_USE_TLS=True
railway variables set MAIL_USERNAME=your-email@gmail.com
railway variables set MAIL_PASSWORD=your-app-password
railway variables set MAIL_DEFAULT_SENDER=your-email@gmail.com
```

### 2. 데이터베이스 마이그레이션
```bash
cat backend/migrations/add_password_reset_table.sql | railway run psql $DATABASE_URL
```

### 3. 배포
```bash
git add .
git commit -m "feat: 비밀번호 재설정 기능 추가"
git push origin develop
railway up
```

## 📧 이메일 서비스 선택사항

### Gmail (권장)
- 무료
- 일일 500통 제한
- 앱 비밀번호 필요

### SendGrid
```bash
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=your-sendgrid-api-key
```

### AWS SES
```bash
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
```

## 📚 추가 문서

- [PASSWORD_RESET_GUIDE.md](./PASSWORD_RESET_GUIDE.md) - 상세 가이드
- [BACKEND_DECRYPTION_GUIDE.md](./BACKEND_DECRYPTION_GUIDE.md) - 백엔드 구조

## ✅ 완료!

모든 설정이 완료되었습니다. 문제가 발생하면 로그를 확인하거나 이슈를 생성해주세요.

