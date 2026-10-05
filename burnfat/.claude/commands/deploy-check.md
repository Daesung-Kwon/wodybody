---
description: 배포 전 안전망 체크 (Vercel + Railway)
allowed-tools: Read, Grep, Bash(npx tsc *), Bash(npm run build), Bash(git status), Bash(git log*)
---

# /deploy-check

배포 직전 체크리스트(CLAUDE.md §5 보안 모델 + Sprint 3A 운영 안전망 기준).

다음 항목을 한국어 표로 출력:

1. `git status` — 깔끔한가? (untracked / unstaged 없음)
2. `.env.example` 에 신규 환경변수 누락 없는가? (`burnfat/.env.example` grep)
3. `VITE_DEBUG_*` 플래그가 코드 상에 남아있나? (production 에선 false 여야 함)
4. `tsc --noEmit` + `vite build` 통과?
5. 백엔드 변경분(`backend/routes/burnfat_*.py`)이 있는가? 있다면 Railway 재배포 필요.
6. `burnfat/supabase/migrations/` 의 미적용 SQL 이 있는가? → `/migrate-check` 결과 참고
7. 마지막 commit 메시지가 "WIP" / "fix typo" 등 모호하지 않은가?

전부 ✅ 인 경우에만 "배포 OK" 라고 말한다.
