---
description: Playwright E2E 시나리오 실행 + 실패 시 트레이스 안내
argument-hint: <시나리오 경로 또는 grep 패턴, 비우면 전체>
allowed-tools: Read, Glob, Bash(npx playwright *), Bash(npm run e2e*), Bash(git status)
---

# /e2e-run $1

burnfat 의 Playwright E2E 시나리오를 실행한다. (Sprint 3 Phase C 도입 기준)

## 1) 사전 점검

- `burnfat/playwright.config.ts` 존재 여부 확인
- `package.json` 의 `devDependencies` 에 `@playwright/test` 가 있는지 확인
- 없다면 **여기서 멈추고** 다음 셋업 안내를 출력하고 종료:
  ```
  cd burnfat
  npm i -D @playwright/test
  npx playwright install --with-deps chromium
  npx playwright init
  ```

## 2) 실행

- 인자 `$1` 가 비어 있으면 → `npx playwright test`
- 비어 있지 않으면 → `npx playwright test "$1"`
- 항상 `--reporter=list` 추가, CI 가 아닌 로컬이라면 `--workers=2`

## 3) 결과 보고 (한국어)

- 통과/실패/스킵 개수
- 실패가 있으면 각 케이스별로:
  - 시나리오 제목
  - 실패한 스텝 (한 줄)
  - **trace 파일 경로** (`playwright-report/` 또는 `test-results/.../trace.zip`)
  - `npx playwright show-trace <path>` 명령어 한 줄
- 통과만 있으면 ✅ 와 총 시간만

## 4) 새 시나리오 추가 시 따를 패턴 (참고)

신규 시나리오는 `burnfat/e2e/` 아래에 두고, 다음 3개를 반드시 포함:

1. **챌린지 생성 흐름** — `/create` → admin_pin 설정 → 코드 발급 → 입장
2. **참가자 인증** — `SubmitModal` → 이미지 마스킹 → Storage 업로드 → device_secret 저장 확인
3. **주간 기록 + AI 조언** — `WeeklyLogForm` → `useNextRecordableWeek` 다음 차주 CTA → AI 조언 캐시 hit

각 시나리오는 `data-testid` 기반 셀렉터를 사용해야 한다 (텍스트 의존 금지).
