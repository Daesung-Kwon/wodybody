# Sprint 3 Phase B 핸드오프 — 구조 개편(ChallengePage 분해) 완료 보고

> **상태**: ✅ 완료 (코드)
> **날짜**: 2026-05-19
> **커밋**: (push 시 SHA 기입)
> **배포**: Vercel 자동 배포 트리거 (burnfat) — DB/백엔드 변경 없음
> **DB 적용 필요**: 없음 (마이그레이션·RPC·스키마 무변경)

Phase B 는 **기능 보존 리팩터**다. 코드 동작 추가/제거 없이 `ChallengePage` 메가 컴포넌트를
분해하고, N+1 쿼리를 제거하고, 훅·lib 단위 테스트를 작성했다.

---

## 1. 적용된 변경

### B1. `ChallengePage` 분해

`src/pages/ChallengePage.tsx` 를 **1,262줄 → 345줄** (약 73% 감소) 로 줄이고, 책임을
신규 11개 파일로 분리했다.

| 신규 파일 | 책임 |
|-----------|------|
| `hooks/useChallengeData.ts` | challenge + participants(+submissions) + weekly_logs 통합 페치, ranking 파생, 로딩 경과 타이머 |
| `theme/rankAnimations.ts` | 인라인 sx keyframes → `styled()` 추출 (`EndAuthButton`/`RankOneRow`/`RankMedal`) |
| `components/ChallengeHeader.tsx` | 제목·기간·코드·D-Day 칩·수정/복사 버튼 |
| `components/ChallengeTabs.tsx` | sticky 3-탭 바 |
| `components/ParticipantsTabHeader.tsx` | Tab 0 *탭 바 위* 영역 — 개인 상태 카드 / 참가 폼 |
| `components/ParticipantsTab.tsx` | Tab 0 참가자 카드 목록 (인증 버튼) |
| `components/RankingTab.tsx` | Tab 1 순위 — 진행 상태·중간 공개 토글·순위표·결과 공유 |
| `components/WeeklyLogsTab.tsx` | Tab 2 주간 기록 — 요약·차트·참가자별 카드 |
| `components/AdminPinDialog.tsx` | PIN 다이얼로그 + `verify_admin_pin` RPC |
| `components/ChallengeEditDialog.tsx` | 챌린지 기본정보 수정 |
| `components/ChallengeOverlays.tsx` | 탭을 가로지르는 모달·다이얼로그·스낵바 레이어 (표현 전용) |

분해 후 `ChallengePage` 의 역할: `useChallengeData` 호출 → 4개 파생 훅 배선 →
탭/오버레이 상태 조율 → 헤더·탭·오버레이 렌더.

> ⚠️ **DoD ≤100줄 미달성 (실제 345줄).** 8개 오버레이 모달이 탭을 가로질러
> 트리거되므로(예: `SubmitModal` 은 Tab 0 카드·개인 상태 카드·종료 임박 모달에서 모두 호출)
> 상태·핸들러를 페이지에 두는 것이 충실한 보존이다. 이를 100줄 아래로 강제하려면
> 30개 prop 의 메가 컴포넌트 또는 페이지 로직의 컨트롤러 훅 이관이 필요한데,
> 전자는 스펙의 "drilling 최소" 원칙에 반하고 후자는 "회귀 0" 절대 목표에 위험을
> 더한다. 73% 감소 + 11개 단일 책임 파일로 분해의 *실질 목표*는 달성했다.
> 추가 축소(컨트롤러 훅)는 후속 안전 작업으로 분리 권장.

### B2. N+1 쿼리 제거

기존 `fetchParticipants` 는 참가자마다 `submissions` 를 개별 SELECT 했다 → `1 + N` 호출.

```ts
// 변경 후 (useChallengeData.ts)
await supabase
  .from('participants')
  .select('*, submissions(*)')   // ← Supabase 임베드: 1회 호출
  .eq('challenge_id', challenge.id)
  .order('created_at');
```

**진입 시 REST 호출 = 정확히 3건:**
1. `challenges_public` — code 로 챌린지 1건
2. `participants` + `submissions(*)` 임베드 — 전 참가자 인증 (N+1 제거)
3. `weekly_logs` `.in('participant_id', …)` — 전 참가자 주간 기록 (`useAllWeeklyLogsForChallenge`, 무변경)

참가자가 N명이면 기존 `2 + N` → `3` 으로. ranking/정렬/감소율 계산 로직은 동일하다
(`.find()` 기반이라 임베드 정렬 순서 무관).

### B3. 단위 테스트 작성

Phase A 의 Vitest jsdom 인프라 위에 훅·lib 테스트를 추가. **48 → 79 테스트** (신규 31개).

