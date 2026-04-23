# BurnFat

체지방 감량 다이어트 내기 MVP 서비스.

**v1.0.0** - 초기 버전 (2025.03)

## 프로젝트 개요

- **기간**: 2.23 ~ 3.23
- **지표**: 체지방율 감소량
- **인증**: 동일 인바디 기기 측정 후, 인쇄물 사진 업로드 + 체지방률 입력

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | Vite + React + TypeScript + MUI |
| Data | Supabase (PostgreSQL + Storage) |
| AI 조언 | wodybody Flask(Railway) → xAI Grok 프록시 |
| Hosting | Vercel (`burnfat.wodybody.com`) |

- 상세 기술 문서: [docs/TECH.md](docs/TECH.md)
- 배포 가이드: [docs/DEPLOY.md](docs/DEPLOY.md)

## 로컬 실행

```bash
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 입력
npm run dev
```

## Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `docs/supabase-setup.sql` 실행
3. Storage에서 `inbody` 버킷 생성 (Public)
4. `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정

## 배포 (Vercel)

1. Vercel 프로젝트 생성 → GitHub 저장소 연결, **Root Directory = `burnfat`**
2. Framework: Vite, Build: `npm run build`, Output: `dist`
3. 환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - AI URL을 덮어쓸 때만 `VITE_AI_ADVICE_URL` 설정 (기본값은 Railway 프록시)
4. 커스텀 도메인: `burnfat.wodybody.com`

## AI 조언 (Grok)

- 프론트 → `POST https://wodybody-production.up.railway.app/api/burnfat/ai/advice`
- 백엔드 코드: 루트 레포의 `backend/routes/burnfat_ai.py`
- 필요한 Railway 환경 변수: `XAI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `CORS_ORIGINS`에 `https://burnfat.wodybody.com` 포함

## 라이선스

Private
