# BurnFat 프로젝트 심층 분석 및 개선 로드맵

> **작성일**: 2026-05-14  
> **분석 범위**: `burnfat/` 디렉터리 전체 + `backend/routes/burnfat_ai.py` + 운영 인프라  
> **분석 대상 버전**: 통합 wodybody 레포의 `feat/burnfat-integration-rework2` 시점

---

## 0. Executive Summary

BurnFat은 *"신뢰 기반 공개형 모델"* 위에 빠르게 만들어진 MVP다. **챌린지 생성 → 시작/종료 인바디 인증 → 감소율 랭킹**이라는 핵심 루프가 깔끔하게 동작하고, V2에서 **주간 기록 + Grok AI 조언**을 무리 없이 얹은 점은 분명한 강점이다. 다만 다음 세 가지가 다음 단계의 병목이다.

1. **보안 모델의 한계가 곧 성장의 한계로 전환되는 시점이 임박**했다. "코드만 알면 전체 읽기·쓰기 가능"이 1~2개 챌린지에서는 자연스러운 신뢰 기반 UX지만, 챌린지 수가 늘고 외부 노출이 시작되면 *순위 조작·고의 기록 삭제* 사고 가능성이 즉시 PR 이슈가 된다.
2. **모바일 UX는 70~80점이지만 디테일에서 점수를 잃고 있다.** 터치 타겟이 18~44px 사이에서 들쭉날쭉하고, 색상 단독으로 정보를 전달하는 부분이 차트·랭킹·완료 표시 등 여러 곳에 흩어져 있다. 색약/시각 보조 사용자가 진입하면 한 번에 사용성이 깨진다.
3. **확장 기능의 ROI가 정렬되어 있지 않다.** PRODUCT_PLAN_V2의 후순위 목록(템플릿, 결과 리포트, 팀 대결)이 실제 사용자 리텐션·재참여 동력과 직접 연결되지 못한다. "사용자가 챌린지를 다시 만들게 하는 트리거"가 비어 있다.

이 보고서는 위 세 가지를 중심에 두고, **UI/UX → 기능/제품 → 기술/코드 품질** 순으로 진단한 뒤, 4주 / 8주 / 분기 단위 실행 로드맵을 제시한다.

---

## 1. 프로젝트 스냅샷

| 항목 | 내용 |
|------|------|
| **유형** | 지인 기반 체지방 감량 베팅·트래킹 웹앱 (모바일 우선 SPA) |
| **프론트엔드** | Vite + React 18 + TypeScript + MUI 7, React Router |
| **데이터** | Supabase (PostgreSQL + Storage), 익명 키 + RLS 기반 |
| **AI 조언** | Railway Flask 프록시 → xAI Grok |
| **호스팅** | Vercel (`burnfat.wodybody.com`) |
| **핵심 데이터 모델** | `challenges`, `participants`, `submissions`, `weekly_logs` |
| **라우트** | `/`, `/create`, `/c/:code` (총 3개) |

핵심 사용자 흐름은 단순하고 명확하다.

```
HomePage(코드 입력) → ChallengePage(/c/:code)
                       ├─ Tab 0: 참가자 / 인증
                       ├─ Tab 1: 순위
                       └─ Tab 2: 주간 기록 + AI 조언
```

`ChallengePage.tsx`가 약 1,080줄로 비대해진 상태이며, 이는 향후 변경 비용을 가장 빠르게 끌어올릴 항목이다.

---

## 2. UI/UX 심층 분석

### 2.1 정보 구조와 화면 흐름

**잘 된 점**

- 3-탭 구조(참가자/순위/주간 기록)는 모바일에서 적절한 분할이다.
- 챌린지 정보 헤더에 *기간 · 참가비 · 코드*가 한 줄로 묶여 있어 첫 방문자가 맥락을 빠르게 잡는다.
- 닉네임 등록 후 기본정보(나이/성별/키/목표) 입력을 **모달로 분리**한 결정(PRODUCT_PLAN_V2 §4.4.1)은 모바일 1뷰포트 가독성에 결정적으로 기여한다.

**개선이 필요한 부분**

1. **"참가하기" 영역의 위계가 모호하다.** Tab 0 위에 별도 카드로 떠 있어 *현재 사용자가 이 챌린지에 참가했는지/안 했는지* 상태를 표현하지 못한다. 이미 참가한 사용자가 다시 진입했을 때도 동일한 입력창이 보인다.
   - **제안**: 로컬 저장소에 `participantId per challenge` 매핑을 저장하고, 식별된 경우 카드 자리를 *"OOO님으로 참여 중 · 시작 인증 X · 종료 인증 X"* 와 같은 개인 상태 카드로 교체.
2. **탭 라벨이 정보 밀도에 비해 추상적이다.** "참가자/인증"은 두 역할이 결합되어 있고, "주간 기록"은 *입력 vs. 추이 보기*의 모드 구분이 없다.
   - **제안**: "참가자" + "인증현황"으로 분리하거나, Tab 0 내부에 "전체/내 인증" 세그먼트 컨트롤 추가. "주간 기록" 탭 상단에는 *"이번 주 N/M 완료"* 외에 *"이번 주 내 기록 입력"* 1차 CTA를 고정.
3. **랭킹의 "감소율" 정의가 잘 보이지만 가격(참가비) 분배 결과가 없다.** 핵심 동기인 "내기"의 금액 배분이 시각화되지 않는다.
   - **제안**: 종료 후 *"1등: 250,000원 회수 · 2등: 50,000원 환급 · 3등 이하: 0원"* 등 룰 카드 또는 share 텍스트의 일부로 포함.

### 2.2 모바일 디테일

- **터치 타겟 크기 편차**: SubmitModal/ChallengePage의 버튼은 `minHeight: 44`로 통일되어 있지만, 랭킹 잠금 토글 옆 부속 아이콘(`fontSize: 12`), UpdateNoticeDialog의 `Chip height: 18`, WeeklyLogChart의 메트릭 칩은 권장 44×44에 미달이다.
- **iOS Safari 마스킹 캔버스**: `ImageMaskEditor.tsx`는 `touchAction: 'none'`으로 스크롤 충돌을 막고 있지만 실기기 검증이 문서상으로만 권고됐고 자동화 테스트가 없다.
- **키보드 입력 타입**: 체지방률(`inputMode: 'decimal'`)·관리자 PIN(`inputMode: 'numeric'`)은 잘 지정되어 있다. 다만 **닉네임 입력**은 자동 대문자 변환·자동 완성 비활성 옵션이 없어, iOS에서 첫 글자가 대문자로 바뀌는 자잘한 마찰을 만든다.

### 2.3 접근성 (a11y)

