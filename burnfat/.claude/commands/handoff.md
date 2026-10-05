---
description: 현재 작업한 Sprint 의 SPRINT<N>_HANDOFF.md 초안 생성
argument-hint: <sprint-번호> 예 3B
allowed-tools: Read, Write, Bash(git log*), Bash(git diff*)
---

# /handoff $1

Sprint $1 의 핸드오프 문서를 작성한다.

1. `git log` 와 `git diff main...HEAD` 를 읽고 이번 브랜치의 변경을 파악
2. `burnfat/docs/IMPROVEMENT_REPORT_2026-05.md` 에서 Sprint $1 섹션의 DoD 항목을 가져옴
3. 다음 구조의 마크다운을 `burnfat/docs/SPRINT$1_HANDOFF.md` 로 작성:
   - 한 줄 요약
   - 코드 변경 요약 (디렉토리별)
   - DoD 체크리스트 (완료/미완)
   - 마이그레이션 / 배포 / 환경변수 필요 사항
   - 다음 세션을 위한 권장 진입점
   - 검증 결과 (`/verify` 실행 결과 붙임)
4. 작성 후 사용자에게 파일 경로(computer:// 링크)와 핵심 3줄 요약 제공
