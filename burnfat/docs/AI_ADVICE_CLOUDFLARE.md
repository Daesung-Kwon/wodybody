# AI 조언 - Cloudflare Workers AI 설정

> 일 10,000 Neurons 무료 · OpenAI 대체

---

## 1. Worker 배포

```bash
# workers/ai-advice로 이동
cd workers/ai-advice

# 의존성 설치 (최초 1회)
npm install

# Supabase 시크릿 설정 (배포 전 필수)
wrangler secret put SUPABASE_URL
# 입력: https://your-project.supabase.co

wrangler secret put SUPABASE_SERVICE_ROLE_KEY
# 입력: eyJ... (Supabase 대시보드 → Settings → API → service_role)

# 배포
npm run deploy
```

배포 완료 시 출력되는 URL 예: `https://burnfat-ai-advice.<account>.workers.dev`

---

## 2. 프론트엔드 환경 변수

`.env`에 추가:

```
VITE_AI_ADVICE_URL=https://burnfat-ai-advice.<account>.workers.dev
```

빌드 후 배포:

```bash
npm run build
npm run deploy
```

---

## 3. 루트에서 한 번에 배포

```bash
# AI Worker 먼저 배포
npm run deploy:ai

# 프론트엔드 배포
npm run deploy
```

---

## 4. 로컬 테스트

```bash
cd workers/ai-advice

# .dev.vars 생성 (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
cp .dev.vars.example .dev.vars
# .dev.vars 편집

# 로컬 실행
npm run dev
```

로컬 URL: `http://localhost:8787`

프론트엔드 `.env`에 `VITE_AI_ADVICE_URL=http://localhost:8787` 설정 후 테스트.

---

## 5. 사용 모델

- **@cf/meta/llama-3.1-8b-instruct-fp8-fast**
- 일 10,000 Neurons 무료 (소규모 사용 시 충분)
- 초과 시 Workers Paid 플랜 필요 ($0.011/1,000 Neurons)