현재는 *대체로 시각적이지만 보조 사용자에게는 취약한 상태*다.

| 항목 | 현재 | 권장 |
|------|------|------|
| 색상 단독 정보 | 1등 골드 + 깜빡임, 종료 인증 버튼 색상 해시, 차트 라인 색상 | 메달 텍스트 + 아이콘 병행, 라인 스타일(점선/실선) 병행, 미인증 항목에 패턴/아이콘 |
| ARIA 라벨 | 일부 IconButton만 `aria-label` 보유 | 모든 IconButton, 차트 컨테이너에 `aria-label`/`role="img"`, Skeleton에 `aria-busy="true"` |
| 모션 민감 사용자 | `prefersReducedMotion`은 스켈레톤만 적용 | 1등 행 shimmer/glow, 종료 버튼 sparkle 등 데코 애니메이션에도 동일 처리 |
| 포커스 가시성 | MUI 기본값 의존 | 다이얼로그 첫 입력 `autoFocus`만 존재 → 닫기 후 트리거로 포커스 복귀 보장 |
| 컬러 컨트라스트 | `warning.50` 배경 + `text.secondary` 위 캡션은 WCAG AA 미달 가능 | 본문 배경/텍스트 조합 컨트라스트 검증 후 `warning.100`/`grey.700`로 상향 |

### 2.4 빈 상태·에러·로딩

- 빈 상태 메시지는 대체로 친절하다("아직 참가자가 없습니다…").
- 에러는 토스트와 인라인 텍스트가 혼재. 특히 `setError(...)`로 같은 에러를 다른 영역에 표시하는 코드가 `ChallengePage.handleJoin`에 있어, 챌린지를 "찾을 수 없습니다" 같은 *로딩 단계 에러* 자리에 *참가 닉네임 중복* 같은 *액션 단계 에러*가 섞일 가능성이 있다.
- 로딩 단계는 `300ms 미만 — 빈 박스`, `300~2000ms — 스켈레톤`, `2000ms+ — 텍스트 라이브 영역` 의 3단 처리가 잘 되어 있다(`ChallengePage.tsx:364-392`). 좋은 패턴이며 다른 페이지에도 이식할 가치가 있다.

### 2.5 디자인 시스템 일관성

- 컬러 토큰을 직접 hex로 박은 곳(`END_BTN_COLORS`, 1등 row gradient)이 많다. 추후 다크 모드/리브랜딩 시 한꺼번에 수정해야 할 부담이 누적.
- MUI 테마(`burnfat/src/theme/…` 가정)에 *success/warning 50/100/200 단계*가 잘 정의되어 있지만, "1등 골드", "참가자별 색상 8종"은 테마 바깥에 있다.
- `UpdateNoticeDialog`와 `WeeklyLogsUpgradeNoticeDialog`는 사실상 동일 패턴인데 독립 구현되어 있다. **단일 `<NoticeDialog id="..." entries={...} />`로 통합** 권장.

---

## 3. 기능 / 제품 분석

### 3.1 핵심 루프의 강점

1. **참가 마찰이 매우 낮다.** 닉네임 한 줄로 들어오고, 기본정보는 선택이며, 인증은 사진 1장 + 숫자 1개로 끝난다.
2. **공동 입력·공동 확인**이라는 메탈모델은 지인 대결에 적합하다. 친구가 게을러져도 다른 사람이 대신 데이터를 채워 흐름이 끊기지 않는다.
3. **랭킹의 감소율 정의(상대 감소율)**가 시작 체지방이 높은/낮은 사람을 공정하게 비교한다. 안내 캡션도 제공 중.

### 3.2 부족하거나 비어 있는 기능

| 우선순위 | 기능 | 왜 필요한가 | 구현 난이도 |
|----------|------|------------|-------------|
| ★★★ | **"내 참가자 식별 + 개인 상태 카드"** | 재방문 시 *나*의 인증/주간 기록 상태가 한 번에 보여야 액션 유도가 강해진다. | 낮음 (localStorage + 헤더 카드) |
| ★★★ | **챌린지 종료 자동 알림 / D-Day 시각화** | 종료일을 놓치는 케이스가 발생한다. 종료일 24h 전 모달 한 번이면 큰 효과. | 낮음 (date-fns + 다이얼로그) |
| ★★★ | **상금 분배 룰 / 결과 카드 공유 이미지** | 베팅 동기 강화 + SNS로 유입 루프 형성. | 중간 (html-to-image) |
| ★★ | **목표 체지방률 진행률 시각화** | 데이터는 이미 `target_body_fat`로 수집 중인데 시각화가 없음. | 낮음 (기존 차트 확장) |
| ★★ | **AI 조언 캐싱·공유** | 토큰 비용 + 친구들이 같이 조언을 본다는 신뢰 기반 콘셉트 강화. | 중간 (Supabase 캐시 테이블) |
| ★★ | **챌린지 템플릿 (4주/8주, 참가비 프리셋)** | 재참여 사용자 생성 마찰 감소. | 낮음 |
| ★ | **결과 리포트 PDF/이미지** | 종료 후 SNS 공유 → 신규 유입. | 중간 |
| ★ | **팀 vs 팀 모드** | 회사·동호회 단위 시장 확장. | 높음 (스키마 변경) |
| ★ | **이메일/푸시 리마인더** | 주간 기록 누락 방지. 단, 이메일 수집이 필요해 신뢰 기반 모델과 약간 충돌. | 중간 |

### 3.3 AI 조언 모듈의 진단

`backend/routes/burnfat_ai.py` 및 프론트 `useAIAdvice`/`AIAdviceCard`는 다음 특성을 가진다.

- **장점**: 24h 클라이언트 캐시(`useAIAdvice`)로 토큰 낭비를 1차로 막는다. 준비도(나이·성별·키·목표·1주차 기록 보유) 체크리스트가 사용자에게 *조언 품질의 전제*를 명확히 알려 준다.
- **약점**:
  - 캐시는 *디바이스 단위*다. 같은 챌린지의 다른 친구가 보면 다시 요청한다. 공동 모니터링 콘셉트와 어긋난다.
  - `user_context`/`advice_style` 입력 길이 제한이 없어 *프롬프트 비용 폭주* 가능.
  - 응답 포맷이 단일 텍스트 → 핵심 지표(권장 칼로리, 권장 단백질 g)를 카드 형태로 구조화하기 어렵다.
- **개선 제안**:
  1. 서버측 캐시 테이블 `weekly_ai_advice (participant_id, week_no, advice_md, created_at)` 도입. 24h 또는 새 주간 기록 INSERT 트리거 시 invalidate.
  2. `user_context` 최대 500자, `advice_style` enum 화이트리스트.
  3. JSON 응답 스키마 강제(`{ summary, action_items[], cautions[] }`) → 카드 UI를 안정적으로 그리기 위함.

