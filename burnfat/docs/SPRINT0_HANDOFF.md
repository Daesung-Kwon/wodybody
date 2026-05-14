# Sprint 0 핸드오프 — 보안 응급 처치 완료 보고

> **상태**: ✅ 완료  
> **날짜**: 2026-05-14  
> **커밋**: `64315d3` (origin/main)  
> **배포**: Vercel 자동 배포 트리거 완료 → `burnfat.wodybody.com`  
> **DB 적용**: 운영 Supabase 에 3개 마이그레이션 SQL Editor 실행 완료  
> **버킷 Private 화**: `inbody` 버킷 Public 토글 OFF 완료

---

## 1. 적용된 변경 (Sprint 0.1 ~ 0.4)

### 0.1 PIN 해시화 + RPC

- **마이그레이션**: `supabase/migrations/20260514000001_admin_pin_hash.sql`
- **DB 변경**:
  - `pgcrypto` 확장 활성화
  - `challenges.admin_pin_hash TEXT`, `challenges.has_admin_pin BOOLEAN GENERATED ALWAYS AS (admin_pin_hash IS NOT NULL) STORED` 추가
  - 기존 평문 `admin_pin` 값 → bcrypt 해시로 이전 후 평문 컬럼 DROP
  - 컬럼 레벨 GRANT 로 `admin_pin_hash` 를 anon/authenticated SELECT 에서 차단
  - RPC: `verify_admin_pin(uuid, text)`, `create_challenge_with_pin(...)`, `set_admin_pin(uuid, text, text)`
- **클라이언트**:
  - `types/index.ts` — `admin_pin: string | null` → `has_admin_pin: boolean`
  - `pages/CreateChallengePage.tsx` — `supabase.rpc('create_challenge_with_pin', …)`
  - `pages/ChallengePage.tsx` — 클라이언트 PIN 비교 → `supabase.rpc('verify_admin_pin', …)`, `challenge.admin_pin` 참조를 `has_admin_pin` 으로 교체

### 0.2 UPDATE/DELETE 정책 잠그기

- **마이그레이션**: `supabase/migrations/20260514000002_lockdown_writes.sql`
- **DB 변경**:
  - `submissions.device_secret_hash TEXT`, `weekly_logs.device_secret_hash TEXT` 추가
  - 익명 UPDATE 정책 모두 DROP (DELETE 는 처음부터 없음 → 기본 deny 유지)
  - 헬퍼 함수 `public._sha256_hex(text)` 추가
  - RPC `update_submission(...)`, `update_weekly_log(...)` — 24h 윈도우 + device_secret SHA-256 일치 검증
- **클라이언트**:
  - 신규 `src/lib/deviceSecret.ts` — 32B 랜덤 plain 생성 + Web Crypto SHA-256 + localStorage(`burnfat:device:<table>:<row_id>`)
  - `components/SubmitModal.tsx` — INSERT 시 `prepareDeviceSecret('submissions')` 호출, plain 은 INSERT 성공 후 persist
  - `components/WeeklyLogForm.tsx` — 동일하게 `prepareDeviceSecret('weekly_logs')`
  - `hooks/useWeeklyLogs.ts` — `update` 함수가 RPC 사용, localStorage 시크릿 없으면 한국어 에러 throw

### 0.3 이미지 signed URL 전환

- **마이그레이션**: `supabase/migrations/20260514000003_signed_image_url.sql`
- **DB 변경**: `storage.objects` 의 inbody 관련 public read 정책 정리, `burnfat_inbody_anon_insert/select/update` 정책 재정의
- **운영 작업**: Supabase Dashboard → Storage → `inbody` 버킷의 "Public bucket" 토글 OFF ✅ 완료
- **클라이언트**:
  - 신규 `src/lib/signedImage.ts` — path 추출 + `createSignedUrl(7일)` + 메모리 캐시. 레거시 public/sign URL 자동 호환.
  - `components/SubmitModal.tsx` — `image_url` 에 `getPublicUrl()` 대신 **storage path** 만 저장 (예: `<participant_id>/start-<ts>.jpg`)
  - `pages/ChallengePage.tsx` — "보기" 버튼이 onClick 시 `resolveImageUrl(s.image_url)` 호출 후 새 탭 open

### 0.4 디버그 플래그 환경변수화

