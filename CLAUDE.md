# Claude Code 작업 가이드 (wodybody / burnfat)

이 파일은 Claude Code 세션이 이 레포에 들어왔을 때 *가장 먼저* 읽어야 할 컨텍스트입니다.

---

## 1. 레포 개요

`Daesung-Kwon/wodybody` 는 모노레포 형태입니다.

```
crossfit-system/
├── backend/                 # Flask (Railway) — wodybody 코어 + burnfat AI 프록시
├── mobile/                  # Capacitor 7 (iOS/Android) 셸
├── burnfat/                 # ★ 본 작업의 주 무대 (체지방 감량 다이어트 내기 SPA)
│   ├── src/
│   ├── supabase/migrations/
│   ├── docs/
│   └── package.json
└── docs/                    # 모노레포 전반 문서
```

> **이 가이드는 `burnfat/` 디렉터리 작업을 전제로 작성되었습니다.** 다른 패키지 작업 시에는 해당 패키지의 README를 우선 참고하세요.

---

## 2. burnfat 한눈에 보기

| 항목 | 내용 |
|------|------|
| 유형 | 지인 기반 체지방 감량 베팅·트래킹 모바일 SPA |
| Frontend | Vite + React 18 + TypeScript + MUI 7 |
| Data | Supabase (PostgreSQL + Storage) |
| AI 조언 | Flask (Railway) → xAI Grok 프록시 |
| Hosting | Vercel (`burnfat.wodybody.com`) |
| 라우트 | `/`, `/create`, `/c/:code` |
| 핵심 테이블 | `challenges`, `participants`, `submissions`, `weekly_logs` |
| 보안 모델 | 신뢰 기반 공개형 + 디바이스 시크릿(쓰기 잠금) — 자세한 내용은 §5 |

---

## 3. 현재 진행 중인 작업 — Sprint 단위 로드맵

**모든 후속 작업의 단일 출처:** [`burnfat/docs/IMPROVEMENT_REPORT_2026-05.md`](burnfat/docs/IMPROVEMENT_REPORT_2026-05.md)

스프린트 순서 / 상태 (2026-05-14 기준):

| Sprint | 주제 | 상태 |
|--------|------|------|
| **0** | 보안 응급 처치 (PIN 해시 / UPDATE 잠금 / 이미지 signed URL / 디버그 플래그) | ✅ **완료** — commit `64315d3`, 프로덕션 배포·DB 적용·검증 완료. 상세: [`burnfat/docs/SPRINT0_HANDOFF.md`](burnfat/docs/SPRINT0_HANDOFF.md) |
| **1** | UX 빠른 승 (개인 상태 카드 / D-Day / 랭킹 공유 이미지 / a11y 1차 패스) | ✅ **완료** — `MyStatusCard`+`useParticipantIdentity` / `DDayChip`+`EndingSoonDialog` / `RankingShareDialog`(html-to-image) / a11y(aria-label·role=img·메달 텍스트·라인 점선) / 백필 토스트 + vitest 29/29. 상세: [`burnfat/docs/SPRINT1_HANDOFF.md`](burnfat/docs/SPRINT1_HANDOFF.md) |
| **1.5** | 주간 기록 입력 UX 정상화 (다음 차주 CTA / placeholder / `useNextRecordableWeek`) | ✅ **완료** — `useNextRecordableWeek` hook + 영구 CTA + 미입력 주차 placeholder + WeeklyLogForm 충돌 차단 + 누적 입력률 막대 + vitest 12/12. 상세: [`burnfat/docs/SPRINT1_5_HANDOFF.md`](burnfat/docs/SPRINT1_5_HANDOFF.md) |
| **2** | AI 조언 서버 캐시 + JSON 응답 / 목표 진행률 / 챌린지 템플릿 | ✅ **완료 (코드)** — `weekly_ai_advice` 캐시 테이블 + `burnfat_ai.py` JSON 구조화·서버 캐시·입력 가드 / `GoalProgressWidget`+`goalProgress.ts` / `ChallengeTemplatePicker`+`challengeTemplates.ts` + vitest 44/44. ⚠️ 마이그레이션·백엔드 배포 필요. 상세: [`burnfat/docs/SPRINT2_HANDOFF.md`](burnfat/docs/SPRINT2_HANDOFF.md) |
| **2.5** | 대화형 코치 모달 + 세션·장기 메모리 영속화 | ✅ **완료 (코드)** — `coach_sessions`/`coach_messages`/`participant_coach_memory` 마이그레이션 3건 + `burnfat_coach.py`(SSE 스트리밍·세션·메모리·가드) + `CoachChatDialog`/`useCoachSession`/`coachClient` + AIAdviceCard "코치와 대화하기" CTA. ⚠️ 마이그레이션·백엔드 배포 필요. 상세: [`burnfat/docs/SPRINT2_5_HANDOFF.md`](burnfat/docs/SPRINT2_5_HANDOFF.md) |
| **3 — Phase A** | 배포 토폴로지 정리 / `challenges_public` VIEW / 운영 안전망 BE-1·2·3 / Vitest 인프라(jsdom) | ✅ **완료 (코드)** — root `railway.json` gunicorn 통일 + README 배포 매트릭스 / `challenges_public` VIEW 마이그레이션 + 클라이언트 전환 / `burnfat_ai.py`·`burnfat_coach.py` 모델 부팅 검증·Grok 오류 본문 로깅·`last_advice_success_at` health 노출 / Vitest jsdom + testing-library + CI 배선 + vitest 48/48. ⚠️ VIEW 마이그레이션 적용·백엔드 배포 필요. `backend/railway.*` 삭제는 보류(Root Directory `/backend`). 상세: [`burnfat/docs/SPRINT3A_HANDOFF.md`](burnfat/docs/SPRINT3A_HANDOFF.md) |
| **3 — Phase B** | ChallengePage 분해 / N+1 제거 / 훅·lib 단위 테스트 | ✅ **완료 (코드)** — `ChallengePage.tsx` 1,262→345줄 + `useChallengeData` 훅·신규 11개 파일 분리 / `participants.select('*, submissions(*)')` 임베드로 진입 REST `2+N`→`3` / Vitest 48→79. ⚠️ DoD ≤100줄 미달(345줄, 탭 교차 모달 조율 잔존). 배포·DB 변경 없음(프런트 전용). 상세: [`burnfat/docs/SPRINT3B_HANDOFF.md`](burnfat/docs/SPRINT3B_HANDOFF.md) |
| **3 — Phase C** | Playwright E2E / 분석 이벤트 / ChallengePage 추가 축소 | ⏳ 미착수 |

