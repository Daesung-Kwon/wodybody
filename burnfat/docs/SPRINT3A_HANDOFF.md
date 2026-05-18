# Sprint 3 Phase A 핸드오프 — 저위험 인프라 정리 완료 보고

> **상태**: ✅ 완료 (코드)
> **날짜**: 2026-05-18
> **커밋**: `c27626f` (origin/main)
> **배포**: Vercel 자동 배포 트리거 (burnfat) / Railway 자동 재배포 (백엔드)
> **DB 적용 필요**: `20260601000001_challenges_public_view.sql` 1건 — 운영자가 SQL Editor 에서 직접 실행 (§3)

Phase A 는 **저위험 인프라 정리** 만 다룬다. `ChallengePage` 분해 / 기존 훅 테스트 작성 / Playwright 는
Phase B 범위이며 본 작업에서 손대지 않았다.

---

## 1. 적용된 변경

### A1. 배포 토폴로지 정리

- **루트 `railway.json`**: `startCommand` 를 `cd backend && python app.py` →
  gunicorn(`--worker-class eventlet -w 1 ... app:socketio`) 으로 변경. 루트 `railway.toml`·`Procfile`
  과 일관성 확보.
- **`README.md`**: 끝부분에 "## 배포 매트릭스" 섹션 추가 — 브랜치별 Vercel/Railway 배포 대상 표.
- **⚠️ `backend/railway.{json,toml,yml}` 3개 파일 삭제는 보류했다.** 사유: Railway 서비스의
  Root Directory 가 `/backend` 로 설정돼 있어, `backend/railway.toml`(및 `backend/railway.json`)
  이 **현재 실제 사용 중인 활성 배포 설정**이다. 자동 삭제 시 프로덕션 배포가 깨질 수 있어
  운영자 판단이 필요하다. 처리 방안은 §4 참고.

> 참고: Root Directory 가 `/backend` 이므로 루트의 `railway.json`/`railway.toml`/`Procfile` 은
> 현재 Railway 에서 사용되지 않는다. A1 의 루트 `railway.json` 변경은 *향후 일관성·혼선 방지용
> 정리*이며, 현 시점 프로덕션 동작에는 영향이 없다.

### A2. `challenges_public` VIEW 도입

- **마이그레이션**: `supabase/migrations/20260601000001_challenges_public_view.sql`
  - `public.challenges_public` VIEW — 공개 9개 컬럼만 노출(`id, code, title, start_date,
    end_date, stake_amount, ranking_unlocked, has_admin_pin, created_at`).
  - `security_invoker = true` — 호출자(anon) 의 RLS·GRANT 를 그대로 상속.
  - `GRANT SELECT ... TO anon, authenticated`.
- **목적**: Sprint 0 의 컬럼 레벨 GRANT(`admin_pin_hash` 차단) 와 클라이언트 `.select('*')` 가
  충돌해 페이지 전체가 403 으로 죽는 회귀(SPRINT0_HANDOFF §3.5) 를 **구조적으로 차단**.
  VIEW 는 `admin_pin_hash` 를 애초에 포함하지 않으므로 `.select('*')` 가 안전하다.
- **클라이언트**:
  - `src/types/index.ts` — `CHALLENGE_PUBLIC_COLUMNS` 상수에 `@deprecated` JSDoc 추가
    (호환 위해 당분간 유지, Sprint 4 에서 제거 검토).
  - `src/pages/ChallengePage.tsx` `fetchChallenge` — `.from('challenges').select(CHALLENGE_PUBLIC_COLUMNS)`
    → `.from('challenges_public').select('*')`. 이제 미사용이 된 `CHALLENGE_PUBLIC_COLUMNS` import 제거.
  - `src/pages/CreateChallengePage.tsx` — 코드 중복 확인 SELECT 도 `challenges_public` 로 일관 적용.
  - UPDATE(`ChallengePage` 의 챌린지 편집·`ranking_unlocked` 토글) 는 VIEW 가 read-only 이므로
    그대로 base 테이블 `.from('challenges')` 를 사용한다.

### A3. 운영 안전망 (`backend/routes/burnfat_ai.py`, `backend/routes/burnfat_coach.py`)

- **BE-1 — XAI_MODEL 부팅 검증** (`burnfat_ai.py`)
  - 모듈 로드 시 1회 `GET https://api.x.ai/v1/models` 호출(`_validate_model()`).
  - `XAI_MODEL` 이 응답 목록에 없으면 경고 로그 후 `XAI_MODEL_FALLBACK`(기본 `grok-2-1212`)
    으로 자동 전환. `XAI_MODEL` 전역도 교체해 `burnfat_coach.py` 등 import 측이 폴백을 사용.
  - 모듈 상태 `_model_validated: bool`, `_active_model: str` 추가.
  - 키 미설정·네트워크 오류 시 검증은 graceful skip(`_model_validated=False`, 설정값 유지).
