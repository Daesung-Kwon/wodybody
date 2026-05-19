# Sprint 3 최종 핸드오프 — Phase A/B/C 통합 + Sprint 3 종결 선언

> **상태**: ✅ 완료 — Sprint 3 의 세 단계(A/B/C) 전부 종료.
> **날짜**: 2026-05-19
> **대상**: `burnfat/` (Phase C 는 프런트엔드 전용 — `backend/` 무변경)
> **이 문서**: Sprint 3 전체의 단일 마무리 보고서. Phase별 상세는 각 핸드오프 참조.

---

## 1. Phase A/B/C 통합 요약

| Phase | 주제 | 커밋 | 한 줄 요약 |
|-------|------|------|-----------|
| **A** | 저위험 인프라 정리 | `c27626f` | `challenges_public` VIEW · 배포 토폴로지 정리 · 운영 안전망 BE-1/2/3 · Vitest(jsdom) 인프라. 상세: [`SPRINT3A_HANDOFF.md`](SPRINT3A_HANDOFF.md) |
| **B** | 구조 개편 | `9bfd702` | `ChallengePage` 1,262→345줄 분해(11개 신규 파일) · N+1 제거(`2+N`→`3`) · Vitest 48→79. 상세: [`SPRINT3B_HANDOFF.md`](SPRINT3B_HANDOFF.md) |
| **C** | E2E + 측정 + 종결 | `<Phase C 커밋 SHA>` | Playwright E2E 1스펙(핵심 경로 11단계) · 분석 이벤트 6종(`track()` 래퍼) · Sprint 3 종결 문서. 본 문서. |

### Phase C 세부 산출물

**C1 — Playwright E2E**
- `playwright.config.ts` — `testDir: e2e`, chromium, `retries: CI?1:0`, `trace: retain-on-failure`,
  webServer 는 `vite --mode test` 로 기동(`.env.test` 로드).
- `e2e/critical-path.spec.ts` — 1 스펙 11단계: 홈 → 대결 생성 → 진입 → 참가 → 기본정보 →
  시작 인증(이미지 업로드·마스킹) → 주간 기록 → AI 조언 → 코치 대화 → 새로고침 후 데이터 유지.
- `e2e/fixtures/handlers.ts` — 네트워크 모킹. PostgREST(필터·임베드·RPC)/Storage/AI/코치 SSE 를
  stateful in-memory 스토어로 흉내. 스토어는 테스트 프로세스에 살아 페이지 새로고침에도 유지.
- `e2e/fixtures/test.ts` — `mockApi` auto 픽스처(테스트별 새 스토어), `e2e/fixtures/inbody.jpg`(2.8KB).
- **격리 이중화**: ① `.env.test` 가 Supabase/AI URL 을 모두 localhost 로 고정 ②`page.route` 가
  전 요청을 가로채 모킹. 스펙의 request 리스너가 운영 도메인(`.supabase.co` 운영 프로젝트,
  `wodybody-production.up.railway.app`) 호출 **0건**을 직접 단언한다.
- `package.json` — `e2e` / `e2e:ui` 스크립트. `.github/workflows/burnfat.yml` 에 E2E step 배선.

> ⚠️ **MSW → page.route 대체**: 당초 스펙은 MSW(playwright-msw)였으나 `playwright-msw@3`(CJS)이
> `msw@2`(ESM)를 Playwright 의 require 로더 안에서 불러올 수 없어(ESM/CJS cycle) 기동 불가였다.
> Playwright 네이티브 `page.route` 로 동등 구현했고 — 격리 보장(운영 호출 0건)은 동일하다.
> `msw`·`playwright-msw` 의존성은 제거했다.

**C2 — 분석 이벤트**
- `src/lib/analytics.ts` — 도구 독립 `track(event, props)` 래퍼. `VITE_ANALYTICS_DOMAIN`
  미설정 시 no-op. PII(이메일/전화/닉네임 등) 키·값 자동 필터. fire-and-forget.