- **클라이언트**: `pages/ChallengePage.tsx`
  - `DEBUG_SHOW_RANKING = (import.meta.env.VITE_DEBUG_SHOW_RANKING ?? '').toLowerCase() === 'true'`
  - `DEBUG_ALLOW_EARLY_END_SUBMIT` 동일 패턴
- **`.env.example`**: 디버그 플래그 항목 주석 추가
- **운영**: Vercel 환경 변수 미설정 = `false` 처리, 운영에서 토글 안전

---

## 2. 운영자가 직접 수행한 검증 (Supabase SQL Editor)

다음 3개 SQL 조회 결과로 확인 완료:

```sql
-- 1) 평문 PIN 컬럼이 사라졌는지
SELECT column_name FROM information_schema.columns
WHERE table_name='challenges' AND column_name IN ('admin_pin','admin_pin_hash','has_admin_pin');
-- → admin_pin_hash, has_admin_pin 만 존재 (admin_pin 없음) ✅

-- 2) RPC 등록 확인
SELECT routine_name FROM information_schema.routines
WHERE routine_schema='public' AND routine_name LIKE '%pin%';
-- → verify_admin_pin, create_challenge_with_pin, set_admin_pin ✅

-- 3) submissions/weekly_logs 의 익명 UPDATE 정책 부재
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname='public' AND tablename IN ('submissions','weekly_logs');
-- 결과:
--   submissions  | Allow anonymous read submissions    | SELECT
--   submissions  | Allow anonymous insert submissions  | INSERT
--   weekly_logs  | Allow anonymous read weekly_logs    | SELECT
--   weekly_logs  | Allow anonymous insert weekly_logs  | INSERT
-- UPDATE 정책 없음 ✅
```

---

## 3. 프로덕션 스모크 테스트 시나리오

운영 환경(`burnfat.wodybody.com`)에서 실행할 시나리오. **순서대로 수행** 권장.

### S1. PIN 보호가 서버에서 검증되는지

1. `/create` 에서 새 챌린지 생성:
   - 제목: `보안 테스트 1`
   - 시작일: 오늘, 종료일: 7일 뒤
   - PIN: `1234`
2. 생성된 챌린지 페이지 진입 → "순위" 탭
3. "중간 공개" 버튼 클릭 → PIN 다이얼로그
4. `0000` 입력 → "PIN이 올바르지 않습니다." 토스트 확인
5. `1234` 입력 → "중간 순위가 공개되었습니다" 토스트 + 버튼 라벨이 "순위 잠금" 으로 변경
6. (선택, SQL Editor) `SELECT verify_admin_pin('<challenge_id>', '1234');` → `true`

**예상 동작**: 클라이언트 코드에 PIN 평문이 등장하지 않으며, 모든 검증이 서버 측 `verify_admin_pin` RPC 를 통해 일어남.

### S2. PIN 해시가 클라이언트에 노출되지 않는지

1. 위에서 만든 챌린지에 다시 진입
2. 브라우저 DevTools → **Network** 탭 → "Preserve log" 켜고 새로고침
3. `…/rest/v1/challenges?…` GET 응답을 열어 JSON 확인

**예상**: `admin_pin`, `admin_pin_hash` 키가 **없음**. `has_admin_pin: true` 만 노출.

### S3. 이미지 signed URL 동작

1. 챌린지에 참가자 1명 추가 후 "시작일 인증" → 인바디 사진 업로드 + 마스킹 + 체지방률 입력
2. 인증 카드의 작은 "보기" 버튼 클릭
3. 새 탭에 열리는 URL 확인

**예상 URL 형식**:
```
https://<project>.supabase.co/storage/v1/object/sign/inbody/<participant_id>/start-<ts>.jpg?token=…
```
- `/object/sign/` 경로 + `?token=…` 쿼리스트링이 핵심.
- `/object/public/` 이면 버킷이 아직 Private 가 아님 → 운영 작업 누락.

4. Supabase Dashboard → Storage → `inbody` 버킷 표시에 "Private" 뱃지 확인.

### S4. UPDATE 잠금 (직접 PostgREST 변조 시도)

목표: 익명 키로 다른 사람의 submission/weekly_log 를 임의 변경 시도가 *실패해야* 정상.