- **BE-2 — Grok 오류 응답 본문 캡처**
  - `burnfat_ai._call_grok` 과 `burnfat_coach._stream_grok` 의 `raise_for_status()` 직전,
    `if not resp.ok:` 일 때 `resp.status_code` + 본문 500자를 `logger.error` 로 기록.
- **BE-3 — `last_advice_success_at`**
  - `burnfat_ai` 모듈 레벨 `_last_advice_success_at: datetime | None` + 공유 세터 `_mark_advice_success()`.
  - `/ai/advice` 의 두 200 응답 직전(캐시 히트·신규 생성 모두), 그리고 `burnfat_coach` 의
    `/coach/messages` SSE 완료 시점에 세터 호출.
- **`/ai/health` 응답에 신규 3개 키 노출**: `model_validated`, `active_model`, `last_advice_success_at`.

### A4. Vitest 인프라 셋업

- `package.json` devDeps 에 `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` 추가
  (`vitest`·`test`/`test:watch` 스크립트는 Sprint 1.5 에서 이미 도입됨).
- `vitest.config.ts` — `environment: 'node'` → `'jsdom'`, `setupFiles: ['./src/test/setup.ts']`,
  `globals: true`.
- `src/test/setup.ts` — `@testing-library/jest-dom` 매처 등록.
- 샘플 테스트 `src/lib/__tests__/deviceSecret.test.ts` — `generateDeviceSecret`(64자 hex·유일성),
  `hashDeviceSecret`(결정성·해시 형식) 검증. jsdom 의 Web Crypto 노출도 함께 확인.
- `.github/workflows/burnfat.yml` — build step 다음에 "Test (Vitest)" step(`npm test`) 추가.
- **검증**: `npm test` → 6 파일 / 48 테스트 통과(기존 44 + 신규 4). `tsc --noEmit` 0 exit.

> ⚠️ 실제 훅/컴포넌트 테스트 작성은 Phase B 범위. Phase A 는 인프라만 깔고 샘플 1개로 동작 확인.

---

## 2. 운영자 검증 절차

### V1. VIEW 마이그레이션 적용 확인 (§3 실행 후)

```sql
-- VIEW 존재 + security_invoker 확인
SELECT table_name FROM information_schema.views
WHERE table_schema='public' AND table_name='challenges_public';
-- → challenges_public 1행

-- anon 으로 VIEW 조회가 되는지 (admin_pin_hash 미포함이라 select('*') 안전)
SELECT * FROM public.challenges_public LIMIT 1;
```

### V2. burnfat 프런트 스모크 (`burnfat.wodybody.com`)

1. 기존 챌린지 코드로 페이지 진입 → 정상 로드(403 회귀 없음).
2. `/create` 에서 새 챌린지 생성 → 코드 중복 확인·생성 정상 동작.
3. DevTools Network 에서 `…/rest/v1/challenges_public?…` 응답에 `admin_pin`/`admin_pin_hash`
   키가 **없고** `has_admin_pin` 만 있는지 확인.

### V3. 백엔드 health (Railway 재배포 Ready 후)

```bash
curl -s https://<railway-host>/api/burnfat/ai/health | jq
```
응답에 신규 3개 키가 노출되어야 한다:
- `model_validated` — `true`(검증 성공) 또는 `false`(키/네트워크 사유로 skip).
- `active_model` — 실제 사용 모델. `XAI_MODEL` 이 잘못됐다면 `grok-2-1212` 등 폴백값.
- `last_advice_success_at` — 최초엔 `null`, `/ai/advice` 또는 `/coach/messages` 1회 성공 후 ISO8601.

Railway 로그에서 부팅 시 `XAI model validated: ...` 또는 `XAI_MODEL ... not in available models`
경고 라인을 확인.

### V4. gunicorn 전환 확인 (`backend/railway.toml` startCommand 변경 후)

A1 후속 정리에서 활성 설정 `backend/railway.toml` 의 startCommand 를 `python app.py`(Flask
개발 서버) → gunicorn 으로 교체했다. 재배포 후 다음을 확인:

- Railway 배포 로그에서 `WARNING: This is a development server` / `Werkzeug appears to be used
  in a production deployment` 경고가 **사라졌는지** 확인.
- gunicorn worker 시작 로그(`Starting gunicorn ...`, `Booting worker with pid ...`) 가 찍히는지 확인.
- 동시 5개 요청을 보내 모두 `200` 응답하는지 확인:
  ```bash
  for i in $(seq 5); do
    curl -s -o /dev/null -w "%{http_code}\n" \
      https://wodybody-production.up.railway.app/api/burnfat/ai/health &
  done; wait
  ```
  → `200` 5개가 출력되어야 한다.

---

## 3. 운영자가 실행할 SQL (Supabase SQL Editor)

> 새 마이그레이션은 자동 실행되지 않는다. 아래 파일 내용을 SQL Editor 에 붙여 실행.