- 이벤트 6종(호출 위치):
  1. `challenge_created` — `CreateChallengePage` navigate 직전 (stake_amount, has_admin_pin, duration_days)
  2. `participant_joined` — `ParticipantsTabHeader.handleJoin` 성공 후 (challenge_age_days)
  3. `submission_submitted` — `SubmitModal` onSuccess (type, body_fat_rate_bucket)
  4. `weekly_log_created` — `WeeklyLogForm` onSuccess (week_no, has_lifestyle)
  5. `ai_advice_requested` — `useAIAdvice` fetch 직후 (cached, force_refresh, has_user_context)
  6. `coach_modal_opened` — `CoachChatDialog` 첫 open (week_no, persona)
     · `coach_message_sent` — `useCoachSession` SSE done 시 (turn_index, persona)
- `index.html` — Plausible script 태그(`data-domain="burnfat.wodybody.com"`).
- 테스트: `src/lib/__tests__/analytics.test.ts` — PII 가드 + no-op/전송 분기.

**C3 — Sprint 3 종결**
- 본 문서(`SPRINT3_FINAL_HANDOFF.md`), [`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md),
  [`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) §9 마무리 갱신.

---

## 2. Sprint 3 전체 DoD 체크

| # | 항목 | 결과 |
|---|------|------|
| 1 | Phase A — `challenges_public` VIEW 도입 + 클라이언트 전환 | ✅ |
| 2 | Phase A — 배포 토폴로지 정리 / README 배포 매트릭스 | ✅ |
| 3 | Phase A — 운영 안전망 BE-1/2/3 | ✅ |
| 4 | Phase A — Vitest jsdom 인프라 + CI 배선 | ✅ |
| 5 | Phase B — `ChallengePage` 분해 (1,262→345줄, 11개 신규 파일) | ✅ (DoD ≤100줄은 미달 — §4) |
| 6 | Phase B — N+1 제거 (진입 REST `2+N`→`3`) | ✅ |
| 7 | Phase B — 훅·lib 단위 테스트 (48→79) | ✅ |
| 8 | Phase C — Playwright E2E 1 스펙 (11단계) | ✅ |
| 9 | Phase C — `npm run e2e` 0 exit (로컬) | ✅ |
| 10 | Phase C — E2E 운영 도메인 호출 0건 (request 리스너 단언) | ✅ |
| 11 | Phase C — 분석 이벤트 6종 코드 호출 위치 반영 | ✅ |
| 12 | Phase C — Plausible 스크립트 삽입 + `track()` 래퍼 | ✅ |
| 13 | Phase C — PII 가드 단위 테스트 | ✅ |
| 14 | Phase C — CI 에 E2E step 추가 | ✅ |
| 15 | 공통 — `tsc --noEmit` 0 exit | ✅ |
| 16 | 공통 — `npm test` (Vitest 86 통과) | ✅ |
| 17 | 공통 — `npm run build` 성공 | ✅ |
| 18 | Phase C — Sprint 3 종결 문서 3건 작성·갱신 | ✅ |

검증 수치: `tsc` 0 exit · Vitest **86/86**(Phase A 48 + B 31 + C 7) · E2E **1/1**(11단계) · build 성공.

---

## 3. 운영자 실행 작업 (통합)

| 작업 | 시점 | 비고 |
|------|------|------|
| `challenges_public` VIEW 마이그레이션 적용 | Phase A 시점에 적용 완료 가정 | 미적용 시 [`SPRINT3A_HANDOFF.md`](SPRINT3A_HANDOFF.md) §3 SQL 실행 |
| **`VITE_ANALYTICS_DOMAIN` 환경변수 등록** | Phase C 배포 후 | Vercel(burnfat) 환경변수에 `burnfat.wodybody.com` 설정 → 6종 이벤트 전송 활성화. 미설정 시 `track()` 은 no-op. `.env.example` 참고. |
| Plausible 대시보드 사이트 등록 | Phase C 배포 후 | `index.html` 의 `data-domain` 과 일치하는 사이트를 Plausible 에 생성. |
| 운영 검증 — burnfat.wodybody.com 평소 사용 1회 | 배포 Ready 후 | Plausible 대시보드에서 6종 이벤트 첫 도착 확인. |

