---
description: burnfat 분석 이벤트 구현 점검 (Sprint 3 Phase C)
allowed-tools: Read, Grep, Glob
---

# /analytics-audit

burnfat 의 분석 이벤트(Sprint 3 Phase C 도입 예정) 구현 상태를 점검한다.

## 1) 이벤트 트리거 위치 검색

다음 패턴을 `burnfat/src/` 안에서 모두 찾기:

- `track(`
- `analytics.track(`
- `analytics.capture(`
- `posthog.capture(`
- `window.gtag(`
- `useAnalytics(`

결과는 파일·라인·해당 줄의 이벤트 이름(literal string)을 표로 정리.

## 2) Sprint 3 Phase C 권장 이벤트 목록과 대조

다음 8개 이벤트가 반드시 트래킹되어야 한다 (IMPROVEMENT_REPORT_2026-05.md 의 Sprint 3 Phase C 섹션 — 미착수 시 본인 판단으로 권장값 사용):

| 이벤트 키 | 트리거 위치 | 필수 속성 |
|---|---|---|
| `challenge_created` | `CreateChallengePage` 성공 핸들러 | `challenge_id`, `duration_days`, `template_id?` |
| `challenge_entered` | `HomePage` 코드 입장 성공 | `challenge_id`, `via` (code\|deep_link) |
| `submission_started` | `SubmitModal` 열기 | `challenge_id`, `kind` (start\|end) |
| `submission_completed` | `SubmitModal` 업로드 성공 | `challenge_id`, `kind`, `duration_ms`, `has_image` |
| `weekly_log_saved` | `WeeklyLogForm` 저장 성공 | `challenge_id`, `week_index`, `kg_delta` |
| `ai_advice_viewed` | `AIAdviceCard` 마운트 | `challenge_id`, `cache_hit` |
| `coach_session_opened` | `CoachChatDialog` open | `challenge_id`, `entry` (card\|cta) |
| `ranking_shared` | `RankingShareDialog` 공유 버튼 | `challenge_id`, `channel` (image\|copy) |

## 3) 출력

- 구현된 이벤트 목록 (✅)
- 누락된 이벤트 목록 (❌) — 어디에 추가해야 하는지 권장 파일 경로 1개씩
- 속성이 빠진 이벤트 (⚠️) — 어떤 속성이 빠졌는지 명시
- 마지막에 "다음 PR 한 줄 제목 후보" 3개

**자동 코드 수정 금지** — 보고만 한다. 실제 추가는 사용자가 별도 세션에서.
