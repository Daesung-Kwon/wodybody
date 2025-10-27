# 비밀번호 재설정 기능 가이드

## 📋 개요

사용자가 비밀번호를 잊어버린 경우 이메일 인증을 통해 비밀번호를 재설정할 수 있는 기능입니다.

## 🔄 동작 흐름

```
1. 사용자가 로그인 화면에서 "비밀번호를 잊으셨나요?" 버튼 클릭
   ↓
2. 이메일 주소 입력
   ↓
3. 서버에서 6자리 인증번호 생성 및 이메일 전송
   ↓
4. 사용자가 받은 인증번호 입력
   ↓
5. 인증번호 확인
   ↓
6. 새 비밀번호 입력
   ↓
7. 비밀번호 재설정 완료
```

## 🏗️ 구현 상세

### Backend

#### 1. 모델 (`models/password_reset.py`)
- 인증번호 저장 및 관리
- 10분 유효 기간
- 6자리 랜덤 숫자 생성

#### 2. API 엔드포인트 (`routes/password_reset.py`)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/password-reset/request` | POST | 인증번호 이메일 전송 |
| `/api/password-reset/verify` | POST | 인증번호 확인 |
| `/api/password-reset/reset` | POST | 비밀번호 재설정 |
| `/api/password-reset/check-status` | POST | 재설정 상태 확인 (디버깅용) |

#### 3. 이메일 전송 (`utils/email.py`)
- Flask-Mail 사용
- HTML 이메일 템플릿
- 인증번호 및 비밀번호 변경 알림

### Frontend

#### 1. 컴포넌트
- `MuiPasswordResetPage.tsx`: 비밀번호 재설정 메인 페이지
- 3단계 진행 (이메일 → 인증번호 → 비밀번호)
- Material-UI Stepper 사용

#### 2. API 연동 (`utils/api.ts`)
```typescript
passwordResetApi.requestReset(email)
passwordResetApi.verifyCode(email, code)
passwordResetApi.resetPassword(email, reset_id, new_password)
```

## 🔧 설정 방법

### 1. 이메일 설정 (Gmail 예시)

#### Gmail 앱 비밀번호 생성
1. Google 계정 설정 → 보안
2. 2단계 인증 활성화
3. 앱 비밀번호 생성
4. 생성된 16자리 비밀번호 복사

#### 환경 변수 설정
```bash
# .env 또는 .env.local 파일
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password  # 앱 비밀번호 16자리
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

### 2. 데이터베이스 마이그레이션

#### 로컬 (SQLite)
```bash
cd backend
python -m migrations.add_password_reset_table
```

#### Railway (PostgreSQL)
```bash
# Railway CLI 사용
cat backend/migrations/add_password_reset_table.sql | railway run psql $DATABASE_URL

# 또는 Railway 대시보드에서 직접 SQL 실행
```

### 3. 의존성 설치

```bash
cd backend
pip install Flask-Mail==0.9.1
```

## 🧪 테스트

### 1. 로컬 테스트

```bash
# Backend 실행
cd backend
python app.py

# Frontend 실행
cd frontend
npm start
```

### 2. API 테스트 (cURL)

```bash
# 1. 인증번호 요청
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. 인증번호 확인
curl -X POST http://localhost:5001/api/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456"}'

# 3. 비밀번호 재설정
curl -X POST http://localhost:5001/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","reset_id":1,"new_password":"newpassword123"}'
```

## 🔒 보안 고려사항

### 1. 인증번호
- 6자리 랜덤 숫자
- 10분 유효 기간
- 1회용 (사용 후 자동 만료)

### 2. 이메일 보안
- 사용자 존재 여부 노출 방지 (항상 성공 메시지 반환)
- 인증번호 공유 경고 메시지

### 3. 비밀번호 정책
- 최소 8자 이상
- 해시화 저장 (werkzeug.security)

### 4. Rate Limiting (향후 추가 권장)
- 인증번호 요청 횟수 제한
- IP별 요청 제한

## 📱 사용자 경험

### UI/UX 특징
- 진행 단계 시각화 (Stepper)
- 실시간 입력 검증
- 명확한 오류 메시지
- 반응형 디자인

### 이메일 템플릿
- 브랜드 로고 포함
- 모바일 친화적 디자인
- 명확한 인증번호 표시
- 주의사항 안내

## 🐛 트러블슈팅

### 1. 이메일이 전송되지 않을 때

```bash
# 로그 확인
tail -f backend/logs/crossfit.log

# 일반적인 원인
- 잘못된 Gmail 앱 비밀번호
- 2단계 인증 비활성화
- SMTP 포트 차단
```

### 2. 데이터베이스 오류

```bash
# 테이블 확인
sqlite3 instance/crossfit.db "SELECT name FROM sqlite_master WHERE type='table';"

# PostgreSQL
psql $DATABASE_URL -c "\\dt"
```

### 3. CORS 오류

프론트엔드와 백엔드 도메인이 다른 경우 CORS 설정 확인:

```python
# backend/app.py
CORS_ORIGINS = ['http://localhost:3000', 'https://your-domain.com']
```

## 📊 모니터링

### 로그 확인
```bash
# 비밀번호 재설정 요청
grep "비밀번호 재설정 요청" backend/logs/crossfit.log

# 인증번호 확인
grep "인증번호 확인" backend/logs/crossfit.log

# 비밀번호 재설정 완료
grep "비밀번호 재설정 완료" backend/logs/crossfit.log
```

### 데이터베이스 쿼리
```sql
-- 최근 재설정 요청 조회
SELECT * FROM password_resets 
ORDER BY created_at DESC 
LIMIT 10;

-- 만료되지 않은 인증번호
SELECT * FROM password_resets 
WHERE expires_at > CURRENT_TIMESTAMP 
AND is_used = FALSE;
```

## 🚀 배포

### Railway 환경 변수 설정
```bash
railway variables set MAIL_SERVER=smtp.gmail.com
railway variables set MAIL_PORT=587
railway variables set MAIL_USE_TLS=True
railway variables set MAIL_USERNAME=your-email@gmail.com
railway variables set MAIL_PASSWORD=your-app-password
railway variables set MAIL_DEFAULT_SENDER=your-email@gmail.com
```

### Vercel 프론트엔드
- 환경 변수 설정 불필요 (백엔드 API 사용)
- CORS 설정 확인

## 📝 TODO (향후 개선)

- [ ] Rate Limiting 추가
- [ ] 이메일 템플릿 커스터마이징
- [ ] SMS 인증 옵션 추가
- [ ] 만료된 인증번호 자동 정리 (크론 작업)
- [ ] 2FA (Two-Factor Authentication) 지원
- [ ] 이메일 전송 실패 재시도 로직
- [ ] 비동기 이메일 전송 (Celery)

## 📞 문의

문제가 발생하거나 질문이 있으면 이슈를 생성해주세요.

---

**구현 완료일**: 2025-10-27  
**버전**: 1.0.0  
**작성자**: WodyBody Team

