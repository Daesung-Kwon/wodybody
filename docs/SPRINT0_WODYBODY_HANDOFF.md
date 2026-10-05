# WODYBODY Sprint 0 / Wave 1 핸드오프

날짜: 2026-08-20
상태: 코드 완료. BurnFat `update_challenge_admin` 마이그레이션은 **SQL Editor에 먼저 적용**.

## 완료 범위

- [x] `?user_id=` / Safari 무서명 헤더·쿠키 / UA `user_id=1` 제거
- [x] `/api/debug/*` 는 `FLASK_ENV=development` 에서만 등록
- [x] Bearer + 로그인 세션만 인정 (`backend/utils/auth.py`)
- [x] `/api/user/profile` Bearer 지원
- [x] 운영 부팅 시 `SECRET_KEY`·PostgreSQL `DATABASE_URL` fail-fast
- [x] Socket.IO: CORS 화이트리스트, connect 시 토큰 검증, 본인 방만 join
- [x] Resend 2xx 성공, 인증코드 평문 로그 제거
- [x] pytest 인증 회귀 + CI skip 제거
- [x] 프런트 react-router, tokenStore (Preferences), Capacitor 플러그인을 웹 번들에 연결
- [x] WS 디버거 프로덕션 비가드 제거
- [x] BurnFat 챌린지 관리 RPC + AI/코치 device_secret
- [x] 백업 `app_*.py` 삭제, 문서 실비밀번호 제거, docs Rick Roll 제거

## 배포 순서

1. Railway 환경변수 확인: `SECRET_KEY`, `DATABASE_URL`(postgresql), `CORS_ORIGINS`에 `https://burnfat.wodybody.com` 포함
2. Supabase SQL Editor에 `burnfat/supabase/migrations/20260820000001_challenge_admin_rpc.sql` 적용
3. 백엔드 배포 → 프런트/BurnFat 배포
4. **계정 `simadeit@naver.com` 비밀번호를 즉시 교체** (문서에 평문으로 들어 있었음)

## 테스트

- `cd backend && python -m pytest tests/ -v`
- `cd frontend && npm test -- --watchAll=false`
- `cd burnfat && npm test`

## 하지 않은 것 (다음 파)

- CRA → Vite + BurnFat 소스 병합 (Wave 2) — 진행됨. Capacitor `webDir` = `frontend/dist`
- refresh token
- Apple `DEVELOPMENT_TEAM` / Android `google-services.json` / 릴리스 서명 (자격증명 필요)
- 참가자 프로필 anon UPDATE, storage 버킷 전체 SELECT