---

## 4. 기술 / 코드 품질 분석

### 4.1 보안 — 가장 시급한 영역

현재 RLS 정책은 모든 테이블에 대해 익명 SELECT/INSERT/UPDATE를 `USING (true)`로 허용한다(20260424000001_rls_update_policies.sql 등). 이는 다음의 실제 위험을 만든다.

- **타인 기록 임의 수정**: `submissions.body_fat_rate`를 누구나 UPDATE 가능 → 종료일 직전 1등을 바꿔치기.
- **악의적 DELETE**: ON DELETE CASCADE로 챌린지 자체 삭제 가능성도 검토 필요.
- **admin_pin 평문 저장**: TEXT 컬럼에 그대로 저장. 또한 클라이언트에서 expected/got을 정규화 비교(`ChallengePage.normalizeAdminPin`)하므로 *DB 조회로 PIN 노출*이 가능. 

**권장 단계**

1. **단기**: PIN은 클라이언트가 아닌 Edge Function에서 검증하도록 이전, DB에는 bcrypt 해시 저장. `submissions`/`weekly_logs` UPDATE/DELETE를 RLS에서 차단하고 *최초 INSERT 후 24h 이내만 수정 가능* 정책 도입.
2. **중기**: 닉네임 기반 가벼운 *passkey/디바이스 토큰* 도입. 닉네임을 만들 때 발급된 secret을 localStorage에 저장하고, UPDATE 시 `(participant_id, device_token)`을 확인.
3. **장기**: Supabase Auth(이메일 매직 링크 or OAuth) 도입. 챌린지 코드는 *읽기 공개, 쓰기는 본인 + 챌린지 멤버* 정책으로 분리.

### 4.2 아키텍처 / 코드 구조

- **`ChallengePage.tsx`가 ~1,080줄**. 다음 책임이 한 파일에 모두 있다.
  - 챌린지 fetch · 참가자 fetch · 랭킹 계산
  - 참가 폼 · 인증 모달 트리거 · 주간 기록 모달 트리거
  - PIN 다이얼로그, 챌린지 정보 수정 다이얼로그
  - 토스트/스낵바 3종, 1등 row 애니메이션, 종료 버튼 컬러 해시
  - **권장 분리**: `useChallengeData(code)` hook, `<ChallengeHeader />`, `<ParticipantsTab />`, `<RankingTab />`, `<WeeklyLogsTab />`, `<AdminPinDialog />`, `<ChallengeEditDialog />`.
- **데이터 페치 N+1**: `fetchParticipants`에서 참가자 N명마다 별도 `submissions` 쿼리. Supabase의 `select('*, submissions(*)')` 임베드로 1회 호출 가능.
- **`DEBUG_SHOW_RANKING`, `DEBUG_ALLOW_EARLY_END_SUBMIT`** 등 디버그 플래그가 코드에 박혀 있다. `import.meta.env.VITE_DEBUG_*`로 외부화 권장.
- **인라인 keyframes 다량**: 1등 row의 `rank1Shimmer/Glow`, 종료 버튼 `endBtnShimmer/Sparkle`이 sx로 인라인 정의되어 매 렌더 객체가 재생성된다. CSS 모듈/styled로 끌어내면 가독성·성능 모두 개선.

### 4.3 데이터 모델

- `weekly_logs (participant_id, week_no)` 유니크는 좋은 결정. 다만 *시작일 기준 week_no 계산*이 클라이언트(`useRecordStatus`)에 있다. 동일 계산이 백엔드(AI 조언)와 분기될 위험.
  - **제안**: Postgres에 `compute_week_no(start_date, recorded_at) RETURNS int` 함수 + `weekly_logs.week_no GENERATED ALWAYS AS (...)` 옵션 검토.
- `submissions.image_url`이 평문 public URL. Storage 버킷이 Public이라 *URL을 알면 누구나 접근* 가능. 마스킹은 적용되지만, 시작/종료 메타데이터까지 누설된다. signed URL + 시간 제한이 안전하다.
- `participants.target_body_fat`은 수집만 되고 UI 활용도가 낮음 (차트 ReferenceLine 정도).

### 4.4 성능

- 첫 페인트 시간: 라우트 분할(`React.lazy`)이 없어 모든 페이지를 한 번에 번들. `CreateChallengePage`는 첫 방문자 70%에게 불필요. `lazy` + `Suspense` 적용.
- 차트(`recharts` 가정)는 무거운 라이브러리. 모바일에서 첫 진입 시 LCP에 영향. Tab 2 진입 시점에 dynamic import.
- `fetchParticipants`가 모달 닫을 때마다 전량 재요청. *낙관적 업데이트(optimistic update)* 또는 *Supabase Realtime 구독*으로 대체 가능.

### 4.5 테스트 / CI

- 유닛 테스트 디렉터리·CI step에서 자동 테스트 흔적이 보이지 않는다(.github/workflows/burnfat.yml 확인 권장).
- 권장 최소 라인:
  - `vitest` + `@testing-library/react`로 `useRecordStatus`, `useWeeklyLogs`, `useAIAdvice` 유닛 테스트.
  - `playwright`로 *홈 → 챌린지 생성 → 참가 → 인증* 1개 E2E.
  - GitHub Actions에서 PR마다 `npm run build` + 위 테스트.

---

## 5. 위험·기회 매트릭스

| # | 항목 | 영향 | 노력 | 종류 |
|---|------|------|------|------|
| R1 | RLS UPDATE/DELETE 무방비 | 🔴 매우 큼 | 중 | 보안 |
| R2 | admin_pin 평문 저장 + 클라이언트 비교 | 🔴 큼 | 소 | 보안 |
| R3 | 이미지 public URL 누출 | 🟠 중 | 중 | 프라이버시 |
| R4 | ChallengePage 모놀리스 | 🟠 중 | 중 | 유지보수 |
| O1 | 개인 상태 카드 + D-Day 모달 | 🟢 큼 | 소 | UX/리텐션 |
| O2 | 결과 공유 이미지 + 상금 분배 카드 | 🟢 큼 | 중 | 그로스 |
| O3 | AI 조언 서버 캐시 + 구조화 응답 | 🟢 중 | 중 | 비용/UX |
| O4 | 색약·a11y 1차 패스 | 🟢 중 | 소 | 포용성 |
| O5 | 챌린지 템플릿/프리셋 | 🟢 중 | 소 | 생성 마찰 |
| O6 | 차주 입력 CTA + 미입력 주차 placeholder | 🟢 큼 | 소 | 데이터 충실도 |
| O7 | 누적 추세·라이프스타일 상관 기반 AI 조언 | 🟢 큼 | 중 | 코어 가치 |
| O8 | 대화형 코치 모달 + 세션/장기 메모리 영속화 | 🟢 큼 | 중 | 차별화 |

