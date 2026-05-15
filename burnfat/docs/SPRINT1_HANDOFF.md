# Sprint 1 핸드오프 — UX 빠른 승

> **상태**: ✅ 완료
> **날짜**: 2026-05-15
> **선행 Sprint**: [`SPRINT1_5_HANDOFF.md`](SPRINT1_5_HANDOFF.md), [`SPRINT0_HANDOFF.md`](SPRINT0_HANDOFF.md)
> **로드맵**: [`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) §6 Sprint 1

---

## 1. 목표

재방문 사용자의 *다음 행동 유도*와 *공유 루프*를 강화한다. 4개 빠른 승 + 백필 토스트.
모두 **순수 클라이언트 변경** — DB 마이그레이션·RLS·Storage·백엔드 무변경.

---

## 2. 적용된 변경

### 2.1 개인 상태 카드 + 내 참가자 식별

- **신규** [`src/lib/participantIdentity.ts`](../src/lib/participantIdentity.ts) — 챌린지당 1명을 localStorage(`burnfat:identity:<challengeId>`) 에 매핑. *인증이 아니라 UX 식별* 임을 주석에 명시 (쓰기 잠금은 Sprint 0 device_secret 담당).
- **신규** [`src/hooks/useParticipantIdentity.ts`](../src/hooks/useParticipantIdentity.ts) — localStorage 매핑을 *실제 참가자 목록과 대조* 해 삭제·불일치 id 를 자동 무시. `{ myParticipant, remember, forget }` 반환.
- **신규** [`src/components/MyStatusCard.tsx`](../src/components/MyStatusCard.tsx) — Tab 0 상단 개인 상태 카드. 시작 인증 / 종료 인증 / 이번 주 기록을 *아이콘 + "완료/미완료" 텍스트 병행* 으로 표시(색상 단독 금지). 미완료 항목에 인라인 액션 버튼. "내가 아니에요" 로 식별 해제.
- `ChallengePage`: 조인 성공 시 `rememberMe(participantId)`. Tab 0 은 식별 시 `MyStatusCard` + "다른 참가자 추가" 토글, 미식별 시 기존 참가 폼.

### 2.2 D-Day & 종료 임박 알림

- **신규** [`src/lib/challengeSchedule.ts`](../src/lib/challengeSchedule.ts) — 순수 함수. `getChallengePhase` / `getDaysUntilEnd` / `getDaysUntilStart` / `getDDayDisplay`. `getDDayDisplay` 는 칩·모달이 공유하는 단일 표시 모델(`label` / `ariaLabel` / `tone` / `endingSoon`).
- **신규** [`src/components/DDayChip.tsx`](../src/components/DDayChip.tsx) — 헤더 우측 칩. 색상 + 아이콘 + `aria-label` 병행.
- **신규** [`src/components/EndingSoonDialog.tsx`](../src/components/EndingSoonDialog.tsx) — 종료 24h 이내 진입 시 챌린지당 1회 모달. `shouldShowEndingSoonNotice` / `dismissEndingSoonNotice` (localStorage `burnfat:endingSoonNotice:<challengeId>`). 식별된 사용자가 종료 인증 미완료면 "지금 종료 인증하기" CTA 분기.
- `ChallengePage`: 헤더에 `DDayChip`, 진입 시 종료 임박 모달 트리거 effect.

### 2.3 랭킹 공유 이미지

- **신규** 의존성 `html-to-image@^1.11.13`.
- **신규** [`src/lib/prizeDistribution.ts`](../src/lib/prizeDistribution.ts) — 순수 함수. `computePrizeDistribution(stake, count)` → 상금 풀 + 1등 순이익 + 그 외 순손실. 기본 규칙은 *승자독식* 이며 공유 카드에 "예상" 임을 캡션으로 명시. `formatKrw` 원화 표기.
- **신규** [`src/components/RankingShareDialog.tsx`](../src/components/RankingShareDialog.tsx) — Top 3 + 예상 정산을 담은 공유 카드. "이미지 저장"(`toPng` → Web Share API 우선, 미지원 시 다운로드) + "텍스트 복사". 기존 텍스트 전용 `handleShareRanking` 을 이 다이얼로그로 일원화.

### 2.4 a11y 1차 패스

- `ChallengePage` 모든 `IconButton`(3개) 에 `aria-label` 추가.
- 랭킹 메달 셀에 `role="img"` + `aria-label="N위"` — 메달 이모지가 스크린리더에 순위로 읽힘.
- [`AllParticipantsChart`](../src/components/AllParticipantsChart.tsx) / [`WeeklyLogChart`](../src/components/WeeklyLogChart.tsx) 컨테이너에 `role="img"` + 요약 alt-text.
- `AllParticipantsChart` 라인에 `CHART_LINE_DASHES` 점선/실선 스타일 매핑 — 색약·흑백 인쇄에서도 라인 구분.

### 2.5 백필 권고 토스트

- **신규** [`src/lib/oneTimeNotice.ts`](../src/lib/oneTimeNotice.ts) — 일회성 안내 가드. `hasSeenNotice` / `markNoticeSeen` (localStorage `burnfat:notice:<key>`). 접근 실패 시 `hasSeenNotice` 가 `true` 를 반환해 *반복 노출(스팸) 을 보수적으로 차단*.
- `ChallengePage`: 식별된 내 미입력 주차가 2개 이상이면 챌린지당 1회 토스트. `logsLoading` 가드로 *로그 로딩 전 빈 배열을 미입력으로 오인하는* 버그 방지.
- Sprint 1.5 핸드오프 §4.1 에서 보류했던 항목 — 본 Sprint 의 "내 참가자 식별" 로 활성화.

---

## 3. DoD / 검증

### 3.1 자동 검증

- `npx tsc --noEmit` — 클린.
- `npm run build` — 성공 (번들 1,107 kB, html-to-image 로 약 +26 kB. 청크 분할은 Sprint 3).
- `npm test` — **29/29 통과** (challengeSchedule 11 + prizeDistribution 6 + useNextRecordableWeek 12).

### 3.2 빠른 검증 시나리오 (배포 후)

운영 `burnfat.wodybody.com` 에서:

- **S1 개인 상태 카드**: 닉네임으로 참가 → 새로고침 → Tab 0 상단에 "OOO님으로 참여 중" 카드. 시작/종료/이번 주 상태가 아이콘+텍스트로. "내가 아니에요" → 참가 폼 복귀.
- **S2 D-Day 칩**: 헤더 우측 칩 — 종료 3일 이내 warning, 종료 후 "종료". VoiceOver 로 "종료까지 N일 남음" 읽힘.
- **S3 종료 임박 모달**: 종료 1일 이내 챌린지 진입 시 1회 모달. 닫으면 재노출 안 됨.
- **S4 랭킹 공유**: 순위 탭 "결과 공유" → 다이얼로그. "이미지 저장" → PNG 공유/다운로드, "텍스트 복사" → 클립보드. 예상 정산 노출.
- **S5 a11y**: 메달 셀이 "1위"로 읽힘. 전체 추이 차트 라인이 점선/실선으로도 구분.
- **S6 백필 토스트**: 내 미입력 주차 2개 이상인 챌린지 진입 시 1회 토스트.

---

## 4. 알려진 잔여 위험 / 후속 처리

- **식별의 한계**: localStorage 기반이라 *기기 변경·시크릿 모드·localStorage 삭제* 시 식별이 풀린다. 의도된 한계 — 재식별은 "다른 참가자 추가" 후 같은 닉네임 재등록이 아니라, 향후 Supabase Auth(분기 백로그) 도입 시 정식 해결. 현재는 닉네임 unique 제약 때문에 같은 닉으로 재참가가 불가하므로, 식별이 풀리면 개인 상태 카드를 다시 못 볼 수 있음. → Sprint 2+ 에서 "기존 참가자 중에서 나 선택" UI 검토 권장.
- **html-to-image 폰트/이모지**: 메달 이모지는 시스템 폰트에 의존. 일부 구형 기기에서 PNG 의 이모지 렌더가 텍스트와 다를 수 있음. 텍스트 복사 폴백 제공.
- **승자독식 가정**: `prizeDistribution` 은 규칙을 가정한다. 제품이 분배 규칙을 확정하면 `PRIZE_RULE_LABEL` + `computePrizeDistribution` 만 교체.
- **rank-1 행 데코 애니메이션**: `prefers-reduced-motion` 이 스켈레톤·데코 애니메이션 일부에만 적용됨(IMPROVEMENT_REPORT §2.3). 랭킹 1등 행 shimmer/glow 는 미적용 — Sprint 3 `ChallengePage` 분해 시 함께 처리 권장.
- **테스트 커버리지**: 순수 lib 함수만 vitest 검증. 컴포넌트·hook(localStorage·DOM) 은 Sprint 3 의 jsdom + testing-library 도입 시 커버.

---

## 5. 다음 단계

1. **Sprint 2 — AI 조언 서버 캐시 + JSON 응답 / 목표 진행률 / 챌린지 템플릿**. 진입: `backend/routes/burnfat_ai.py`, `hooks/useAIAdvice.ts`, 신규 테이블 `weekly_ai_advice`.
2. **Sprint 2.5 — 대화형 코치 모달**. 신규 마이그레이션 `coach_sessions` / `coach_messages` / `participant_coach_memory`.
3. **Sprint 3 — ChallengePage 분해 / N+1 제거 / 테스트 베이스라인**. `ChallengePage` 는 본 Sprint 로 ~1,250줄 — 분해 우선순위가 더 올라감.

각 Sprint DoD 는 `IMPROVEMENT_REPORT_2026-05.md` 해당 섹션 기준.

---

## 6. 빠른 롤백 가이드

Sprint 1 은 **순수 클라이언트 변경** (DB·RLS·Storage·백엔드·환경변수 무변경). 데이터 회수 불요.

1. **Vercel 단독 롤백 (권장, 60초)**: Deployments → Sprint 1 직전 빌드(Sprint 1.5 커밋 `e20cbe9`) *Promote to Production*.
2. **소스 revert**: `git revert <Sprint 1 머지 커밋>` 후 푸시 → Vercel 자동 재배포.
3. **부분 비활성**: 특정 기능만 끄려면 `ChallengePage` 에서 해당 컴포넌트 렌더 줄만 주석 처리 (`<DDayChip>` / `<MyStatusCard>` / `<EndingSoonDialog>` / `<RankingShareDialog>`). 신규 컴포넌트로 분리돼 있어 격리 제거가 쉬움.
4. **localStorage 잔류**: `burnfat:identity:*` / `burnfat:notice:*` / `burnfat:endingSoonNotice:*` 키는 롤백해도 남지만 무해 (다음 코드가 무시).

— 끝 —
