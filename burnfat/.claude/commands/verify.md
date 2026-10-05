---
description: tsc + vitest + build 풀 검증
allowed-tools: Bash(npx tsc *), Bash(npx vitest *), Bash(npm run build)
---

# /verify

burnfat 코드의 전체 정합성을 검증해줘.

순서대로 실행하고, 각 단계 결과를 한국어로 요약:

1. `npx tsc --noEmit` — 타입 오류
2. `npx vitest run --reporter=dot` — 단위 테스트 (현재 기준 ≥ 48개 통과해야 함)
3. `npm run build` — 프로덕션 빌드 (Vite)

하나라도 실패하면 **거기서 멈추고** 실패 원인의 파일·라인·메시지 3가지를 정리.
전부 통과하면 ✅ 한 줄과 통과 테스트 개수, 빌드 시간만 보고.
