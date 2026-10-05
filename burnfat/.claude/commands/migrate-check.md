---
description: Supabase 마이그레이션 적용 누락분 점검
allowed-tools: Read, Glob, Bash(git log*)
---

# /migrate-check

`burnfat/supabase/migrations/` 의 모든 SQL 파일을 나열하고,
각 SPRINT*_HANDOFF.md 에서 "⚠️ 마이그레이션 적용 필요" 로 표시된 파일과 대조해줘.

출력 형식:

| 마이그레이션 파일 | 관련 Sprint | 적용 필요 여부 |
|---|---|---|

마지막에 적용되어야 할 SQL 의 실제 경로 목록만 별도로 보여줘.
**SQL 자동 실행 금지** — `supabase db push` 는 사용자가 직접 확인 후 돌린다.