---

## 6. 실행 로드맵

### Sprint 0 — 1주차 (보안 응급 처치, 위험 차단) ✅ **완료 (2026-05-14, 커밋 `64315d3`)**

> 상세 적용 내용·검증·롤백 가이드: [`SPRINT0_HANDOFF.md`](SPRINT0_HANDOFF.md)

목표: *"운영 중 가장 큰 사고"를 차단*.

1. **PIN 보안 강화** (1~2일)
   - `pgcrypto` 활성화 + `admin_pin_hash TEXT` 컬럼 추가, 기존 데이터 일회성 마이그레이션.
   - Supabase RPC `verify_admin_pin(challenge_id, pin)` 만들고 클라이언트는 결과만 받기.
2. **UPDATE 정책 잠그기** (1일)
   - `submissions`/`weekly_logs`: INSERT 후 24h 이내, 동일 디바이스(localStorage 시크릿)일 때만 UPDATE.
3. **이미지 시크릿 URL 전환** (1일)
   - 버킷 Private 화, signed URL 7일 유효, 클라이언트에서 매번 갱신.
4. **디버그 플래그 환경 변수화** (0.5일).

### Sprint 1 — 2~3주차 (UX 임팩트 큰 빠른 승) ✅ **완료 (2026-05-15, [`SPRINT1_HANDOFF.md`](SPRINT1_HANDOFF.md))**

1. **개인 상태 카드** (1일)
   - 닉네임 등록 시 `device_token` 생성 → localStorage 저장 → 재방문 시 자동 식별.
   - Tab 0 상단에 "OOO · 시작 ❌ · 종료 ✅ · 이번 주 기록 ❌" 카드.
2. **D-Day & 종료일 임박 알림** (0.5일)
   - 종료 24h 전 진입 시 모달, 헤더 우측에 `D-3` 칩.
3. **랭킹 공유 이미지** (1~2일)
   - `html-to-image`로 1등 카드 + Top 3 → PNG 다운로드/공유.
   - 텍스트 share에 *예상 상금 분배*도 함께.
4. **a11y 1차 패스** (1일)
   - 모든 IconButton `aria-label`, 차트 컨테이너 `role="img"` + alt-text,
   - 메달은 `🥇` + `(1위)` 텍스트 병행, 라인 차트에 점선/실선 스타일 매핑.

### Sprint 1.5 — 주간 기록 입력 UX 정상화 (Sprint 1과 병행 가능, 0.5~1주) ✅ **완료 (2026-05-14, [`SPRINT1_5_HANDOFF.md`](SPRINT1_5_HANDOFF.md))**

> **배경**: 현재 `ParticipantWeeklyLogCard.tsx`는 `logs.length === 0`일 때만 "주간 기록 입력" 버튼을 노출하고, 1개라도 기록되면 다음 차수 입력 CTA가 사라진다. 또한 `WeeklyLogForm`의 `weekNo` 기본값은 *오늘 기준 주차*라 같은 주차 중복 에러가 자주 발생한다. 즉, 주차별 누적 기록이라는 핵심 데이터 자산이 *입력 마찰*로 인해 비어 가는 구조적 버그다.

**현 상태 코드 근거**

- `burnfat/src/components/ParticipantWeeklyLogCard.tsx` L48-60: 빈 상태일 때만 입력 버튼.
- 같은 파일 L68-97: 기록이 있으면 차트·리스트·AI 카드만 렌더.
- `burnfat/src/components/WeeklyLogForm.tsx` L66-68: `weekNo = getWeekNoForDate(startDate, today)` → 같은 주 중복 입력 시 L83-86에서 차단.
- `burnfat/supabase/migrations/20250225000001_v2_weekly_logs_and_participants.sql`의 `UNIQUE(participant_id, week_no)` 제약은 *주차 단위 1회*를 강제.

**구현 계획 (체크리스트)**

1. **"다음 주차 상태" 계산을 hook으로 단일화**
   - `useNextRecordableWeek(participant, logs, challengeStartDate, challengeEndDate)` 신규 hook.
   - 반환: `{ status: 'ready' | 'already_done_this_week' | 'before_start' | 'after_end' | 'caught_up', suggestedWeekNo: number | null, missingWeeks: number[] }`.
   - 계산: `currentWeek = getWeekNoForDate(start, today)`, `done = new Set(logs.map(l => l.week_no))`, `missing = [1..currentWeek].filter(w => !done.has(w))`.
2. **`ParticipantWeeklyLogCard`에 영구 CTA + 미입력 주차 뱃지**
   - 카드 우측 상단에 *항상* "이번 주 기록 +" 버튼을 노출하되, `status`에 따라 라벨/색 분기.
     - `ready` → "N주차 기록 입력" (primary)
     - `already_done_this_week` → "다음 주에 입력 가능" (disabled + tooltip)
     - `before_start` → "시작일 이후 입력 가능" (disabled)
     - `after_end` → "기록 기간 종료" (disabled)
     - `caught_up` 이지만 `missingWeeks.length > 0` → "지난 N주차 채우기" (warning) — *공동 입력 콘셉트에 부합*
   - 기록 리스트 하단에 미입력 주차를 dashed 박스로 *placeholder 행*으로 보여 "2주차 · 미입력 — 입력하기" 식의 인라인 CTA 제공.
3. **`WeeklyLogForm` 진입 시 주차 자동 선택 로직 개선**
   - prop 추가: `defaultWeekNo?: number`, `lockedWeekNos: number[]`(=`existingWeekNos`).
   - 우선순위: ① 호출자가 명시한 `defaultWeekNo` → ② `missingWeeks[0]` → ③ `currentWeek`.
   - `<Select>`에서 이미 채워진 주차는 `disabled` + "(입력됨)" 라벨로 시각화하여 충돌 에러 자체를 차단.
4. **`RecordStatusSummary` 강화**
   - 현재 "이번 주 X/Y 완료"만 표시. 여기에 *"누적 입력률 67%"* 막대를 추가해 시즌 전체 데이터 충실도를 한 눈에.
5. **백필 권고 토스트**
   - 챌린지 진입 시 *내 미입력 주차*가 2개 이상이면 1회 토스트: "2주차 / 3주차 기록이 비어 있어요. 채워두면 AI 조언이 더 정확해집니다."

**선택 기능 (Sprint 2와 묶을 수 있음)**