작업 시작 시 항상 다음 순서를 지키세요.

1. **이 파일을 읽고** 현재 상태를 파악.
2. `burnfat/docs/IMPROVEMENT_REPORT_2026-05.md` 의 해당 Sprint 섹션을 *전부* 읽기.
3. 직전 Sprint 의 핸드오프 문서(`SPRINT<N>_HANDOFF.md`) 가 있으면 읽기.
4. 변경 전 `git status`로 충돌 없는지 확인.
5. 작업 후에는 새 핸드오프 문서를 작성해 다음 세션이 매끄럽게 이어받게 함.

---

## 4. 자주 쓰는 명령

```bash
cd burnfat

# 개발 서버
npm run dev               # Vite dev server (기본 http://localhost:5173)

# 타입 검사 (빠름)
npx tsc --noEmit

# 풀 빌드 (배포 전 검증)
npm run build             # = tsc && vite build

# Supabase 마이그레이션
#   SQL Editor 에 파일 내용을 붙여넣거나
#   supabase db push  (CLI 사용 시)
```

---

## 5. 보안 모델 (Sprint 0 이후 현행)

| 영역 | 정책 |
|------|------|
| **challenges.admin_pin** | bcrypt 해시(`admin_pin_hash`)만 DB에 존재. 평문 컬럼은 DROP됨. 클라이언트는 `has_admin_pin: boolean` (generated column) 만 SELECT 가능. |
| **PIN 검증** | `supabase.rpc('verify_admin_pin', { p_challenge_id, p_pin })` — 4자리 숫자 검증 + bcrypt 비교. PIN 미설정 챌린지는 항상 true. |
| **챌린지 생성** | `supabase.rpc('create_challenge_with_pin', …)` — 서버에서 bcrypt 해시 후 INSERT. |
| **submissions / weekly_logs UPDATE** | 익명 RLS 정책 *전면 제거*. RPC `update_submission` / `update_weekly_log` 만 가능, SHA-256 device_secret 일치 + 24h 윈도우 강제. |
| **device_secret** | 클라이언트가 INSERT 시 32B 랜덤 발급 → SHA-256 hex 를 서버 저장, plain 은 localStorage(`burnfat:device:<table>:<row_id>`). 헬퍼: [`src/lib/deviceSecret.ts`](burnfat/src/lib/deviceSecret.ts). |
| **이미지** | `inbody` 버킷 **Private**. `submissions.image_url` 에는 storage path 만 저장. 표시 시 `resolveImageUrl()` → `createSignedUrl(7일)`. 헬퍼: [`src/lib/signedImage.ts`](burnfat/src/lib/signedImage.ts). |
| **디버그 플래그** | `VITE_DEBUG_SHOW_RANKING`, `VITE_DEBUG_ALLOW_EARLY_END_SUBMIT` — 운영에선 미설정/`false`. 자세한 내용: `.env.example`. |