**파일**: `burnfat/supabase/migrations/20260601000001_challenges_public_view.sql`

```sql
CREATE OR REPLACE VIEW public.challenges_public AS
  SELECT id, code, title, start_date, end_date, stake_amount,
         ranking_unlocked, has_admin_pin, created_at
  FROM public.challenges;

ALTER VIEW public.challenges_public SET (security_invoker = true);

GRANT SELECT ON public.challenges_public TO anon, authenticated;
```

- idempotent(`CREATE OR REPLACE`) — 재실행 안전.
- 적용 즉시 클라이언트의 `challenges_public` 조회가 동작한다. 적용 전이라면 페이지 진입이
  "대결을 찾을 수 없습니다." 로 실패하므로 **프런트 배포보다 먼저 또는 함께 적용**할 것.

---

## 4. 알려진 잔여 / 후속 처리

- **`backend/railway.{json,toml,yml}` 미삭제**: Root Directory 가 `/backend` 라서 자동 삭제를 보류함.
  운영자 결정 필요 — 두 가지 선택지:
  1. **(권장)** Railway 서비스 Root Directory 를 `/` 로 변경 → 루트 `railway.toml`/`Procfile` 이
     활성화됨(둘 다 gunicorn) → 그 후 `backend/railway.*` 3개 안전 삭제.
  2. Root Directory 를 `/backend` 로 유지한다면, 활성 설정인 `backend/railway.toml` 의
     `startCommand` 가 현재 `python app.py`(Flask 개발 서버)다. 운영 안정성을 위해 gunicorn 으로
     맞추는 것을 권장(루트와 동일 명령). 이 경우 `backend/railway.json`·`railway.yml` 은 중복이라 제거 가능.
  → 어느 쪽이든 Railway 대시보드 작업이 동반되어 본 작업 범위 밖. 운영자가 결정 후 진행.
- **`origin/backend` 브랜치 archive**: 폐기 대상이나 자동 삭제하지 않았다. 운영자 확인 후 결정.
- **`CHALLENGE_PUBLIC_COLUMNS` 상수**: `@deprecated` 표기 후 호환을 위해 잔존. 더 이상 참조처가
  없으므로 Sprint 4 에서 상수·`Challenge` 인터페이스 동기화와 함께 제거 검토.
- **`fetchParticipants` 등 잔여 `.select('*')`**: `participants`/`submissions`/`weekly_logs` 는
  아직 컬럼 레벨 GRANT 가 없어 동작하나, 향후 보안 강화 시 같은 회귀 위험. 필요 시 동일하게
  `*_public` VIEW 패턴 적용 권장(SPRINT0_HANDOFF §3.5 백로그와 동일 맥락).

---

## 5. 다음 단계 — Sprint 3 Phase B 예고

Phase B 는 **구조 개편**이 핵심이며 회귀 위험이 Phase A 보다 크다.

1. **`ChallengePage` 분해** — `useChallengeData` hook 으로 fetch 통합, Supabase 임베드 쿼리로
   N+1(참가자별 `submissions` 개별 조회) 제거, 3개 탭을 컴포넌트로 분리.
2. **테스트 베이스라인** — Phase A 에서 깐 Vitest jsdom 인프라 위에 기존 훅 3종 테스트 작성,
   Playwright E2E 1개, CI 배선.
3. **분석 이벤트** — PostHog/Plausible 도입, 핵심 5개 이벤트만 계측.

진입 시 루트 `CLAUDE.md` → 본 문서 → `IMPROVEMENT_REPORT_2026-05.md` Sprint 3 섹션 순으로 읽을 것.

---

## 6. 롤백 가이드

- **프런트(A2)**: VIEW 도입 전으로 되돌리려면 `ChallengePage.fetchChallenge`/`CreateChallengePage`
  를 `.from('challenges').select(CHALLENGE_PUBLIC_COLUMNS)` 로 환원(상수는 그대로 존재). VIEW 자체는
  남겨둬도 무해. 긴급 시 Vercel Deployments 에서 직전 배포로 *Promote to Production*.
- **VIEW 마이그레이션**: 문제 시 `DROP VIEW IF EXISTS public.challenges_public;`. 단, 프런트가
  이미 VIEW 를 참조하도록 배포됐다면 프런트 롤백을 먼저 한 뒤 DROP 할 것.
- **백엔드(A3)**: BE-1/2/3 은 진단·로깅·graceful 동작이라 기능 회귀 위험이 낮다. 부팅 검증의
  네트워크 호출이 문제되면 `XAI_API_KEY` 미설정 시 자동 skip 되며, 강제로 끄려면 `_validate_model()`
  호출 라인(모듈 말미)을 주석 처리 후 재배포. 긴급 시 Railway 에서 직전 배포로 롤백.
- **A1 루트 `railway.json`**: Root Directory 가 `/backend` 인 현 상태에선 루트 파일이 비활성이라
  롤백 불요(프로덕션 무영향).

— 끝 —