- *Realtime 갱신*: `supabase.channel('weekly_logs').on('postgres_changes', ...)` 구독으로 친구가 내 기록을 채워주면 즉시 UI 반영. 공동 입력 콘셉트와 강하게 어울림.
- *주차 자동 알림*: 종료일 D-Day 외에 *매주 월요일 오전 09:00 KST*에 "지난주 기록 입력해주세요" 푸시(웹 푸시 또는 카카오 알림톡).

**완료 조건 (DoD)**

- [ ] 1개 이상 주간 기록이 있는 참가자 카드에서 "다음/지난 주차 입력" CTA가 항상 보인다.
- [ ] 미입력 주차가 placeholder 행으로 노출되고 인라인 입력이 가능하다.
- [ ] `WeeklyLogForm` 진입 시 충돌 가능한 주차는 처음부터 선택 불가.
- [ ] `useNextRecordableWeek` 유닛 테스트(Vitest) 통과.

---

### Sprint 2 — 4~5주차 (제품 가치 확장) ✅ **완료 (2026-05-15, [`SPRINT2_HANDOFF.md`](SPRINT2_HANDOFF.md))**

1. **AI 조언 서버 캐시 + JSON 응답** (3~5일)
   - 신규 테이블 `weekly_ai_advice`. 동일 (participant, week_no) 캐시 hit률 80%+ 기대.
   - 응답 JSON 스키마 정의 → `<AdviceCard summary={} actionItems={} cautions={} />`.
2. **목표 체지방률 진행률 위젯** (2일)
   - 시작값 → 현재값 → 목표값 게이지. Tab 2 상단 고정.
3. **챌린지 템플릿** (1~2일)
   - "4주 / 8주 / 12주 챌린지" 프리셋 카드, 참가비 5만/10만/20만.

### Sprint 2.5 — AI 조언 모듈 강화 (Sprint 2 후속, 1~2주) ✅ **§2.5.2 완료 (2026-05-18, [`SPRINT2_5_HANDOFF.md`](SPRINT2_5_HANDOFF.md)) — §2.5.1 은 Sprint 2 에서 완료**

> **목표**: 단발성 텍스트 조언 → *주차별 누적 데이터 기반 코칭 + 대화형 모달*로 격상. 사용자 입장에서는 "지난 대화와 약속을 기억하는 Grok 코치를 매주 만나는 느낌". (xAI Grok API 제약상 음성/동반자 기능은 범위에서 제외.)

#### 2.5.1 주차별 누적 기반 개인화 강화

**현 상태**

- 백엔드 `backend/routes/burnfat_ai.py`는 `participant_id` 기준으로 `weekly_logs`를 조회해 프롬프트에 포함하지만, *추세 라벨(가속/정체/반등)*·*라이프스타일과 결과의 상관*을 명시적으로 계산하지 않는다.
- 프론트 `useAIAdvice`는 24h 디바이스 캐시. 같은 챌린지의 다른 친구가 보면 다시 비용 발생.

**구현 계획**

1. **서버측 사전 피처 엔지니어링 (Flask 단계에서 수행)**
   - 입력으로 들어온 `weekly_logs`를 정렬 후 다음 파생 지표를 계산해 프롬프트에 *구조화된 JSON 블록*으로 포함.
     - `delta_per_week[]`: 각 주차 직전 대비 체지방 변화 (%p).
     - `avg_delta`, `last_3w_delta`, `streak_direction`(down/up/flat).
     - `regime_label`: 'fast_loss' / 'steady_loss' / 'stall' / 'rebound' (단순 임계값으로 분류).
     - `lifestyle_correlation`: `exercise_count`/`sleep_hours`/`diet_quality`와 `delta`의 *방향 일치* 여부 요약.
   - 시스템 프롬프트에 *"위 regime_label과 lifestyle_correlation을 명시적으로 인용해 조언하라"* 지시 추가.
2. **JSON 응답 스키마 강제 + 카드 UI 구조화**
   - 응답: `{ summary, regime, this_week_focus[], next_week_actions[], cautions[], cheer }`.
   - 프론트 `<AIAdviceCard />`를 카드 → *섹션 분할 카드*로 재구성. 각 섹션은 접고 펼치기 가능.
3. **공용 캐시 + 라이프사이클**
   - 신규 테이블 `weekly_ai_advice (participant_id, week_no, advice_json, model, prompt_version, created_at)`.
   - 캐시 키: `(participant_id, week_no, prompt_version)`. *새 `weekly_logs` INSERT/UPDATE 트리거*로 해당 주차 캐시 자동 무효화.
   - 디바이스 단위 캐시 제거 → 공동 모니터링과 일치.
4. **비용·안전 가드**
   - `user_context` 500자, `advice_style` enum, *주차당 호출 1회 + 1일 강제 새로고침 3회* 한도.
   - 사용량 메트릭: `ai_request_log(participant_id, week_no, tokens_in, tokens_out, cached, created_at)`.

**완료 조건**

- [ ] 동일 주차/참가자에 대해 친구 3명이 열어도 Grok 호출은 1회.
- [ ] 응답이 정의된 JSON 스키마를 100% 따른다 (서버에서 검증, 실패 시 1회 재시도 후 폴백).
- [ ] 카드에 *추세 라벨*(예: "정체 구간 · 3주차 이후 -0.1%p")이 명시적으로 보인다.

#### 2.5.2 대화형 모달 ("Grok 코치 챗")

**전제 정리**

> xAI Grok API는 *텍스트 채팅 모델 + 스트리밍*만 제공하며, **자체 세션/장기 메모리 기능은 없다.** 모바일 앱의 "Grok Companion(음성/동반자)"은 API로 노출되지 않는다.  
> 따라서 BurnFat에서는 **음성 기능을 제외하고**, *대화형 모달 + 우리가 직접 관리하는 세션·메모리 영속화*에 집중한다. 사용자 입장에서는 "지난 대화·약속·진행 상황을 모두 기억해 주는 매주의 코치"로 느껴지면 성공이다.

**핵심 설계 원칙**

1. AI 조언은 *카드 안에서 끝나는 단방향*에서 *모달 안에서 이어지는 대화*로 격상.
2. 세션과 컨텍스트(주간 기록, 지난 약속, 규제 정보)는 모두 **서버에 영속**. 클라이언트는 단지 *뷰*.
3. 비용·안전 가드는 처음부터 내장.

---

##### A. 진입 흐름 (UX)

