# Sprint 2 핸드오프 — 제품 가치 확장

> **상태**: ✅ 코드 완료 / ⏳ 배포 대기 (마이그레이션 + 백엔드 배포 필요 — §4)
> **날짜**: 2026-05-15
> **선행 Sprint**: [`SPRINT1_HANDOFF.md`](SPRINT1_HANDOFF.md)
> **로드맵**: [`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) §6 Sprint 2

---

## 1. 목표

제품 가치 확장 3종. **Sprint 0 이후 처음으로 백엔드·DB 변경을 포함**한다
(AI 캐시). 배포 순서에 무관하도록 모든 신규 경로를 graceful degrade 처리.

---

## 2. 적용된 변경

### 2.1 AI 조언 서버 캐시 + JSON 구조화 응답

- **신규 마이그레이션** [`20260515000001_weekly_ai_advice.sql`](../supabase/migrations/20260515000001_weekly_ai_advice.sql)
  — `weekly_ai_advice(participant_id, week_no, prompt_version, advice_md, advice_json, model, …)`.
  `UNIQUE(participant_id, week_no, prompt_version)`. RLS ON + anon 정책 없음 → anon 전면 deny,
  백엔드(service_role)만 접근.
- **백엔드** [`backend/routes/burnfat_ai.py`](../../backend/routes/burnfat_ai.py) 재작성:
  - Grok 응답을 단일 문자열 → **JSON 구조화**(`{summary, action_items[], cautions[]}`).
    `response_format: json_object` + 시스템 프롬프트 스키마 강제. 파싱 실패 시 평문 폴백.
  - **서버 캐시**: `(participant_id, week_no, prompt_version)` 키로 read-through + upsert.
    신선도는 `updated_at` 기준 24h TTL. `force_refresh` / 사용자 추가 입력 시 캐시 우회.
    사용자 추가 입력(개인 맞춤) 응답은 공용 캐시에 저장하지 않음.
  - `week_no` 는 챌린지 `start_date` 기준 서버 계산.
  - **graceful degrade**: 캐시 테이블이 없거나(마이그레이션 미적용) 일시 오류여도 조언 생성은
    그대로 동작 (캐시 read/write 를 try/except 로 감쌈).
  - **입력 가드**: `user_context` 500자 컷, `advice_style`/`advice_goal` 화이트리스트.
  - 응답에 `advice`(평문) 필드 유지 → 구버전 클라이언트 호환.
- **프론트엔드**:
  - [`edgeFunctions.ts`](../src/lib/edgeFunctions.ts) — `AIAdviceResponse` 에 `structured`/`cached`/
    `weekNo` 추가. 구버전 백엔드(구조화 필드 없음)면 `structured=null` → 평문 폴백.
  - [`useAIAdvice.ts`](../src/hooks/useAIAdvice.ts) — **localStorage 디바이스 캐시 제거**
    (서버 캐시가 대체, "공동 모니터링" 콘셉트와 일치). `result` 객체 반환.
  - [`AIAdviceCard.tsx`](../src/components/AIAdviceCard.tsx) — `summary` / 이번 주 실천 /
    주의 섹션 분할 렌더(`StructuredAdviceView`). 평문 폴백 유지. 캐시 hit 캡션.

### 2.2 목표 체지방률 진행률 위젯

- **신규** [`src/lib/goalProgress.ts`](../src/lib/goalProgress.ts) — 순수 함수
  `computeGoalProgress(start, current, target)` → 진행률 0~100 + 도달 여부 + 남은 %p.
- **신규** [`src/components/GoalProgressWidget.tsx`](../src/components/GoalProgressWidget.tsx)
  — 시작/현재/목표 3점 게이지(`LinearProgress` + a11y). 목표 미설정 시 빈 상태 + 설정 버튼.
- `ChallengePage` Tab 2 상단에 식별된 "나"(Sprint 1 `myParticipant`)에 대해 고정 노출.

### 2.3 챌린지 생성 템플릿

- **신규** [`src/lib/challengeTemplates.ts`](../src/lib/challengeTemplates.ts) — 4/8/12주
  프리셋(참가비 5만/10만/20만) + `templateEndDate(start, weeks)` 순수 함수(UTC 결정적).
- **신규** [`src/components/ChallengeTemplatePicker.tsx`](../src/components/ChallengeTemplatePicker.tsx)
  — 프리셋 카드 3종(`CardActionArea` + `aria-pressed`).
- [`CreateChallengePage.tsx`](../src/pages/CreateChallengePage.tsx) — 폼 상단에 picker.
  선택 시 종료일·참가비 자동 채움. 시작일 변경 시 종료일 재계산. 값 직접 수정 시 선택 해제.

---

## 3. 검증

- `npx tsc --noEmit` — 클린.
- `npm run build` — 성공 (번들 1,116 kB).
- `npm test` — **44/44 통과** (goalProgress 8 + challengeTemplates 7 + challengeSchedule 11 +
  prizeDistribution 6 + useNextRecordableWeek 12).
- `python3 -m py_compile backend/routes/burnfat_ai.py` — 클린.

---

## 4. 배포 절차 (운영자 수행 — 중요)

Sprint 2 는 **DB + 백엔드 변경을 포함**한다. 권장 순서:

### 4.1 마이그레이션 적용 (Supabase SQL Editor)

`burnfat/supabase/migrations/20260515000001_weekly_ai_advice.sql` 전체를 SQL Editor 에 붙여
실행. 검증:

```sql
-- 테이블 + RLS 확인
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'weekly_ai_advice';
-- → weekly_ai_advice | true

-- anon 정책이 없어야 함 (백엔드 service_role 만 접근)
SELECT policyname FROM pg_policies WHERE tablename = 'weekly_ai_advice';
-- → 0 rows
```

### 4.2 백엔드 배포 (Railway)

`backend/routes/burnfat_ai.py` 변경이 포함된 커밋을 Railway 가 자동 배포. 배포 후:

```
GET https://wodybody-production.up.railway.app/api/burnfat/ai/debug
→ "weekly_ai_advice_ready": true  (마이그레이션 적용됐으면)
GET .../api/burnfat/ai/health
→ "prompt_version": "sprint2-json-v1"
```

### 4.3 프론트엔드 배포 (Vercel)

main 머지 시 자동 배포.

### 4.4 배포 순서 무관성 (안전망)

- **마이그레이션 < 백엔드**: 캐시 read/write 가 try/except 로 감싸여 테이블이 없어도 조언은 동작
  (캐시만 미적용). 마이그레이션을 나중에 적용해도 안전.
- **백엔드 < 프론트 또는 프론트 < 백엔드**: 백엔드는 항상 `advice` 평문을 반환하고,
  프론트는 구조화 필드가 없으면 평문 폴백 → 어느 쪽이 먼저 배포돼도 깨지지 않음.

---

## 5. 알려진 잔여 위험 / 후속 처리

- **캐시 무효화는 24h TTL + week_no 키 + 강제 새로고침**만으로 처리. weekly_logs INSERT/UPDATE
  시 같은 주차 캐시를 *즉시* 무효화하는 DB 트리거는 **Sprint 2.5 (§2.5.1)** 범위 — 그때 도입.
  현재는 주중에 기록을 추가해도 24h 안에는 캐시된 조언이 나올 수 있음("새로 받기"로 우회 가능).
- **JSON 응답 강제**: `response_format: json_object` 미지원 모델로 `XAI_MODEL` 을 바꾸면 파싱
  폴백이 평문을 `summary` 로 넣는다 — 동작은 유지되나 섹션 분할이 안 됨. 현재 기본 모델은 지원.
- **공용 캐시 vs 개인 맥락**: 사용자 추가 입력 응답은 캐시에 저장하지 않으므로 친구가 보는
  캐시는 항상 일반 조언. 의도된 동작 (Sprint 2.5 코치 세션이 개인 맥락 영속화 담당).
- **목표 진행률 위젯은 식별된 "나"에게만** 노출 (Sprint 1 localStorage 식별 의존). 미식별
  사용자는 위젯이 안 보임 — 참가자별 카드에 분산 노출은 향후 검토.
- **번들 크기** 1,116 kB — 청크 분할은 Sprint 3.
- **테스트**: 순수 lib 함수만 vitest. 백엔드 Python 은 이 레포에 pytest 인프라가 없어 미검증
  (`py_compile` 만). 컴포넌트는 Sprint 3 jsdom 도입 시.

---

## 6. 다음 단계

1. **Sprint 2.5 — 대화형 코치 모달**. `weekly_ai_advice` 캐시·JSON 스키마·서버 피처
   엔지니어링이 본 Sprint 로 깔렸으므로 자연스럽게 이어짐. 신규 마이그레이션
   `coach_sessions`/`coach_messages`/`participant_coach_memory`, `burnfat_coach.py`, SSE 스트리밍.
2. **Sprint 3 — ChallengePage 분해 / N+1 제거 / 테스트 베이스라인**.

각 Sprint DoD 는 `IMPROVEMENT_REPORT_2026-05.md` 해당 섹션 기준.

---

## 7. 빠른 롤백 가이드

- **프론트엔드**: Vercel Deployments → Sprint 2 직전 빌드(Sprint 1 커밋 `c3d61a6`) Promote.
- **백엔드**: Railway 에서 직전 배포로 롤백 → 구버전 `burnfat_ai.py`(평문 응답) 복귀. 프론트가
  구버전 백엔드여도 평문 폴백하므로 프론트 롤백 없이 백엔드만 롤백해도 안전.
- **DB**: `weekly_ai_advice` 는 *추가 전용* 테이블이라 롤백 불요. 정 제거하려면
  `DROP TABLE weekly_ai_advice;` (다른 테이블 의존 없음). 캐시 데이터만 사라지며 기능 영향 없음.
- **부분 비활성**: 목표 위젯/템플릿은 순수 클라이언트 — `ChallengePage`/`CreateChallengePage`
  에서 해당 컴포넌트 렌더 줄만 주석 처리하면 격리 제거.

— 끝 —