> Phase C 는 DB/백엔드 변경이 없다. Vercel 자동 배포만으로 프런트가 반영된다.

---

## 4. 알려진 잔여

- **gunicorn 블로커** — 본 Phase C 범위 외. eventlet 0.36.1 + WSGI 타깃 교정으로 이미
  해소되어 별도 커밋(`c8fc7c8`)으로 재전환됨. 운영 검증은 [`SPRINT3A_HANDOFF.md`](SPRINT3A_HANDOFF.md)
  §4 참고. Phase C 에서 `backend/` 는 일절 건드리지 않았다.
- **`ChallengePage` ≤100줄 미달 (현 345줄)** — Phase B 결과 유지. 탭 교차 모달 8개의 조율
  상태가 페이지에 남아 컨트롤러 훅(`useChallengePage`) 이관이 필요한데, "회귀 0" 대비 가치가
  낮아 보류. 후속 안전 작업으로 분기 백로그에 둘 수 있다.
- **MSW 미사용** — §1 의 ⚠️ 참고. `page.route` 대체로 격리 목표는 달성.
- **분기 백로그 이관** — 5개 항목(G1 PDF, G2 카카오, G3 재시작, P1 팀 모드, S1 Auth, S2 모드
  토글)을 [`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md) 로 이관. `IMPROVEMENT_REPORT`
  의 분기 백로그 섹션에는 포인터만 남겼다.

---

## 5. Sprint 3 = IMPROVEMENT_REPORT 의 공식 종료

[`IMPROVEMENT_REPORT_2026-05.md`](IMPROVEMENT_REPORT_2026-05.md) 의 실행 로드맵
(Sprint 0 → 1 → 1.5 → 2 → 2.5 → 3)은 **Sprint 3 으로 공식 종료**된다.
보안 응급 처치부터 UX 빠른 승·AI 코치·구조 개편·E2E·측정까지 계획된 전 범위가 완료됐다.
이후 작업의 단일 출처는 [`ROADMAP_NEXT_2026-Q3.md`](ROADMAP_NEXT_2026-Q3.md) 다.

---

## 6. 다음 단계 권유

둘 중 하나를 권한다.

1. **분기 백로그 진입** — `ROADMAP_NEXT_2026-Q3.md` §5 의 권장 순서대로 G3(재시작 1-click)
   → G2(카카오 공유) 부터. 작고 리텐션·유입 지표와 직결되는 빠른 승.
2. **운영 안정화 기간** — 신규 기능 대신 한 분기를 ① gunicorn 재전환 운영 검증
   ② 분석 이벤트 첫 데이터 수집·funnel 구성 ③ 사용자 피드백 수렴에 투입.

분석 이벤트가 막 부착됐으므로, 데이터가 1~2주 쌓인 뒤 의사결정하는 것도 합리적이다.

---

## 7. 롤백 가이드

- **Phase C 는 프런트 전용** (DB·RPC·백엔드 무변경). 긴급 시 Vercel Deployments 에서
  직전 배포로 *Promote to Production*.
- 코드 롤백은 Phase C 커밋 1건 revert 로 완결.
- **분석 이벤트만 끄기**: `VITE_ANALYTICS_DOMAIN` 환경변수를 제거(또는 미설정)하면
  `track()` 이 no-op 이 된다 — 코드 롤백 없이 즉시 비활성화 가능.
- **Plausible script 제거**: `index.html` 의 script 태그 1줄 삭제.
- E2E(`e2e/`)·테스트 설정은 런타임 산출물에 영향이 없어 롤백 대상이 아니다.

— 끝 —
