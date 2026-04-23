# BurnFat 🔥

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
| Backend | Supabase (PostgreSQL + Storage) |
| Hosting | Cloudflare Pages |

- 상세 기술 문서: [docs/TECH.md](docs/TECH.md)

## 로컬 실행

```bash
# 의존성 설치
npm install

# .env 생성 (Supabase URL, Anon Key 입력)
cp .env.example .env

# 개발 서버
npm run dev
```

## Supabase 설정

1. [Supabase](https://supabase.com) 프로젝트 생성
2. SQL Editor에서 `docs/supabase-setup.sql` 실행
3. Storage에서 `inbody` 버킷 생성 (Public)
4. `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정

## 배포 (Cloudflare Pages)

1. GitHub 저장소에 push
2. Cloudflare Pages > Create project > Connect Git
3. Build: `npm run build`, Output: `dist`
4. 환경 변수: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

## 라이선스

Private