신규 작업 시에도 위 패턴(특히 device_secret 흐름과 signed URL 흐름)을 유지하세요.

---

## 6. 코딩 컨벤션

- **MUI sx 인라인 keyframes 지양**: Sprint 3 에서 분해 예정이지만, 새 컴포넌트에서는 처음부터 `styled()` 또는 CSS 변수로 추출.
- **컴포넌트 책임**: `ChallengePage.tsx` 가 이미 ~1,080줄. 새 기능은 **신규 컴포넌트/hook** 으로 분리하고, 기존 파일에는 *진입 코드* 만 추가.
- **빈 상태/에러/로딩 3종 세트**: 새 화면을 만들 때 반드시 처리. 빈 상태 메시지는 사용자가 다음에 무엇을 해야 하는지 한 문장으로 알려주는 형태.
- **a11y 기본**: 모든 IconButton 에 `aria-label`, 색상 단독 정보 금지(메달/상태는 텍스트+아이콘 병행).
- **i18n**: 본문은 한국어. 코드 주석은 한국어 우선, 핵심 보안/플로우 설명은 한국어 + 영어 키워드 병기.
- **타입 안정성**: `any` 금지. `unknown` 후 좁히기 또는 명시 타입.
- **에러 메시지**: 사용자 눈에 보이는 메시지는 한국어, 콘솔 로그는 영어 OK.

---

## 7. 자주 만지는 핵심 파일 지도

| 파일 | 책임 |
|------|------|
| `burnfat/src/App.tsx` | 라우트 3개 |
| `burnfat/src/pages/HomePage.tsx` | 코드 입력 → 챌린지 진입 |
| `burnfat/src/pages/CreateChallengePage.tsx` | 챌린지 생성 (RPC 기반) |
| `burnfat/src/pages/ChallengePage.tsx` | **메가 컴포넌트** — 3-탭(참가자/순위/주간 기록), PIN 다이얼로그, 챌린지 편집 등 |
| `burnfat/src/components/SubmitModal.tsx` | 시작/종료 인증 (이미지 마스킹 + Storage) |
| `burnfat/src/components/WeeklyLogForm.tsx` | 주간 기록 입력 |
| `burnfat/src/components/AIAdviceCard.tsx` | AI 조언 카드 (Sprint 2.5 에서 대화 모달 진입점으로 격상 예정) |
| `burnfat/src/components/ParticipantWeeklyLogCard.tsx` | 참가자별 주간 기록 카드 (Sprint 1.5 의 핵심 수정 대상) |
| `burnfat/src/hooks/useWeeklyLogs.ts` | weekly_logs CRUD — update 는 RPC 사용 |
| `burnfat/src/hooks/useAIAdvice.ts` | Grok 조언 요청 + 24h 캐시 (Sprint 2 에서 서버 캐시로 이전 예정) |
| `burnfat/src/lib/deviceSecret.ts` | INSERT 시 device_secret 발급/저장 |
| `burnfat/src/lib/signedImage.ts` | path → signed URL 해석 |
| `backend/routes/burnfat_ai.py` | Flask + xAI Grok 프록시 (Sprint 2/2.5 에서 확장 예정) |

---

## 8. 다음 작업 추천 진입점

가장 자연스러운 다음 단계는 다음 셋 중 하나입니다. 사용자가 명시하지 않았다면 *Sprint 1.5* 부터 권장합니다 — 실제 보고된 버그(다음 차주 입력 버튼 미노출)를 해결하면서 코어 가치(주차별 누적 데이터)에 직결됩니다.

1. **Sprint 1.5 — 주간 기록 입력 UX 정상화**  
   진입 파일: `burnfat/src/components/ParticipantWeeklyLogCard.tsx`, `burnfat/src/components/WeeklyLogForm.tsx`  
   신규 hook: `burnfat/src/hooks/useNextRecordableWeek.ts`

2. **Sprint 1 — UX 빠른 승**  
   진입 파일: `burnfat/src/pages/ChallengePage.tsx` (Tab 0 상단), 신규 `burnfat/src/lib/participantIdentity.ts`

3. **Sprint 2.5 — 대화형 코치 모달**  
   진입 파일: `burnfat/src/components/AIAdviceCard.tsx`, 신규 `burnfat/src/components/CoachChatDialog.tsx`, 신규 마이그레이션 `coach_sessions`/`coach_messages`/`participant_coach_memory`, 백엔드 `backend/routes/burnfat_coach.py` (또는 `burnfat_ai.py` 확장)

각 Sprint 의 *완료 조건(DoD)* 은 `IMPROVEMENT_REPORT_2026-05.md` 의 해당 섹션을 기준으로 합니다.