- `<AIAdviceCard />`는 그대로 카드 형태를 유지하되, *"코치와 대화하기"* CTA가 카드 본문 하단에 항상 노출.
- 카드의 *summary / this_week_focus / cautions* 는 모달의 **첫 번째 어시스턴트 메시지**로 자동 시드(seed). 사용자는 빈 모달이 아니라 *바로 다음 질문을 던질 수 있는 화면*에서 시작.
- 모달 헤더:
  - 좌: 코치 아이콘 + "Grok 코치 · {참가자명} · {N}주차"
  - 우: 메뉴 (지난 주 세션 보기 · 코치 톤 변경 · 새 대화 시작 · 닫기)
- 모달 본문: 메시지 리스트(어시스턴트/사용자 풍선 + 타임스탬프 + 출처 인용 태그)
- 모달 푸터:
  - 입력 필드(자동 높이 1~5줄)
  - 빠른 답변 칩 3~4개 (예: "이번 주 정체 이유?", "내일 식단 추천 3가지", "운동 강도 줄여야 하나요?")
  - 토큰 게이지(이번 주 남은 호출/토큰)
- 모바일에서는 `fullScreen` 시트, 데스크톱에서는 `maxWidth="md"` 다이얼로그.

---

##### B. 데이터 모델

```sql
-- 주차별(또는 사용자가 명시적으로 새로 시작한) 대화 세션
CREATE TABLE coach_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id  UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_no         INTEGER NOT NULL,
  persona         TEXT NOT NULL DEFAULT 'friendly',   -- 'strict' | 'friendly' | 'scientist'
  status          TEXT NOT NULL DEFAULT 'active',     -- 'active' | 'archived'
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX coach_sessions_participant_week_idx ON coach_sessions(participant_id, week_no);

-- 한 세션 안의 발화. JSONB 대신 행 단위로 → 검색·삭제·페이지네이션 용이
CREATE TABLE coach_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES coach_sessions(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('system','assistant','user')),
  content         TEXT NOT NULL,
  tokens_in       INTEGER,
  tokens_out      INTEGER,
  references_jsonb JSONB,  -- 어떤 weekly_log/약속을 참조해 답했는지
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX coach_messages_session_created_idx ON coach_messages(session_id, created_at);

-- 참가자 단위 "장기 메모리" — 매 세션 종료 시 백엔드가 압축 갱신
CREATE TABLE participant_coach_memory (
  participant_id  UUID PRIMARY KEY REFERENCES participants(id) ON DELETE CASCADE,
  summary_md      TEXT NOT NULL,                -- "지난 약속/패턴/주의사항"의 markdown
  last_week_no    INTEGER,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

RLS는 *디바이스 토큰 보유자만 자신의 세션 read/write* 가 기본. 대결방 다른 멤버는 *기본 비공개*, 사용자가 토글로 공유 시에만 `coach_sessions.visibility='room'` 으로 열람 허용 (현 신뢰 기반 모델과 호환되는 옵트인).

---

##### C. 컨텍스트 조립 규칙 (백엔드 `burnfat_ai.py` 확장)

요청이 들어오면 서버에서 **단일 프롬프트를 매 호출마다 새로 조립**한다. (Grok은 무상태)

```
system  : [코치 시스템 프롬프트] + [persona 톤 지시] + [안전 가드]
system  : <PROFILE>  age, gender, height, target_body_fat
system  : <STATS>    delta_per_week[], regime_label, lifestyle_correlation (2.5.1의 산출물 재사용)
system  : <MEMORY>   participant_coach_memory.summary_md (없으면 생략)
messages: 최근 N턴 (기본 12턴, 토큰 임계 초과 시 가장 오래된 턴부터 잘라냄)
user    : 새 사용자 메시지
```

- **턴 잘라내기**: `tiktoken` 또는 문자 길이 기반 추정으로 *입력 총 토큰 ≤ 6,000*을 유지.
- **자동 압축**: 잘려나간 턴은 `archived_summary`로 묶어 다음 호출 시 `<MEMORY>` 블록에 합쳐 전달.
- **장기 메모리 갱신 시점**: ① 사용자가 *"세션 종료"* 버튼을 누름 ② 세션이 24h 유휴 ③ 새 주차의 첫 메시지 시. 갱신은 별도 비동기 작업으로 "기존 summary + 이번 세션 발화 → 새 summary(≤500토큰)"를 Grok에 한 번 더 호출.

---

##### D. 응답 처리 — 스트리밍 + 인용

- xAI Grok의 **SSE 스트리밍**을 사용해 토큰 단위로 클라이언트에 전달.
- 프론트는 `EventSource`(또는 `@microsoft/fetch-event-source`)로 수신하여 풍선을 실시간 업데이트.
- 시스템 프롬프트에 *"근거가 되는 weekly_log의 week_no 또는 memory 항목을 `[ref: W2]`처럼 표시하라"* 지시 → 프론트는 이를 파싱해 풍선 하단에 칩(`📍 2주차 기록`)으로 시각화. 신뢰성·근거성 강화.

---

##### E. 세션 / 컨텍스트 영속성의 사용자 체감

| 사용자 행동 | 시스템 반응 |
|------------|--------------|
| 모달 첫 진입 (해당 주차에 세션 없음) | 새 `coach_sessions` 생성. 어시스턴트 첫 메시지로 *주차 진단 카드*(2.5.1 산출물)를 자동 게시. |
| 모달 재진입 (해당 주차에 세션 있음) | 기존 세션 메시지 로드. *"지난번 우리가 단백질 1.5g/kg 시도해 보기로 했죠. 이번 주는 어땠어요?"* 같은 *맥락 잇기 시드* 메시지 1개를 어시스턴트로 자동 추가. |
| 새 주차로 진입 | 새 세션 생성. `<MEMORY>`에 직전 주까지의 요약을 포함해 시작. *"지난 2주 동안의 흐름과 약속을 이어서 본다"*는 멘트로 시작. |
| "지난 주 세션 보기" 메뉴 클릭 | `coach_sessions` 목록을 주차별 칩으로 표시, 클릭 시 읽기 전용 뷰. |
| "새 대화 시작" 메뉴 클릭 | 현재 세션은 `archived`, 새 `coach_sessions` 생성. 메모리는 유지. |
| "기억 초기화" (위험 액션) | 확인 다이얼로그 후 `participant_coach_memory` 삭제 + 모든 세션 `archived`. |

---

##### F. 비용·안전 가드

- **호출 한도**: 참가자당 *주당 메시지 30개* / *일 입력 토큰 30k, 출력 토큰 10k*. 푸터 토큰 게이지에 잔여 표시.
- **메시지 길이**: 사용자 메시지 ≤ 1,000자, 어시스턴트 응답 `max_tokens=600`.
- **안전 분류**: 의료/약물/체지방 5% 미만 목표/극단 단식 등은 시스템 프롬프트에 패턴 명시 → 거부 + 전문가 상담 권유 응답으로 폴백.
- **PII**: 사용자 메시지에 전화/이메일/주소 패턴 감지 시 저장 전 마스킹.
- **공유 모드**: 세션을 대결방에 공유한 경우, 응답 본문에 닉네임 외 *식별 가능 정보는 마스킹*한다는 점을 시스템 프롬프트에 강제.

---

##### G. 프론트 구현 단위

신규/수정 파일 (예시):

- `burnfat/src/components/CoachChatDialog.tsx` — 모달 컨테이너 + 메시지 리스트 + 입력 + 빠른 답변.
- `burnfat/src/components/CoachMessageBubble.tsx` — 어시스턴트/사용자 풍선 + 인용 칩.
- `burnfat/src/hooks/useCoachSession.ts` — 세션 로드/스트리밍 전송/캐시 무효화, `participant_id + week_no` 인자.
- `burnfat/src/lib/coachClient.ts` — SSE 수신, 토큰 카운트 추정.
- `burnfat/src/components/AIAdviceCard.tsx` — *"코치와 대화하기"* CTA 추가, 카드 콘텐츠를 모달 시드로 전달.
- `backend/routes/burnfat_ai.py` 또는 `backend/routes/burnfat_coach.py` 신규 엔드포인트 `POST /api/burnfat/coach/messages` (스트리밍), `GET /api/burnfat/coach/sessions`, `POST /api/burnfat/coach/sessions/:id/end` (메모리 압축 트리거).

---

##### H. 완료 조건 (DoD)

- [ ] AI 조언 카드에서 *"코치와 대화하기"* 진입 시, 직전 응답을 시드로 한 대화 모달이 1초 이내 열린다.
- [ ] 동일 주차 재진입 시 이전 메시지들이 그대로 복원된다 (`coach_messages` 페치).
- [ ] 새 주차 진입 시 `<MEMORY>`가 시스템 프롬프트에 포함되어, 어시스턴트가 *지난 주 약속*을 인용해 첫 메시지를 생성한다.
- [ ] 응답이 SSE 스트리밍으로 토큰 단위 렌더된다.
- [ ] 호출 한도·메시지 길이 제한이 백엔드에서 강제된다 (초과 시 4xx + 한국어 에러).
- [ ] *"기억 초기화"* 와 *"새 대화 시작"* 이 별도 액션으로 분리되어 있다.
- [ ] 의료/극단 다이어트 트리거 입력에 안전 폴백 응답이 나간다 (테스트 케이스 5개 통과).
- [ ] 세션 공유 토글이 OFF면 다른 대결방 멤버는 세션을 조회할 수 없다 (RLS 테스트).

---

### Sprint 3 — 6~8주차 (구조 개편 + 측정) ✅ **완료 (Phase A/B/C 전부, 2026-05-19, [`SPRINT3_FINAL_HANDOFF.md`](SPRINT3_FINAL_HANDOFF.md))**

Sprint 3 은 위험·범위를 고려해 **Phase A(저위험 인프라 정리)** / **Phase B(구조 개편)** /
**Phase C(E2E + 측정 + 종결)** 로 나눠 진행했으며, 세 단계 모두 완료되었다.

**Phase A — 저위험 인프라 정리 ✅ 완료 (2026-05-18, 커밋 `c27626f`, [`SPRINT3A_HANDOFF.md`](SPRINT3A_HANDOFF.md))**
- 배포 토폴로지 정리(root `railway.json` gunicorn 통일, README 배포 매트릭스).
- `challenges_public` VIEW 도입 — `.select('*')` 회귀를 구조적으로 차단.
- 운영 안전망 BE-1/2/3 — xAI 모델 부팅 검증, Grok 오류 본문 로깅, `last_advice_success_at` health 노출.
- Vitest 인프라(jsdom + testing-library) 셋업 + CI 배선. 실제 훅/컴포넌트 테스트는 Phase B.

**Phase B — 구조 개편 ✅ 완료 (2026-05-19, 커밋 `9bfd702`, [`SPRINT3B_HANDOFF.md`](SPRINT3B_HANDOFF.md))**
1. **`ChallengePage` 분해 ✅** — `ChallengePage.tsx` 1,262줄 → 345줄(73%↓). `useChallengeData`
   훅 + 신규 11개 파일(`rankAnimations`/`ChallengeHeader`/`ChallengeTabs`/3개 탭/`AdminPinDialog`/
   `ChallengeEditDialog`/`ChallengeOverlays`/`ParticipantsTabHeader`)로 분리.
   ⚠️ DoD ≤100줄은 미달(345줄) — 탭 교차 모달 조율이 페이지에 남음. 핸드오프 §1 참고.
2. **N+1 쿼리 제거 ✅** — `participants.select('*, submissions(*)')` 임베드. 진입 REST 호출 `2+N` → `3`.
3. **단위 테스트 ✅** — Vitest 48 → 79(신규 31). `useRecordStatus`/`useWeeklyLogs`/`useAIAdvice`/
   `useCoachSession`/`signedImage` + `deviceSecret` 보강.

**Phase C — E2E + 측정 + Sprint 3 종결 ✅ 완료 (2026-05-19, 커밋 `67bc07f`, [`SPRINT3_FINAL_HANDOFF.md`](SPRINT3_FINAL_HANDOFF.md))**
1. **Playwright E2E ✅** — 챌린지 핵심 경로 1개 스펙(생성→참가→기본정보→시작 인증(이미지 마스킹)→
   주간 기록→AI 조언→코치 대화→새로고침 유지). `page.route` 로 네트워크 전면 모킹 + `.env.test`
   이중 격리 → 운영 Supabase/Grok 호출 0건(테스트 내 request 리스너 검증). CI 배선 완료.
2. **분석 이벤트 ✅** — 도구 독립적 `track()` 래퍼(`lib/analytics.ts`, PII 자동 필터·no-op 폴백)
   + 6종 이벤트(challenge_created / participant_joined / submission_submitted /
   weekly_log_created / ai_advice_requested / coach_modal_opened·coach_message_sent). Plausible 채택.
3. **Sprint 3 종결 ✅** — [`SPRINT3_FINAL_HANDOFF.md`](SPRINT3_FINAL_HANDOFF.md) 작성,
   분기 백로그를 [`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md) 로 이관.

