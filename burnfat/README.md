# BurnFat

체지방 감량 다이어트 내기 MVP 서비스.

**v1.0.0** - 초기 버전 (2025.03)

## 중요 공지 (2026-04)

- BurnFat는 이제 wodybody 레포의 `burnfat/` 디렉터리에서 통합 운영됩니다.
- 기존 단독 BurnFat 저장소(`/Users/malife/burnfat`)는 sunset 상태이며 더 이상 유지보수하지 않습니다.
- 새 기준 저장소: [`Daesung-Kwon/wodybody`](https://github.com/Daesung-Kwon/wodybody) (하위 `burnfat/`)

## 최근 변경

- `주간 기록` 탭 최초 진입 시, Grok 기반 AI 조언 고도화(유료 크레딧/개인화 전략) 안내 팝업을 하루 1회 표시합니다.
- 팝업에는 기존 단독 BurnFat 저장소 유지보수 종료 및 wodybody 통합 안내가 포함됩니다.

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
2. SQL Editor에서 `docs/supabase-setup.sql` 실행 후 `supabase/migrations/` 를 순서대로 적용
3. Storage에서 `inbody` 버킷 생성 — **Private** ("Public bucket" OFF).
   이미지는 public URL 이 아니라 signed URL 로만 표시된다 (아래 보안 모델 참고).
4. `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 설정

## 보안 모델 (2026-10 RLS lockdown)

BurnFat 에는 로그인이 없다. 대결방 코드(`/c/:code`)가 방의 공유 비밀이다.

- anon(공개) 키로 `challenges` / `participants` / `submissions` / `weekly_logs` 테이블을
  **직접 읽거나 쓰지 않는다**. 모든 접근은 방 코드를 요구하는 SECURITY DEFINER RPC 를
  거친다 (`src/lib/roomApi.ts`, 마이그레이션 `20261006000001_room_scoped_rpcs.sql`).
  RPC 는 `device_secret_hash` / `admin_pin_hash` 를 반환하지 않는다.
- 직접 테이블 권한은 `20261006000002_lockdown_room_reads.sql` 에서 회수된다.
  service_role 을 쓰는 Railway 백엔드(`backend/routes/burnfat_*.py`)와 Edge Function 은 영향 없음.
- 기존 기록 수정은 디바이스 시크릿 RPC(`update_submission` / `update_weekly_log`),
  대결 설정은 PIN RPC(`update_challenge_admin` 등) 그대로.
- `inbody` 버킷은 Private. 표시용 URL 은 Railway 백엔드 `POST /api/burnfat/images/sign` 이
  방 코드를 확인한 뒤 service key 로 1시간짜리 signed URL 을 발급한다
  (`backend/routes/burnfat_images.py`). anon 은 `<participant_id>/<파일>` 경로로 신규 업로드만
  가능하고 목록 조회·서명·덮어쓰기는 불가 (`20261006000003_inbody_storage_narrowing.sql`).
- 롤아웃 순서·롤백: `supabase/rollback/README.md`. 로컬 검증: `supabase/tests/run_local.sh`.

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