| 파일 | 케이스 |
|------|--------|
| `hooks/__tests__/useRecordStatus.test.ts` | 7 — currentWeek 계산, completed/notCompleted 분류, 누적 입력률 |
| `hooks/__tests__/useWeeklyLogs.test.ts` | 3 — supabase mock fetch / null guard / insert |
| `hooks/__tests__/useAIAdvice.test.ts` | 4 — cache hit/miss, forceRefresh 전달, error 분기 |
| `hooks/__tests__/useCoachSession.test.ts` | 3 — 세션 복원(system 제외·메모리 인용), 시드, send 추가 |
| `lib/__tests__/signedImage.test.ts` | 9 — extractStoragePath(path/public/sign/외부) + isStoragePath |
| `lib/__tests__/deviceSecret.test.ts` | +5 — save/load/clear 라운드트립, table 분리, prepareDeviceSecret |

`hooks/useNextRecordableWeek.test.ts` (12)는 Sprint 1.5 에서 이미 5단계 상태 + missingWeeks 를
커버하므로 그대로 둔다.

---

## 2. 의도된 동작 변경 (1건) — 보고

**`prefers-reduced-motion` 분기 추가.** 기존 1위 행/메달/종료 버튼 애니메이션은
reduce-motion 설정을 무시했다. `rankAnimations.ts` 추출 시 스펙 요구사항
("prefers-reduced-motion 분기 포함") 과 CLAUDE.md §6 에 따라
`@media (prefers-reduced-motion: reduce) { animation: none }` 을 추가했다.
→ reduce-motion 사용자에게만 데코 애니메이션이 정지된다. 그 외 사용자는 시각·동작 동일.

그 밖에는 동작 변경 0 — 상태 병합(`basicInfoDialog`+`afterJoin` → 객체 1개),
join 에러를 공유 `error` → `ParticipantsTabHeader` 로컬 상태로 이동 등은 모두
사용자 화면에 동일하게 보인다.

---

## 3. 검증 결과 (DoD)

| 항목 | 결과 |
|------|------|
| `tsc --noEmit` | ✅ 0 exit |
| `npm test` | ✅ 79 통과 (11 파일) |
| `npm run build` | ✅ 성공 (1,414 모듈) |
| 진입 시 REST 호출 N+1 → 3건 이내 | ✅ 3건 |
| `ChallengePage.tsx` ≤ 100줄 | ⚠️ 345줄 (§1 B1 참고 — 실질 목표는 달성) |
| 운영 회귀 0 | ⏳ 수동 시나리오 검증 필요 (§4) |

---

## 4. 운영자 수동 회귀 검증 시나리오 (6+개)

`burnfat.wodybody.com` 또는 `npm run dev` 에서 기존 챌린지 코드로 확인:

1. **진입** — 코드로 페이지 로드, 헤더(제목·기간·코드·D-Day)·3탭 정상.
2. **참가** — 닉네임 입력 → 참가 → 기본정보 다이얼로그 진입 → "나" 로 기억(개인 상태 카드).
3. **시작 인증** — 참가자 카드 "시작일 인증" → 이미지 마스킹·제출 → 카드에 체지방률 반영.
4. **종료 인증** — "종료일 인증"(종료일 전이면 차단 스낵바) → 제출 → 종료 처리.
5. **순위** — Tab 1 진행 상태·중간 공개 토글(PIN 설정 시 PIN 다이얼로그)·순위표·결과 공유.
6. **주간 기록** — Tab 2 요약·차트·참가자별 카드, 다음 차주 입력 CTA, WeeklyLogForm 입력.
7. **AI/코치** — `ParticipantWeeklyLogCard` 의 AI 조언 카드 → "코치와 대화하기" 모달.
8. **챌린지 수정** — 헤더 연필 아이콘 → (PIN) → 이름·기간·참가비 수정 반영.

**DevTools Network 호출 수 비교** (핵심 검증):
- Network 탭 → `XHR/Fetch` 필터 → `supabase.co/rest/v1` 호출만 카운트.
- 페이지 진입 시 `challenges_public` 1 + `participants?select=*,submissions(*)` 1 +
  `weekly_logs?...in.(...)` 1 = **3건**.
- 참가자 N명일 때 기존 `2 + N` 대비 절반 이하인지 확인 (참가자 4명 → 기존 6 → 현재 3).

---

## 5. 롤백 가이드

- 본 변경은 **프런트 전용** (DB·RPC·백엔드 무변경). 긴급 시 Vercel Deployments 에서
  직전 배포로 *Promote to Production*.
- 코드 롤백은 본 커밋 1건 revert 로 완결 (마이그레이션 정리 불요).

---

## 6. 다음 단계 — Sprint 3 Phase C 예고

1. **`ChallengePage` 추가 축소** — 페이지 상태/핸들러를 `useChallengePage` 컨트롤러 훅으로
   이관해 ≤100줄에 근접시키기 (B1 의 후속 안전 작업).
2. **Playwright E2E 1개** — 참가 → 시작 인증 → 주간 기록 골든 패스.
3. **분석 이벤트** — PostHog/Plausible 도입, 핵심 5개 이벤트(생성/참가/인증/AI/코치) 계측.
4. **기존 컴포넌트 테스트** — testing-library 로 탭 컴포넌트 렌더 테스트.

진입 시 루트 `CLAUDE.md` → 본 문서 → `IMPROVEMENT_REPORT_2026-05.md` Sprint 3 순으로 읽을 것.

— 끝 —