> ⚠️ MSW(playwright-msw) 는 msw@2(ESM)/playwright-msw@3(CJS) 비호환으로 Playwright 의 네이티브
> `page.route` 로 대체했다. 격리 보장은 동일. `ChallengePage` 추가 축소(`useChallengePage` 컨트롤러
> 훅)는 회귀 위험 대비 가치가 낮아 보류했다 — 상세는 핸드오프 §4.

### 분기 백로그 (3~6개월)

→ **[`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md) 로 이관됨.** Sprint 3 으로 본 보고서의
실행 로드맵은 공식 종료되며, 다음 분기 작업은 ROADMAP_NEXT 문서가 단일 출처다.

---

## 7. 측정 지표 제안

| 지표 | 정의 | 목표 (3개월) |
|------|------|--------------|
| **CR1 챌린지 완주율** | 시작 인증 → 종료 인증을 마친 참가자 비율 | 65% → 80% |
| **CR2 주간 기록 입력률** | 챌린지 기간 대비 입력된 주차 수 / 가능 주차 수 | 측정 시작 → 60% (Sprint 1.5 후) → 80% |
| **CR3 AI 조언 재방문률** | AI 조언 받은 사용자가 7일 내 챌린지에 재방문 | 측정 시작 → 70% |
| **CR4 코치 모달 진입률** | AI 조언 카드를 본 사용자 중 "코치와 대화하기" 모달을 연 비율 | - → 35% |
| **CR5 코치 멀티턴 평균** | 모달 진입 사용자의 세션 평균 메시지 수 | - → 4턴 이상 |
| **CR6 주차 간 컨텍스트 적중률** | 새 주차 첫 메시지가 `<MEMORY>` 항목을 인용한 비율 (자동 라벨링) | - → 80% |
| **GR1 챌린지 재생성률** | 종료 1주 내 동일 사용자가 새 챌린지를 만든 비율 | 미측정 → 25% |
| **GR2 외부 유입 비중** | 공유 링크(`?ref=share`)로 들어온 신규 사용자 비중 | 측정 시작 → 30% |
| **TECH1 RLS 보안 사고** | 의심 데이터 변경 리포트 건수 | - → 0건 |
| **TECH2 LCP (모바일 4G)** | Lighthouse 모바일 LCP | 현재 측정 → 2.5s 이하 |

---

## 8. 빠른 체크리스트 (개발자가 바로 활용)

**보안**
- [ ] `admin_pin` → 해시 컬럼 + RPC 검증
- [ ] `submissions.UPDATE`/`weekly_logs.UPDATE` RLS 조건 강화
- [ ] Storage 버킷 Private + signed URL
- [ ] CORS origin 화이트리스트 (`burnfat.wodybody.com` only)
- [ ] AI API `user_context` 길이 제한 500자

**UX**
- [ ] 모든 인터랙티브 요소 최소 44×44px 터치 영역
- [ ] 메달·상태 표시에 색상 외 텍스트/아이콘 병행
- [ ] `prefers-reduced-motion`을 데코 애니메이션에도 적용
- [ ] 개인 상태 카드 + D-Day 칩
- [ ] 종료 후 결과 카드 PNG 공유
- [ ] 1개 이상 주간 기록 있어도 *다음 주차* 입력 버튼이 항상 노출
- [ ] `WeeklyLogForm` 진입 시 충돌 주차는 선택 불가 + 미입력 주차 자동 추천
- [ ] AI 조언 카드에 추세 라벨(정체/가속/반등) 명시
- [ ] AI 조언 카드의 "코치와 대화하기" CTA → 대화형 모달 진입
- [ ] 동일 주차 재진입 시 이전 메시지 복원, 새 주차 진입 시 장기 메모리 인용
- [ ] 백엔드 SSE 스트리밍 + 호출/토큰 한도 강제

**코드**
- [ ] `ChallengePage` 5~7개 컴포넌트로 분할
- [ ] Supabase 임베드 쿼리로 N+1 제거
- [ ] 디버그 플래그 → env로 이동
- [ ] `recharts`/`html-to-image` lazy import
- [ ] Vitest + Playwright + CI 라인 추가

---

## 9. Sprint 3 종결 — 다음 분기로

Sprint 0 → 3(Phase A/B/C)으로 본 보고서의 실행 로드맵은 **공식 종료**된다. 다음 분기 작업의
단일 출처는 [`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md) 이며, Sprint 3 통합 결과·
운영자 작업·잔여 항목은 [`SPRINT3_FINAL_HANDOFF.md`](SPRINT3_FINAL_HANDOFF.md) 를 참고한다.

