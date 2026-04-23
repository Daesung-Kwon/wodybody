# BurnFat V2 배포 가이드 (레거시)

> **이 문서는 V2 기획 시점의 초기 배포 메모입니다.** 당시 후보였던 Supabase Edge Functions / Cloudflare Pages / Wrangler 는 **더 이상 사용하지 않습니다**.
>
> **최종 운영 배포 가이드는 [DEPLOY.md](DEPLOY.md)** 를 참고하세요.  
> 최종 구성: **Vercel(`burnfat.wodybody.com`)** + **Supabase** + **Railway Flask(`/api/burnfat/ai/advice`, xAI Grok 프록시)**.

---

## (참고) 당시 초안 단계

1. **DB 마이그레이션**: Supabase SQL Editor에서 `supabase/migrations/20250225000001_v2_weekly_logs_and_participants.sql` 실행.
2. **AI 조언**: 초안에서는 Supabase Edge Function(`ai-advice`)을 검토했으나, 최종은 wodybody Flask(Railway)의 **xAI Grok 프록시**로 대체됨.
3. **SPA 배포**: Cloudflare Pages / Wrangler 경로는 폐기, **Vercel Git Integration** 으로 대체.

## 현재 환경 변수

| 변수 | 위치 | 용도 |
|------|------|------|
| `VITE_SUPABASE_URL` | Vercel (프론트) | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel (프론트) | Supabase anon / publishable key |
| `VITE_AI_ADVICE_URL` (선택) | Vercel (프론트) | 기본값(Railway 프록시)을 덮어쓸 때만 |
| `XAI_API_KEY` | Railway (백엔드) | xAI Grok API 키 |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Railway (백엔드) | 서버측 Supabase REST 호출 |
| `CORS_ORIGINS` | Railway (백엔드) | `https://burnfat.wodybody.com` 포함 |
