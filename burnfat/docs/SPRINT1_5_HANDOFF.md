# Sprint 1.5 핸드오프 — 주간 기록 입력 UX 정상화

> **상태**: ✅ 완료
> **날짜**: 2026-05-14
> **선행 Sprint**: [`SPRINT0_HANDOFF.md`](SPRINT0_HANDOFF.md) (보안 응급 처치)
> **로드맵**: [`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) §6 Sprint 1.5

---

## 1. 해결한 문제

`ParticipantWeeklyLogCard.tsx` 는 `logs.length === 0` 일 때만 "주간 기록 입력" CTA 를 노출했다. 그 결과:

- 1개라도 기록한 참가자는 다음 차주 입력 진입점이 사라졌다.
- 친구가 대신 채워주는 *공동 입력 콘셉트*가 깨졌다.
- 핵심 데이터 자산인 *주차별 누적 기록*이 입력 마찰로 비어 갔다.

또한 `WeeklyLogForm` 의 `weekNo` 기본값이 *오늘 기준 주차*로 고정되어, 같은 주차 중복 입력 시도가 잦았고 유니크 제약 위반 에러로 폼이 막혔다.

---

## 2. 적용된 변경

### 2.1 신규 hook — `useNextRecordableWeek`

**파일**: [`burnfat/src/hooks/useNextRecordableWeek.ts`](../src/hooks/useNextRecordableWeek.ts)

5-state state machine 으로 입력 가능 여부를 단일화.

| status                    | 의미                                                              | suggestedWeekNo         |
|---------------------------|-------------------------------------------------------------------|-------------------------|
| `before_start`            | 챌린지 시작일 이전                                                | null                    |
| `after_end`               | 챌린지 종료일 이후                                                | null                    |
| `ready`                   | 챌린지 진행 중 + 이번 주 기록 미작성                              | currentWeek             |
| `caught_up`               | 이번 주 기록 완료 + 과거 미입력 주차 있음 (백필 권유)             | missingWeeks[0] (과거)  |
| `already_done_this_week`  | 이번 주 + 과거까지 모두 완료                                      | null                    |

`missingWeeks` = `1..currentWeek` 중 logs 에 없는 주차의 오름차순 배열.

순수 계산 함수 `computeNextRecordableWeek({ logs, challengeStartDate, challengeEndDate, today? })` 를 hook 본체와 분리해 노드 환경에서 단위 테스트 가능. `getCtaLabel(result)` 과 `isCtaActionable(result)` 는 UI 가 일관된 카피·활성 상태를 쓰도록 함께 제공.

### 2.2 단위 테스트 — Vitest 최소 셋업

**신규 파일**:
- [`burnfat/vitest.config.ts`](../vitest.config.ts) — node 환경, `src/**/*.test.ts(x)`.
- [`burnfat/src/hooks/useNextRecordableWeek.test.ts`](../src/hooks/useNextRecordableWeek.test.ts) — 12 케이스, 모든 status 분기 + 경계 케이스(시작/종료 당일, 로그 순서 뒤섞임, currentWeek clamp) 검증.
- `package.json` — `vitest` devDep + `test`/`test:watch` 스크립트.

```
$ npm test
✓ src/hooks/useNextRecordableWeek.test.ts (12 tests) 4ms
Test Files  1 passed (1)
     Tests  12 passed (12)
```

> Sprint 3 의 "테스트 베이스라인" 작업에서 jsdom + `@testing-library/react` + Playwright 까지 확장 예정. 지금은 *주차 계산이라는 핵심 도메인 로직* 만 보호 라인을 깐다.

### 2.3 `ParticipantWeeklyLogCard.tsx` — 영구 CTA + 미입력 주차 placeholder

**파일**: [`burnfat/src/components/ParticipantWeeklyLogCard.tsx`](../src/components/ParticipantWeeklyLogCard.tsx)

- 카드 우측 상단에 **항상** CTA 버튼이 노출된다. 라벨/색/활성 상태는 `useNextRecordableWeek` 결과로부터:
  - `ready` → primary contained, `"N주차 기록 입력"`
  - `caught_up` → warning contained, `"지난 N주차 채우기"` (또는 `"지난 N개 주차 채우기"` 다건)
  - `already_done_this_week` → disabled outlined, `"다음 주에 입력 가능"`, 툴팁 안내
  - `before_start` / `after_end` → disabled outlined, 사유 툴팁 안내
- 기록 리스트 하단에 *미입력 주차*를 dashed `warning.50` 박스로 placeholder 행으로 표시. 각 행에 인라인 `"입력하기"` 버튼 → 해당 주차로 폼 진입.
- `onOpenLogForm` 시그니처를 `(weekNo?: number) => void` 로 확장 (인자 생략 시 hook 제안값 사용).

### 2.4 `WeeklyLogForm.tsx` — 초기 주차 우선순위 + 충돌 주차 차단

**파일**: [`burnfat/src/components/WeeklyLogForm.tsx`](../src/components/WeeklyLogForm.tsx)

- 신규 prop `defaultWeekNo?: number`. 초기 `weekNo` 결정 우선순위: ① `defaultWeekNo` → ② `existingWeekNos` 에 없는 가장 이른 주차 → ③ 오늘 기준 주차.
- 기존 `useEffect([challengeStartDate, recordedAt])` 이 마운트 직후 초기값을 덮어쓰는 버그 제거. 날짜→주차 연결은 `handleRecordedAtChange` onChange 핸들러로 이동. 새 날짜의 파생 주차가 이미 입력된 주차면 weekNo 를 바꾸지 않아 충돌 회피.
- 주차 `<Select>` 의 이미 채워진 옵션은 `disabled` + `"(입력됨)"` 라벨로 시각화 → 사용자가 충돌 주차를 선택하는 경로 자체를 차단.

### 2.5 `useRecordStatus` + `RecordStatusSummary` — 누적 입력률 막대

**파일**:
- [`burnfat/src/hooks/useRecordStatus.ts`](../src/hooks/useRecordStatus.ts)
- [`burnfat/src/components/RecordStatusSummary.tsx`](../src/components/RecordStatusSummary.tsx)

훅 반환에 `cumulativeFillRate`, `totalFilledCells`, `totalPossibleCells` 추가. 가능 셀 수 = `참가자 수 × currentWeek`. 컴포넌트는 `LinearProgress` 막대 + `"67% · 8/12"` 캡션으로 시즌 전체 데이터 충실도를 표시. `aria-valuenow`/`aria-valuemin`/`aria-valuemax` + `role="group"` + 라벨 지정.

### 2.6 `ChallengePage.tsx` — 진입점 와이어링

**파일**: [`burnfat/src/pages/ChallengePage.tsx`](../src/pages/ChallengePage.tsx)

- `weeklyLogParticipant` state → `weeklyLogTarget: { participant, defaultWeekNo? }` 로 확장. 폼 진입 시 hook 제안 또는 placeholder 클릭 주차를 함께 보관.
- `<WeeklyLogForm defaultWeekNo={...} />` 전달.
- `<RecordStatusSummary>` 에 누적 입력률 props 전달.

---

## 3. DoD 체크 (IMPROVEMENT_REPORT Sprint 1.5)

- [x] 1개 이상 주간 기록이 있는 참가자 카드에서 "다음/지난 주차 입력" CTA 가 항상 보인다.
- [x] 미입력 주차가 placeholder 행으로 노출되고 인라인 입력이 가능하다.
- [x] `WeeklyLogForm` 진입 시 충돌 가능한 주차는 처음부터 선택 불가.
- [x] `useNextRecordableWeek` 유닛 테스트(Vitest) 통과 — 12/12.

추가로 통과한 정성 항목:

- `tsc --noEmit` 클린.
- `npm run build` 클린 (기존 번들 크기 경고만, 청크 분할은 Sprint 3 작업).

---

## 4. 알려진 잔여 위험 / 후속 처리

### 4.0 인지된 위험 (운영자 인지용)

- **타임존 경계**: `weekUtils` 는 `new Date(startDate)` (UTC 자정) 과 `new Date()` (로컬 시각) 을 함께 사용한다. KST 의 자정 ~ 09:00 구간에서 currentWeek 계산이 하루 단위로 흔들릴 수 있음 — Sprint 0 이전부터 존재하는 동작이며 Sprint 1.5 가 새로 만든 위험은 아니다. Sprint 3 의 *주차 계산 서버 이관* 시점에 정리.
- **`recordedAt` 과 `weekNo` 비동기 상태**: 사용자가 폼에서 *이미 입력된 주차에 해당하는 날짜*로 기록일을 바꾸면, weekNo 는 자동 갱신되지 않고 기존 값을 유지한다(충돌 회피). 의도된 동작이지만 *날짜와 주차가 안 맞아 보이는* 시각적 부조화가 생길 수 있다. 필요 시 향후 `helperText` 로 "이 날짜는 N주차로 자동 매핑되지만, N주차가 이미 입력되어 다른 주차를 선택하세요" 같은 안내 추가.
- **테스트 커버리지 한계**: vitest 가 *순수 계산 함수* 만 검증하며, MUI 렌더링·이벤트 핸들러·a11y 속성은 아직 자동 검증되지 않는다. Sprint 3 의 jsdom + Playwright 도입 시 커버.

### 4.1 백필 권고 토스트 (IMPROVEMENT_REPORT 2.5.5)

> "챌린지 진입 시 *내 미입력 주차*가 2개 이상이면 1회 토스트"

이 기능은 *내 참가자 식별* — 즉 Sprint 1 의 "개인 상태 카드" + `participantIdentity.ts` 가 도입된 다음에야 의미가 있다. 지금 *어떤 참가자든 미입력이 많을 때* 무차별 토스트를 띄우면 노이즈만 늘어난다. Sprint 1 진행 시 자연스럽게 같은 PR 에 묶어 들이는 것이 깔끔하다.

이미 `useNextRecordableWeek({status, missingWeeks})` 가 노출되므로, Sprint 1 에서 *내 participant id* 를 알게 되면 한 줄 `if (mine && mine.missingWeeks.length >= 2) setToast(...)` 로 연결 가능하다.

### 4.2 Realtime 갱신 / 주간 자동 알림

IMPROVEMENT_REPORT Sprint 1.5 의 "선택 기능". 백엔드/푸시 인프라 확장이 필요하므로 Sprint 2~2.5 범위 외 추후로.

---

## 5. 빠른 검증 시나리오 (배포 후)

운영 환경 `burnfat.wodybody.com` 에서 챌린지를 1개 선택해 다음을 확인.

### S1. 영구 CTA — 1개 이상 로그가 있는 참가자

1. 주간 기록 탭 진입.
2. 1주차만 입력된 참가자 카드 → 우상단에 `"2주차 기록 입력"` (primary contained) 버튼이 보이는지.
3. 클릭 → 폼이 *2주차 선택 상태*로 열리는지.

### S2. 백필 placeholder

1. 2주차만 입력된 참가자(1주차 비어 있음) → 카드 본문 하단에 `"1주차 · 미입력"` placeholder 노출.
2. placeholder 의 `"입력하기"` 클릭 → 폼이 *1주차 선택 상태*로 열리는지.

### S3. 충돌 주차 차단

1. 1·2주차 모두 입력된 참가자 카드의 CTA → 라벨이 `"다음 주에 입력 가능"` (disabled) 인지.
2. 폼을 다른 경로(예: AIAdviceCard 의 빈 데이터 CTA)로 열어 주차 Select 펼침 → 1주차/2주차 옵션이 `(입력됨)` 으로 disabled 인지.

### S4. 누적 입력률 막대

1. 참가자 3명 × 3주차 진행 챌린지 → 총 가능 셀 9, 실제 입력 5개라면 막대 `"56% · 5/9"`.
2. 모바일 VoiceOver 로 막대에 포커스 → `"누적 입력률, 56퍼센트"` 류로 읽히는지.

### S5. 종료된 챌린지

1. 종료일 지난 챌린지 → CTA 라벨 `"기록 기간 종료"`, disabled. 툴팁에 사유.

---

## 6. 다음 단계 후보 (다음 세션이 이어받을 일)

1. **Sprint 1 — UX 빠른 승** (개인 상태 카드 + D-Day 칩 + 랭킹 공유 이미지 + a11y 1차 패스). 진입 파일: `ChallengePage.tsx` Tab 0 상단, 신규 `src/lib/participantIdentity.ts`. *백필 토스트(§4.1) 를 이 PR 에 같이 묶기*.
2. **Sprint 2 — AI 조언 서버 캐시 + JSON 응답 / 목표 진행률 / 챌린지 템플릿**.
3. **Sprint 2.5 — 대화형 코치 모달**. 신규 마이그레이션 `coach_sessions` / `coach_messages` / `participant_coach_memory`.

각 Sprint 의 DoD 는 `IMPROVEMENT_REPORT_2026-05.md` 의 해당 섹션 기준.

---

## 7. 빠른 롤백 가이드 (만약 회귀 시)

Sprint 1.5 는 **순수 클라이언트 변경**으로, DB 마이그레이션·RLS 정책·Storage 권한·환경 변수·외부 API 어느 것도 건드리지 않았다. 운영 데이터(`weekly_logs` 행)와 호환 가능하므로 단순 코드 롤백으로 회수 가능하다.

1. **Vercel 단독 롤백 (권장 — 60초 이내)**
   - Vercel Dashboard → Deployments → Sprint 1.5 직전 안정 빌드(Sprint 0 핫픽스 커밋 `2ac266d`) 를 *Promote to Production*.
   - 사용자에게는 즉시 직전 동작(영구 CTA·placeholder 부재)으로 되돌아간다. DB 정합성은 유지.

2. **소스 레벨 revert (Vercel 권한이 없거나 main 자체를 되돌리고 싶을 때)**
   - `git revert <Sprint 1.5 commit SHA>` 후 main 에 푸시 — Vercel 이 자동 재배포.
   - revert 커밋은 단일이므로 Sprint 0 핫픽스(`2ac266d`) 는 그대로 유지된다.

3. **부분 롤백 (특정 컴포넌트만 회수)**
   - 거의 필요 없을 가능성이 크지만, 예) "placeholder 표시가 사용자에게 혼란을 줬다" → `ParticipantWeeklyLogCard.tsx` 안의 `next.missingWeeks.map(...)` 블록만 제거.
   - 영구 CTA 자체는 유지하고 *백필 placeholder만 끄는* 결정도 가능 (한 줄 주석으로 차단).

4. **데이터 회수 불요**
   - Sprint 1.5 는 새 행을 만들지 않는다(`WeeklyLogForm.handleSubmit` 의 INSERT 동작은 그대로). 따라서 *데이터 정정·삭제 작업은 필요 없음*.

— 끝 —
