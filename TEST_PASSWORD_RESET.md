# 비밀번호 재설정 로컬 테스트 가이드

## ✅ 완료된 작업

1. **Flask-Mail 설치 완료** ✅
   ```bash
   Flask-Mail 0.9.1 설치 완료
   ```

2. **PostgreSQL 데이터베이스 테이블 생성 완료** ✅
   ```
   password_resets 테이블 생성됨
   - id, user_id, email, verification_code
   - created_at, expires_at, is_used, verified_at
   ```

3. **백엔드 서버 시작 완료** ✅
   ```
   Flask-Mail initialized ✅
   All blueprints registered successfully ✅
   Server running on http://127.0.0.1:5001 ✅
   ```

4. **API 엔드포인트 테스트 성공** ✅
   ```bash
   curl -X POST http://localhost:5001/api/password-reset/request \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   
   # 응답: "인증번호가 이메일로 전송되었습니다. (10분간 유효)" ✅
   ```

## 🔧 이제 필요한 작업

### 1. 이메일 설정 (Gmail 사용 시)

`backend/.env.local` 파일에 다음 내용 추가:

```bash
# 이메일 설정
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USE_SSL=False
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password
MAIL_DEFAULT_SENDER=your-email@gmail.com
```

#### Gmail 앱 비밀번호 생성 방법:

1. https://myaccount.google.com/security 접속
2. **"2단계 인증"** 활성화 (필수!)
3. **"앱 비밀번호"** 클릭
4. 앱 선택: **메일**
5. 기기 선택: **기타** (WodyBody 입력)
6. **생성** 클릭
7. 16자리 비밀번호 복사 (예: `abcd efgh ijkl mnop`)
8. `.env.local` 파일의 `MAIL_PASSWORD`에 붙여넣기 (공백 제거)

#### 설정 후 서버 재시작:

```bash
cd /Users/malife/crossfit-system/backend
source venv/bin/activate

# 기존 서버 종료
pkill -f "python app.py"

# 서버 재시작
python app.py
```

### 2. 프론트엔드 실행

새 터미널에서:

```bash
cd /Users/malife/crossfit-system/frontend
npm start
```

### 3. 웹 브라우저 테스트

1. http://localhost:3000 접속
2. 로그인 화면에서 **"비밀번호를 잊으셨나요?"** 버튼 클릭
3. 이메일 주소 입력
4. **"인증번호 전송"** 버튼 클릭
5. 이메일 확인 (수신까지 1-2분 소요 가능, 스팸함 확인)
6. 6자리 인증번호 입력
7. 새 비밀번호 설정
8. 로그인 화면으로 돌아가서 새 비밀번호로 로그인

## 🧪 API 테스트 (이메일 설정 후)

### 전체 플로우 테스트:

```bash
# 1. 테스트 사용자 생성 (이미 있으면 생략)
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-test-email@gmail.com",
    "name": "테스트",
    "password": "oldpassword123"
  }'

# 2. 비밀번호 재설정 요청
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com"}'

# 3. 이메일 확인 후 인증번호 입력 (예: 123456)
curl -X POST http://localhost:5001/api/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"your-test-email@gmail.com","code":"123456"}'

# 응답에서 reset_id 확인 (예: 1)

# 4. 비밀번호 재설정
curl -X POST http://localhost:5001/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-test-email@gmail.com",
    "reset_id":1,
    "new_password":"newpassword123"
  }'

# 5. 새 비밀번호로 로그인 테스트
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"your-test-email@gmail.com",
    "password":"newpassword123"
  }'
```

## 📊 현재 상태

| 항목 | 상태 |
|------|------|
| Flask-Mail 설치 | ✅ 완료 |
| PostgreSQL 테이블 | ✅ 생성됨 |
| 백엔드 서버 | ✅ 실행 중 |
| API 엔드포인트 | ✅ 동작 중 |
| 이메일 설정 | ⚠️ 설정 필요 |
| 프론트엔드 | ⏳ 실행 대기 |

## 🔍 로그 모니터링

### 백엔드 로그:
```bash
tail -f /Users/malife/crossfit-system/backend/logs/crossfit.log
```

### 실시간 서버 출력:
```bash
tail -f /tmp/backend_server.log
```

### 비밀번호 재설정 관련 로그만:
```bash
grep -i "password" /Users/malife/crossfit-system/backend/logs/crossfit.log | tail -20
```

## ⚠️ 이메일 미설정 시 동작

이메일 설정이 안 되어 있으면:
- API 호출은 성공 (200 OK)
- 하지만 실제 이메일은 전송되지 않음
- 로그에 "이메일 전송 실패" 에러 기록됨

**따라서 실제 테스트를 위해서는 이메일 설정이 필수입니다!**

## 📝 다음 단계

1. `.env.local`에 Gmail 앱 비밀번호 설정
2. 서버 재시작
3. 프론트엔드 실행 (`npm start`)
4. 웹 브라우저에서 전체 플로우 테스트
5. 이메일 수신 확인
6. 비밀번호 재설정 완료

## 🎉 성공 확인

모든 것이 정상 작동하면:

- ✅ 이메일로 6자리 인증번호 수신
- ✅ 인증번호 입력 후 확인 성공
- ✅ 새 비밀번호 설정 성공
- ✅ 비밀번호 변경 알림 이메일 수신
- ✅ 새 비밀번호로 로그인 성공

---

**테스트 준비 완료!** 🚀