1. DevTools Console 에서 (anon key 는 `.env` 또는 Network 탭에서 확보):
   ```js
   const URL = '<VITE_SUPABASE_URL>';
   const KEY = '<VITE_SUPABASE_ANON_KEY>';
   // 임의 submission id (DevTools Network 에서 GET 응답으로 확보)
   const targetId = '<some-submission-id>';
   const res = await fetch(`${URL}/rest/v1/submissions?id=eq.${targetId}`, {
     method: 'PATCH',
     headers: {
       apikey: KEY,
       Authorization: `Bearer ${KEY}`,
       'Content-Type': 'application/json',
       Prefer: 'return=minimal',
     },
     body: JSON.stringify({ body_fat_rate: 1.0 }),
   });
   console.log(res.status, await res.text());
   ```
2. **예상**: HTTP `404` 또는 `403` (RLS 미일치로 0 rows 갱신). `204` 가 나오면 안 됨.

### S5. 디버그 플래그 비활성

1. 종료일이 미래인 챌린지에서 "종료일 인증" 버튼 클릭
2. **예상**: "종료일(...) 이후에 인증이 가능합니다." 스낵바 표시 (= `DEBUG_ALLOW_EARLY_END_SUBMIT=false` 정상 적용).

---

## 4. 알려진 잔여 위험 / 후속 처리

- **레거시 이미지 URL**: Sprint 0 이전에 생성된 `submissions.image_url` 행은 *공개 URL 형식*. `resolveImageUrl()` 이 path 추출 후 재서명하므로 표시는 동작. 다만 **버킷을 Private 화한 순간 기존 URL 을 그대로 외부에 공유했다면 그 URL 은 더 이상 동작하지 않음**. (의도된 보안 강화 — 별도 알림 불요.)
- **submission 수정 UI 부재**: 현재 UI 에 submission 의 수정 진입점이 없음. `update_submission` RPC 는 준비됐으나 호출처가 없는 상태. 향후 수정 기능 도입 시 device_secret 검증이 자동 적용.
- **weekly_logs 수정 UI 부재**: 동일. `useWeeklyLogs.update` 는 RPC 기반으로 동작 가능하나 호출 UI 없음. Sprint 1.5 에서 *수정 진입점* 도입 시 즉시 활성화됨.
- **bcrypt cost factor 10**: 운영 부하 무리 없음. 향후 사용자 증가 시 12 로 상향 검토 가능.

---

## 5. 다음 단계 (다음 Claude Code 세션이 이어받을 작업)

1. **루트의 `CLAUDE.md` 부터 읽기.**
2. **이 문서(`SPRINT0_HANDOFF.md`) 와 `burnfat/docs/IMPROVEMENT_REPORT_2026-05.md` 읽기.**
3. **다음 Sprint 선정**: 사용자가 명시하지 않았다면 **Sprint 1.5 (주간 기록 입력 UX 정상화)** 권장.
   - 진입 파일: `burnfat/src/components/ParticipantWeeklyLogCard.tsx` (L48-60 에서 빈 상태일 때만 CTA 노출하는 구조적 버그), `burnfat/src/components/WeeklyLogForm.tsx` (L66-68 의 weekNo 자동 세팅), 신규 hook `burnfat/src/hooks/useNextRecordableWeek.ts`.
4. 작업 종료 시 새 핸드오프 문서(`SPRINT1_5_HANDOFF.md` 등) 작성 + 본 보고서의 Sprint 표 업데이트.

---

## 6. 빠른 롤백 가이드 (만약 운영 사고 시)

**비상 시 다음 순서로 롤백 가능**:

1. **Vercel**: Deployments 에서 직전 안정 버전(`b98a41e`) 으로 *Promote to Production* — UI 즉시 복구.
2. **DB**: Sprint 0 마이그레이션은 *생성형* 변경이 많아 일괄 롤백은 위험. 대신 핵심 차단을 풀고 싶다면:
   ```sql
   -- 임시: weekly_logs 익명 UPDATE 복구 (보안 약화 — 응급용)
   CREATE POLICY "Allow anonymous update weekly_logs" ON weekly_logs
     FOR UPDATE USING (true) WITH CHECK (true);
   -- submissions 동일
   CREATE POLICY "Allow anonymous update submissions" ON submissions
     FOR UPDATE USING (true) WITH CHECK (true);
   ```
3. **Storage**: 버킷 Public 토글을 다시 ON. (단, 그 즉시 signed URL 발급이 의미를 잃습니다.)

— 끝 —