---

## 10. 부록 — 분석 시 참고한 파일

- `burnfat/src/App.tsx`
- `burnfat/src/pages/HomePage.tsx`, `CreateChallengePage.tsx`, `ChallengePage.tsx`
- `burnfat/src/components/` 전체 (`SubmitModal`, `ImageMaskEditor`, `WeeklyLogForm`, `AIAdviceCard`, `AllParticipantsChart`, `WeeklyLogChart`, `RecordStatusSummary`, `ParticipantWeeklyLogCard`, `ChallengePageSkeleton`, `UpdateNoticeDialog`, `WeeklyLogsUpgradeNoticeDialog`, `ParticipantBasicInfoDialog`)
- `burnfat/src/hooks/` (`useRecordStatus`, `useWeeklyLogs`, `useAIAdvice`)
- `burnfat/src/lib/edgeFunctions.ts`, `burnfat/src/types/`
- `burnfat/supabase/migrations/` (특히 `20260423000001_ranking_unlocked`, `20260423000002_weekly_logs_lifestyle`, `20260423000003_admin_pin`, `20260424000001_rls_update_policies`)
- `burnfat/docs/` (`TECH.md`, `PRODUCT_PLAN_V2.md`, `MOBILE_REVIEW.md`, `AI_ADVICE_SETUP.md`, `AI_COST_ALTERNATIVES.md`, `DB_SETUP_CHECKLIST.md`, `TECH_ARCHITECTURE_V2.md`, `DEPLOY.md`, `DEPLOYMENT_V2.md`)
- `backend/routes/burnfat_ai.py`

---

*이 문서는 코드와 문서 스냅샷(2026-05-14) 기준이며, 우선순위·노력 추정은 1인 풀스택 개발자 기준이다. 팀 규모·외부 디자이너 가용성에 따라 Sprint 길이는 조정 가능하다.*

---

## 11. 핫픽스 로그

| 날짜 | 배포 | 증상 | 핵심 변경 | 상세 |
|------|------|------|----------|------|
| 2026-05-14 | Sprint 0 직후 회귀 | 모든 챌린지 페이지가 `permission denied for column admin_pin_hash` 로 진입 차단 | `challenges` 조회를 `select('*')` → `CHALLENGE_PUBLIC_COLUMNS` 명시 SELECT 로 변경. 컬럼 레벨 GRANT 와 `select('*')` 의 충돌을 해소. | [`SPRINT0_HANDOFF.md`](SPRINT0_HANDOFF.md) §3.5 |
