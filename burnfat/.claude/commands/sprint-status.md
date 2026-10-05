---
description: burnfat 현재 Sprint 진행 상태 요약
allowed-tools: Read, Grep, Glob, Bash(git log*)
---

# /sprint-status

`burnfat/docs/IMPROVEMENT_REPORT_2026-05.md` 와 `burnfat/docs/SPRINT*_HANDOFF.md` 를 읽고
다음을 한국어로 요약해줘:

1. 완료된 Sprint 목록과 핵심 결과 (commit hash 포함)
2. **현재 진행 중인 Sprint** 의 미완 항목 — 특히 "⚠️ 마이그레이션 / 백엔드 배포 필요" 표시
3. 다음으로 권장하는 진입 파일 1~3개 (CLAUDE.md §8 기준)
4. 최근 5개 commit (`git log --oneline -5`)

마지막에는 "다음에 할 일 한 줄 제안"을 **굵게** 추가.
