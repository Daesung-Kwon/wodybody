# BurnFat V2 배포 가이드

## 1. DB 마이그레이션

Supabase SQL Editor에서 아래 마이그레이션을 실행하세요:

```bash
# supabase/migrations/20250225000001_v2_weekly_logs_and_participants.sql 내용 실행
```

또는 Supabase CLI 사용 시:

```bash
supabase db push
```

## 2. Edge Function 배포 (AI 조언)

```bash
# OpenAI API 키를 Supabase Secrets에 설정
supabase secrets set OPENAI_API_KEY=sk-...

# ai-advice 함수 배포
supabase functions deploy ai-advice
```

## 3. SPA 배포 (Cloudflare Pages)

```bash
npm run build
wrangler pages deploy dist --project-name=burnfat
```

## 4. 환경 변수

| 변수 | 위치 | 용도 |
|------|------|------|
| VITE_SUPABASE_URL | .env (프론트) | Supabase 프로젝트 URL |
| VITE_SUPABASE_ANON_KEY | .env (프론트) | Supabase 익명 키 |
| OPENAI_API_KEY | Supabase Secrets | Edge Function용 OpenAI API 키 |

## 5. Edge Function URL

프론트엔드에서 Edge Function을 호출할 때 `VITE_SUPABASE_URL`이 `https://xxx.supabase.co` 형태라면,  
Functions URL은 `https://xxx.supabase.co/functions/v1/ai-advice` 입니다.

`src/lib/edgeFunctions.ts`에서 자동으로 변환합니다.
