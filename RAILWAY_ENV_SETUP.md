# Railway 환경 변수 설정 가이드

**중요**: 백엔드 배포 전에 반드시 이 환경 변수를 설정해야 합니다!

---

## 🔑 필수 환경 변수

### FRONTEND_URLS

**설명**: WebSocket CORS 허용 도메인 목록 (쉼표로 구분)

**설정값 예시**:
```
https://crossfit-frontend-abc123.vercel.app,http://localhost:3000
```

**주의사항**:
- ⚠️ 쉼표 앞뒤에 공백 없이 입력
- ⚠️ 프로토콜 포함 (https:// 또는 http://)
- ⚠️ 실제 Vercel 도메인으로 교체 필요

---

## 📋 설정 방법

### 방법 1: Railway 대시보드 (권장)

1. **Railway 대시보드 접속**
   - https://railway.app 로그인
   - 프로젝트 선택

2. **백엔드 서비스 선택**
   - 왼쪽 사이드바에서 백엔드 서비스 클릭

3. **Variables 탭으로 이동**
   - 상단 탭에서 "Variables" 클릭

4. **새 변수 추가**
   - "+ New Variable" 버튼 클릭
   - 변수명: `FRONTEND_URLS`
   - 값: (아래에서 본인의 Vercel 도메인 확인 후 입력)

5. **저장**
   - 자동으로 저장되며 다음 배포 시 적용됨

---

### 방법 2: Railway CLI

```bash
# Railway CLI 설치 (이미 설치되어 있으면 생략)
npm i -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 연결 (프로젝트 디렉토리에서)
railway link

# 환경 변수 설정
railway variables set FRONTEND_URLS="https://your-vercel-app.vercel.app,http://localhost:3000"

# 설정 확인
railway variables
```

---

## 🔍 Vercel 도메인 확인 방법

### Vercel 대시보드에서 확인

1. **Vercel 대시보드 접속**
   - https://vercel.com 로그인
   - 프론트엔드 프로젝트 선택

2. **Domains 탭 확인**
   - 상단 탭에서 "Domains" 선택
   - "Production" 도메인 복사
   - 예시: `crossfit-frontend-abc123.vercel.app`

3. **전체 URL 복사**
   - https:// 포함해서 복사: `https://crossfit-frontend-abc123.vercel.app`

### 현재 배포된 URL 확인

프론트엔드 브랜치가 이미 배포되어 있다면:
```bash
# Vercel CLI로 확인
cd frontend
vercel ls
```

---

## 📝 설정 예시

### 예시 1: 단일 프로덕션 도메인

```
FRONTEND_URLS=https://crossfit-app.vercel.app
```

### 예시 2: 프로덕션 + 로컬 개발

```
FRONTEND_URLS=https://crossfit-app.vercel.app,http://localhost:3000
```

### 예시 3: 여러 도메인 (커스텀 도메인 포함)

```
FRONTEND_URLS=https://crossfit-app.vercel.app,https://www.myapp.com,http://localhost:3000
```

---

## ✅ 설정 확인

### Railway 대시보드에서 확인
1. Variables 탭에서 `FRONTEND_URLS` 변수가 표시되는지 확인
2. 값이 올바른지 확인

### Railway CLI로 확인
```bash
railway variables | grep FRONTEND_URLS
```

**예상 출력**:
```
FRONTEND_URLS=https://crossfit-app.vercel.app,http://localhost:3000
```

---

## 🔄 변경 사항 적용

환경 변수를 추가/수정한 후:

### 자동 재배포 (권장)
- Railway는 환경 변수 변경 시 자동으로 재배포되지 않음
- Git push로 배포 트리거 필요:
```bash
git commit --allow-empty -m "chore: trigger redeploy"
git push
```

### 수동 재배포
Railway 대시보드:
1. Deployments 탭 선택
2. "Deploy" 버튼 클릭

---

## 🐛 문제 해결

### CORS 에러가 계속 발생하는 경우

1. **환경 변수 형식 확인**
   ```bash
   railway variables | grep FRONTEND_URLS
   ```
   - 쉼표 앞뒤에 공백이 없는지 확인
   - https:// 프로토콜이 포함되어 있는지 확인

2. **Vercel 도메인 확인**
   - 복사한 도메인이 정확한지 확인
   - 브라우저에서 해당 도메인이 열리는지 확인

3. **재배포**
   ```bash
   git commit --allow-empty -m "chore: fix CORS"
   git push
   ```

4. **Railway 로그 확인**
   ```bash
   railway logs | grep "CORS allowed origins"
   ```
   - 올바른 도메인이 로드되는지 확인

---

## 📌 주의사항

### ❌ 잘못된 설정 예시

```bash
# 공백이 있는 경우 (잘못됨)
FRONTEND_URLS=https://app.vercel.app, http://localhost:3000

# 프로토콜 누락 (잘못됨)
FRONTEND_URLS=app.vercel.app,localhost:3000

# 따옴표 포함 (잘못됨)
FRONTEND_URLS="https://app.vercel.app","http://localhost:3000"
```

### ✅ 올바른 설정

```bash
# 공백 없이, 프로토콜 포함, 따옴표 없이
FRONTEND_URLS=https://app.vercel.app,http://localhost:3000
```

---

## 📚 추가 정보

### 다른 환경 변수들

이미 설정되어 있어야 하는 환경 변수들:
- `DATABASE_URL` - PostgreSQL 연결 URL (Railway가 자동 설정)
- `SECRET_KEY` - Flask 세션 암호화 키
- `RAILWAY_ENVIRONMENT` - Railway가 자동 설정

확인:
```bash
railway variables
```

---

**✅ 설정 완료 후 백엔드를 배포하세요!**

다음 단계: `WEBSOCKET_DEPLOY_GUIDE.md` 참고

