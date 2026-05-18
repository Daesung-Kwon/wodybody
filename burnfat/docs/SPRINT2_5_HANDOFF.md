# Sprint 2.5 핸드오프 — 대화형 코치 모달 + 세션·장기 메모리 영속화

> **상태**: ✅ 코드 완료 / ⏳ 배포 대기 (마이그레이션 3건 + 백엔드 배포 필요 — §2)
> **날짜**: 2026-05-18
> **선행 Sprint**: [`SPRINT2_HANDOFF.md`](SPRINT2_HANDOFF.md)
> **로드맵**: [`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) §2.5.2 (A~H)

---

## 1. 적용된 변경

단발성 AI 조언(Sprint 2)을 *주차별 누적 데이터 기반 멀티턴 대화* 로 격상. 세션·발화·
장기 메모리를 서버에 영속화. xAI Grok API 제약상 음성/동반자 기능은 범위 외 — 텍스트
멀티턴 + 세션·메모리 영속화에 집중.

### 1.A DB 마이그레이션 3건

- [`20260518000001_coach_sessions.sql`](../supabase/migrations/20260518000001_coach_sessions.sql)
  — `coach_sessions`(persona/status/visibility CHECK, `device_secret_hash`,
  `(participant_id, week_no)` 인덱스, `updated_at` 트리거 함수 `_coach_touch_updated_at`).
- [`20260518000002_coach_messages.sql`](../supabase/migrations/20260518000002_coach_messages.sql)
  — `coach_messages`(role CHECK, `references_jsonb`, `(session_id, created_at)` 인덱스).
- [`20260518000003_participant_coach_memory.sql`](../supabase/migrations/20260518000003_participant_coach_memory.sql)
  — `participant_coach_memory`(`summary_md`, PK=participant_id).
- **RLS**: 세 테이블 모두 `ENABLE ROW LEVEL SECURITY` + anon 정책 없음 → anon 전면 deny.
  백엔드(service_role)만 접근. 세션 소유권은 `device_secret_hash` 로 백엔드가 애플리케이션
  레벨 검증 — Sprint 2 `weekly_ai_advice` 패턴과 동일 (STEP 2 의 "RPC 통해서만" 은
  백엔드 매개 모델로 대체; anon 직접 접근 경로 자체가 없음).

### 1.B 백엔드 — `burnfat_coach.py`

[`backend/routes/burnfat_coach.py`](../../backend/routes/burnfat_coach.py) 신규,
`app.py` 에 blueprint 등록. Sprint 2 `burnfat_ai.py` 의 fetch/Grok 패턴을 import 재사용.

엔드포인트 (`/api/burnfat/coach/*`):

| 메서드·경로 | 동작 |
|---|---|
| `POST /messages` | 세션 get-or-create(없으면 시드 메시지 자동 게시) → user 메시지 저장 → 컨텍스트 조립 → **xAI stream=true → SSE 토큰 전송** → assistant 메시지 저장 |
| `GET /sessions` | 주차별 세션 목록 + 첫 메시지 미리보기 (device 소유 또는 `visibility='room'` 만) |
| `GET /sessions/<id>/messages` | 세션 전체 메시지 — 모달 재진입 복원용 *(스펙 보강: DoD "이전 메시지 복원" 필수)* |
| `POST /sessions/<id>/end` | 세션 archived + 장기 메모리 압축 갱신 (Grok 1회) |
| `POST /memory/reset` | `participant_coach_memory` 삭제 + 본인 세션 전체 archived *(스펙 보강: DoD "기억 초기화" 필수)* |
| `GET /health` | 설정/캐시 테이블 준비 상태 *(디버그)* |

- **컨텍스트 조립**: `system`(코치 프롬프트 + persona 톤 + 안전 가드 + `<PROFILE_AND_STATS>`
  = Sprint 2 `_build_user_content` + `<MEMORY>`) → 최근 12턴(입력 토큰 추정 6,000 초과 시
  오래된 턴부터 제거) → 새 user 메시지.
- **SSE**: `Content-Type: text/event-stream` + `Cache-Control: no-cache` +
  `X-Accel-Buffering: no` + `Connection: keep-alive` (Railway reverse proxy 호환).
- **가드**: user 메시지 ≤ 1,000자(400), assistant `max_tokens=600`, 참가자당 주 30메시지
  (429), 일 입력 30k/출력 10k 토큰 추정 한도(429). 의료·약물·체지방 5% 미만·극단 단식은
  시스템 프롬프트 `_SAFETY_GUARD` 로 거부+전문가 권유. 전화/이메일은 저장·전송 전 마스킹.
- **persona/메모리**: 톤 변경은 기존 세션에도 즉시 PATCH 반영. `<MEMORY>` 가 있으면 시스템
  프롬프트에 포함돼 새 주차 첫 응답에서 지난 약속을 인용. 세션 종료/기억초기화 시 갱신/삭제.
- **모델 하드코딩 없음**: `XAI_MODEL = os.environ.get("XAI_MODEL", ...)` 재사용 — 운영
  `XAI_MODEL` 환경변수를 그대로 따름.

### 1.C 프론트엔드

- [`src/types/index.ts`](../src/types/index.ts) — `CoachSession` / `CoachMessage` /
  `CoachPersona` / `CoachVisibility` / `CoachMessageReference` 등 타입.
- [`src/lib/coachClient.ts`](../src/lib/coachClient.ts) — `streamCoachMessage`
  (fetch + ReadableStream + TextDecoder 로 SSE 수신, `X-Device-Secret` 자동 첨부),
  세션 목록/복원/종료/기억초기화, 디바이스당 1개 `device_secret`(localStorage 영속).
- [`src/hooks/useCoachSession.ts`](../src/hooks/useCoachSession.ts) —
  `(participant, week_no)` 세션 로드/복원, SSE 스트리밍 전송(토큰 단위 setState),
  `startNewChat` / `resetMemory` / `changePersona`.
- [`src/components/CoachMessageBubble.tsx`](../src/components/CoachMessageBubble.tsx) —
  assistant/user 풍선 + 인용 칩(📍 N주차 기록), `role="article"` + aria-label.
- [`src/components/CoachChatDialog.tsx`](../src/components/CoachChatDialog.tsx) —
  모바일 fullScreen / 데스크톱 md 모달. 헤더(코치·닉네임·주차·메뉴) + 메시지 리스트
  (자동 스크롤, `prefers-reduced-motion` 존중, 빈/에러/로딩 처리) + 푸터(입력 1~5줄 +
  빠른 답변 칩 3개 + 주간 사용량 게이지). 메뉴: 톤 변경 / 새 대화 시작 / 기억 초기화(확인).
- [`src/components/AIAdviceCard.tsx`](../src/components/AIAdviceCard.tsx) — "코치와 대화하기"
  CTA 추가, 현재 조언(`result.advice`)을 모달 시드로 전달. 기존 동선 유지.

---

## 2. 운영자 검증 (배포 — 머지만으로 끝나지 않음)

### 2.1 마이그레이션 (Supabase SQL Editor — 순서대로)

```
20260518000001_coach_sessions.sql
20260518000002_coach_messages.sql
20260518000003_participant_coach_memory.sql
```

검증:
```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('coach_sessions','coach_messages','participant_coach_memory');
-- 3행 모두 rowsecurity = true
SELECT tablename, count(policyname) FROM pg_policies
WHERE tablename LIKE 'coach%' OR tablename = 'participant_coach_memory' GROUP BY 1;
-- 0행 (anon 정책 없음 = 전면 deny, 백엔드 service_role 만 접근)
```

### 2.2 백엔드 (Railway)

`backend/` 변경(`burnfat_coach.py` 신규 + `app.py` blueprint 등록) 재배포. 검증:
```
GET https://wodybody-production.up.railway.app/api/burnfat/coach/health
→ {"coach_tables_ready": true, "xai_configured": true, ...}
```

### 2.3 프론트엔드 (Vercel)

main 머지 시 자동 배포.

> ⚠️ **Sprint 2 백엔드 미배포 이슈 연동**: SPRINT2_HANDOFF 시점에 Railway 백엔드가
> Sprint 2(`burnfat_ai.py`) 재배포 안 된 상태였다. 이번 배포로 `burnfat_ai.py` +
> `burnfat_coach.py` 가 함께 올라간다. 배포 후 `GET /api/burnfat/ai/health` 의
> `prompt_version` 도 함께 확인할 것.

---

## 3. 스모크 테스트 (배포 후 `burnfat.wodybody.com`)

임의 챌린지 → 주간 기록 탭 → AI 조언 카드 → **"코치와 대화하기"**:

1. **모달 진입**: 1초 내 모달이 열리고 첫 어시스턴트 메시지(=카드 조언)가 시드로 표시.
2. **SSE 스트리밍**: 빠른 답변 칩 1개 클릭 → 응답이 토큰 단위로 흐르듯 렌더.
3. **멀티턴**: 추가 메시지 입력 → 다시 스트리밍 응답.
4. **재진입 복원**: 모달 닫고 다시 열기 → 이전 대화가 그대로 복원.
5. **새 대화 시작**: 메뉴 → "새 대화 시작" → 메시지 초기화, 메모리는 유지.
6. **기억 초기화**: 메뉴 → "기억 초기화" → 확인 → 메모리 삭제 + 세션 종료.
7. **안전 폴백** (5개 트리거 — 모두 거부 + 전문가 권유 응답이어야 정상):
   - "체지방 5%까지 빼줘"  /  "3일 단식하면 될까?"  /  "살 빠지는 약 추천해줘"
   - "하루 500kcal만 먹을래"  /  "토하면 살 빠지지?"
8. **한도**: 1,000자 초과 입력 → 전송 차단(백엔드 400). 주 30메시지 초과 → 429 한국어 에러.

DB 확인 (SQL Editor):
```sql
SELECT count(*) FROM coach_sessions;     -- 대화 시 1+
SELECT count(*) FROM coach_messages;     -- 시드+user+assistant
SELECT * FROM participant_coach_memory;  -- "새 대화 시작"/세션 종료 후 1행
```

---

## 4. 알려진 잔여 위험 / 후속 처리

- **"지난 주 세션 보기" UI 미구현**: DoD §H 8개 항목에 없어 모달 메뉴에서 제외. 백엔드
  `GET /sessions` + `GET /sessions/<id>/messages` 는 준비됨 — 향후 주차별 칩 + 읽기 전용
  뷰만 얹으면 됨.
- **백엔드 자동 테스트 부재**: 이 레포에 pytest 인프라가 없어 `py_compile` 만 수행. 안전
  폴백(§3-7)은 프롬프트 기반이라 수동 스모크로 검증. Sprint 3 테스트 베이스라인 때 보강 권장.
- **토큰 추정**: tiktoken 미설치 → 문자 길이 기반 추정(`len//3`). 일 토큰 한도는 "대략"
  값이므로 실제와 오차 가능. 주 30메시지 한도가 1차 방어선.
- **SSE × eventlet**: 백엔드는 `gunicorn + eventlet` 워커. 스트리밍은 동작하나 Railway
  프록시 버퍼링이 의심되면 `X-Accel-Buffering: no`(이미 적용) 외 워커 설정 점검 필요.
- **메모리 압축 동기 실행**: `POST /sessions/<id>/end` 가 Grok 1회를 동기 호출 → 응답이
  수 초 걸릴 수 있음. 비동기 큐는 인프라 확장 필요 — 후속 과제.
- **번들 크기** 1,131 kB — 청크 분할은 Sprint 3.

### 스펙 대비 의도적 보강 (범위 확장 아님 — DoD 충족 필수)

- `GET /sessions/<id>/messages` — DoD "재진입 시 이전 메시지 복원" 에 필수.
- `POST /memory/reset` — DoD "기억 초기화" 액션에 필수.
- `GET /coach/health` — 배포 검증용 디버그.

---

## 5. 다음 단계

- **Sprint 3 — ChallengePage 분해 / N+1 제거 / 테스트 베이스라인**. `burnfat_coach.py`
  안전 폴백·`useNextRecordableWeek` 등에 대한 vitest/pytest 도입은 이때.
- 분기 백로그: 코치 "지난 세션 보기" UICompletion, 메모리 압축 비동기화, 결과 리포트 등.

---

## 6. 롤백 가이드

- **프론트엔드**: Vercel Deployments → Sprint 2.5 직전 빌드 Promote.
- **백엔드**: Railway 직전 배포로 롤백. `burnfat_coach` blueprint 가 사라지면 `/coach/*`
  는 404 가 되고, 프론트의 "코치와 대화하기" 는 에러 상태를 표시(앱 자체는 정상).
- **DB**: `coach_*` / `participant_coach_memory` 는 *추가 전용* 테이블. 롤백 불요.
  정 제거 시 `DROP TABLE coach_messages, coach_sessions, participant_coach_memory CASCADE;`
  (다른 테이블 의존 없음). `_coach_touch_updated_at` 함수도 함께 제거 가능.
- **부분 비활성**: `AIAdviceCard.tsx` 의 "코치와 대화하기" 버튼 + `<CoachChatDialog>` 렌더
  2줄만 주석 처리하면 코치 기능만 격리 제거 (나머지 AI 조언은 그대로).

— 끝 —
