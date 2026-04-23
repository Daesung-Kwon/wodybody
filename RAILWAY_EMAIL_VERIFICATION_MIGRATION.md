# Railway 이메일 인증 테이블 마이그레이션

## 📋 개요
회원가입 시 이메일 인증 기능을 위한 `email_verifications` 테이블을 Railway PostgreSQL에 생성합니다.

---

## 🚀 실행 방법

### 1️⃣ Railway 연결

터미널을 열고 다음 명령을 실행:

```bash
cd /Users/malife/crossfit-system
export PATH="$HOME/.npm-global/bin:$PATH"
railway connect
```

### 2️⃣ 서비스 선택

프롬프트가 나타나면:
- 화살표 키로 **Postgres** 선택
- Enter 키 입력

### 3️⃣ SQL 실행

psql 프롬프트 (`railway=#`)에서 아래 SQL을 **복사해서 붙여넣기**:

```sql
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_code ON email_verifications(verification_code);
```

### 4️⃣ 성공 확인

다음과 같이 출력되면 성공:

```
CREATE TABLE
CREATE INDEX
CREATE INDEX
```

### 5️⃣ psql 종료

```sql
\q
```

---

## 🔍 테이블 구조 확인 (선택)

psql 프롬프트에서:

```sql
\d email_verifications
```

또는:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_verifications' 
ORDER BY ordinal_position;
```

예상 결과:
```
 column_name       | data_type         | is_nullable
-------------------+-------------------+-------------
 id                | integer           | NO
 email             | character varying | NO
 verification_code | character varying | NO
 created_at        | timestamp         | YES
 expires_at        | timestamp         | NO
 is_used           | boolean           | YES
 verified_at       | timestamp         | YES
```

---

## 🧪 프로덕션 테스트

마이그레이션 완료 후:

### 1. 회원가입 이메일 인증 테스트

```
https://wodybody-web.vercel.app
```

1. 회원가입 클릭
2. 이메일 입력 → 인증번호 전송
3. `no-reply@wodybody.com`에서 이메일 수신 확인
4. 6자리 인증번호 입력
5. 회원가입 완료

### 2. Railway 로그 확인

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
railway logs --tail 50
```

다음 로그 확인:
- ✅ `회원가입 이메일 인증 요청: {email}`
- ✅ `이메일 인증 성공: {email}`
- ✅ `회원가입 완료: {email}`

---

## ⚠️ 문제 해결

### Railway 연결 실패

```bash
# Railway 로그인 다시 시도
railway login

# 프로젝트 연결 확인
railway status
```

### psql 명령 실패

```bash
# PostgreSQL 클라이언트 버전 확인
psql --version

# Homebrew로 재설치 (macOS)
brew reinstall postgresql@15
```

### 테이블이 이미 존재하는 경우

```sql
-- 테이블 확인
\dt email_verifications

-- 테이블 삭제 후 재생성 (주의!)
DROP TABLE IF EXISTS email_verifications;
-- 위의 CREATE TABLE 문 다시 실행
```

---

## 📚 관련 파일

- **마이그레이션 SQL**: `backend/migrations/add_email_verification_table.sql`
- **모델**: `backend/models/email_verification.py`
- **API 라우트**: `backend/routes/email_verification.py`
- **프론트엔드**: `frontend/src/components/MuiRegisterPage.tsx`

---

## 📅 마이그레이션 이력

- **날짜**: 2025-11-01
- **테이블**: `email_verifications`
- **목적**: 회원가입 시 이메일 인증 기능
- **인덱스**: 
  - `idx_email_verifications_email` (email)
  - `idx_email_verifications_code` (verification_code)

---

**마이그레이션 완료!** 🎉

