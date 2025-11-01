# Railway 데이터베이스 마이그레이션 가이드

## ✅ 준비 완료
- Railway CLI 설치 완료 ✅

## 🚀 추천 방법: railway connect (대화형)

### 1. Railway 연결

```bash
cd /Users/malife/crossfit-system
export PATH="$HOME/.npm-global/bin:$PATH"
railway connect
```

### 2. 서비스 선택
- 화살표 키로 **Postgres** 선택 후 Enter

### 3. SQL 실행
psql 프롬프트 (`railway=#`)에서 SQL 파일 내용을 복사해서 붙여넣기

**비밀번호 재설정 테이블:**
```sql
CREATE TABLE IF NOT EXISTS password_resets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(150) NOT NULL,
    verification_code VARCHAR(6) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user_id ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_password_resets_code ON password_resets(verification_code);
```

**이메일 인증 테이블:**
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

### 4. 종료
```sql
\q
```

## 📋 대체 방법: railway run psql (비대화형)

로그인 및 프로젝트 연결이 완료된 상태에서:

```bash
export PATH="$HOME/.npm-global/bin:$PATH"
cd /Users/malife/crossfit-system
cat backend/migrations/add_password_reset_table.sql | railway run psql
```

⚠️ 주의: 여러 서비스가 있는 경우 서비스 선택 프롬프트가 나타날 수 있습니다.

## ✅ 성공 확인

마이그레이션이 성공하면 다음과 같이 표시됩니다:

```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
```

## 🔍 테이블 생성 확인 (선택)

```bash
railway run psql -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'password_resets' ORDER BY ordinal_position;"
```

예상 결과:
```
 column_name       | data_type
-------------------+-------------------
 id                | integer
 user_id           | integer
 email             | character varying
 verification_code | character varying
 created_at        | timestamp
 expires_at        | timestamp
 is_used           | boolean
 verified_at       | timestamp
```

## ⚠️ 문제 해결

### 로그인 실패 시
```bash
# Railway CLI 재설치
npm uninstall -g @railway/cli
npm install -g @railway/cli
```

### 프로젝트 연결 실패 시
```bash
# 기존 연결 해제
railway unlink

# 다시 연결
railway link
```

### psql 명령 실패 시
```bash
# Railway 환경 변수 확인
railway variables

# DATABASE_URL이 설정되어 있는지 확인
```

## 📊 배포 후 테스트

마이그레이션 완료 후:

1. **Railway 로그 확인**
   ```bash
   railway logs
   ```

2. **API 테스트**
   ```bash
   curl https://wodybody-production.up.railway.app/api/health
   ```

3. **비밀번호 재설정 테스트**
   - https://wodybody-web.vercel.app 접속
   - "비밀번호를 잊으셨나요?" 클릭
   - 전체 플로우 테스트

---

**준비 완료! 위 명령어들을 터미널에서 실행하세요!** 🚀

