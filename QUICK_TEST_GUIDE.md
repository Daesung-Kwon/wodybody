# 🚀 비밀번호 재설정 빠른 테스트 가이드

## ✅ 현재 상태
- 백엔드 서버: **실행 중** ✅ (http://localhost:5001)
- 이메일 전송: **성공** ✅ (simadeit@naver.com으로 전송됨)
- 인증번호: **374144**

## 📱 웹 브라우저 테스트 (권장)

### 1. 프론트엔드 실행
```bash
# 새 터미널 열기
cd /Users/malife/crossfit-system/frontend
npm start
```

### 2. 테스트 시나리오

#### Step 1: 비밀번호 재설정 페이지 접근
1. http://localhost:3000 접속
2. 로그인 화면에서 **"비밀번호를 잊으셨나요?"** 버튼 클릭

#### Step 2: 이메일 입력
1. 이메일 주소 입력 (예: `simadeit@naver.com`)
2. **"인증번호 전송"** 버튼 클릭
3. 성공 메시지 확인: "인증번호가 이메일로 전송되었습니다"

#### Step 3: 이메일 확인
1. 받은편지함 또는 **스팸함** 확인
2. 제목: `[WodyBody] 비밀번호 재설정 인증번호`
3. 6자리 인증번호 확인

#### Step 4: 인증번호 입력
1. 받은 6자리 인증번호 입력
2. **"인증 확인"** 버튼 클릭
3. 성공 메시지 확인: "인증이 완료되었습니다"

#### Step 5: 새 비밀번호 설정
1. 새 비밀번호 입력 (최소 8자)
2. 비밀번호 확인 입력
3. **"비밀번호 재설정"** 버튼 클릭
4. 성공 메시지 확인: "비밀번호가 성공적으로 변경되었습니다"
5. 자동으로 로그인 화면으로 이동

#### Step 6: 새 비밀번호로 로그인
1. 이메일과 **새 비밀번호**로 로그인
2. 로그인 성공 확인

## 🔧 API 테스트 (고급)

### 전체 플로우 cURL 테스트

```bash
# 1. 인증번호 요청
curl -X POST http://localhost:5001/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email":"simadeit@naver.com"}'

# 응답: {"message": "인증번호가 이메일로 전송되었습니다. (10분간 유효)"}

# 2. 이메일에서 받은 인증번호로 확인 (예: 374144)
curl -X POST http://localhost:5001/api/password-reset/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"simadeit@naver.com","code":"374144"}'

# 응답: {"message": "인증이 완료되었습니다", "verified": true, "reset_id": 1}

# 3. 비밀번호 재설정 (reset_id는 위 응답에서 받은 값)
curl -X POST http://localhost:5001/api/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "email":"simadeit@naver.com",
    "reset_id":1,
    "new_password":"newpassword123"
  }'

# 응답: {"message": "비밀번호가 성공적으로 변경되었습니다", "success": true}

# 4. 새 비밀번호로 로그인 테스트
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"simadeit@naver.com","password":"newpassword123"}'

# 성공 시 access_token 반환
```

## 📊 실시간 로그 모니터링

### 백엔드 로그
```bash
# 전체 로그
tail -f /Users/malife/crossfit-system/backend/logs/crossfit.log

# 비밀번호 재설정 관련만
tail -f /Users/malife/crossfit-system/backend/logs/crossfit.log | grep -i "password\|mail\|인증"
```

### 서버 출력
```bash
tail -f /tmp/backend_server.log
```

## 🔍 데이터베이스 확인

```bash
# PostgreSQL 접속
psql postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit

# 최근 재설정 요청 확인
SELECT id, user_id, email, verification_code, 
       created_at, expires_at, is_used, verified_at 
FROM password_resets 
ORDER BY created_at DESC 
LIMIT 5;

# 특정 이메일의 재설정 이력
SELECT * FROM password_resets 
WHERE email = 'simadeit@naver.com' 
ORDER BY created_at DESC;
```

## ⚠️ 트러블슈팅

### 이메일이 안 온다면?

1. **스팸함 확인** (가장 흔한 이유)
2. **로그 확인**:
   ```bash
   grep -i "mail\|email" /Users/malife/crossfit-system/backend/logs/crossfit.log | tail -20
   ```
3. **환경 변수 확인**:
   ```bash
   cd /Users/malife/crossfit-system/backend
   grep MAIL .env.local
   ```

### "Load failed" 오류가 나온다면?

1. **서버 상태 확인**:
   ```bash
   curl http://localhost:5001/api/health
   ```
2. **브라우저 콘솔 확인** (F12 → Console)
3. **CORS 오류** → 서버 재시작

### 인증번호가 만료되었다면?

- 인증번호는 **10분간만 유효**합니다
- 새 인증번호를 요청하세요

## 📧 예상 이메일 내용

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏋️ WodyBody

비밀번호 재설정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

안녕하세요!

비밀번호 재설정을 위한 인증번호를 
발송해 드립니다.

┌─────────────────────────────┐
│       374144                │
│    (6자리 인증번호)          │
└─────────────────────────────┘

⏰ 주의사항
• 이 인증번호는 10분간 유효합니다.
• 인증번호를 요청하지 않으셨다면, 
  이 메일을 무시하셔도 됩니다.
• 보안을 위해 인증번호를 타인과 
  공유하지 마세요.

감사합니다.
WodyBody 팀
```

## ✅ 테스트 체크리스트

- [ ] 프론트엔드 실행 (npm start)
- [ ] 비밀번호 재설정 페이지 접근
- [ ] 이메일 입력 → 인증번호 전송
- [ ] 이메일 수신 확인 (스팸함 포함)
- [ ] 인증번호 입력 → 인증 성공
- [ ] 새 비밀번호 설정
- [ ] 새 비밀번호로 로그인 성공
- [ ] 비밀번호 변경 알림 이메일 수신

## 🎉 성공 기준

모든 단계가 완료되면:
✅ 이메일로 6자리 인증번호 수신
✅ 인증번호 입력 후 확인 성공
✅ 새 비밀번호 설정 성공
✅ 비밀번호 변경 알림 이메일 수신
✅ 새 비밀번호로 로그인 성공

---

**현재 서버 상태**: ✅ 실행 중  
**이메일 전송**: ✅ 성공  
**테스트 준비**: ✅ 완료

**이제 http://localhost:3000 에서 테스트를 시작하세요!** 🚀

