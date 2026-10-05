# burnfat — Claude Code 작업 지시서 (초기 세팅 + 자동화)

이 문서는 **`burnfat/` 패키지를 Claude Code 로 관리하기 위한 일회성 셋업 + 평상시 운용 가이드**입니다.  
모노레포(`crossfit-system`) 루트와 `burnfat/` 안에 각각 `.claude/` 환경을 구성하고, 다음 세 가지를 한 번에 묶습니다:

1. **초기 세팅** — Claude Code 설치 / 인증 / 권한 / CLAUDE.md 연결
2. **burnfat 전용 slash command 7개** — Sprint 상태, 검증, 핸드오프, 마이그레이션, 배포 점검, E2E 실행, 분석 이벤트 감사
3. **자동화 hooks** — 파일 편집 후 `tsc --noEmit`, 커밋 전 `vitest`
4. **MCP 서버 추가** — Supabase / GitHub / Vercel (Railway는 CLI 그대로)

> 이 지시서를 Claude Code 세션에 그대로 붙여 넣으면 됩니다. Claude 는 각 단계를 순서대로 수행합니다.
> 모든 경로는 macOS 기준(`/Users/malife/crossfit-system/`).

---

## 🟢 현재 상태 (2026-05-19 갱신)

**Claude (Cowork) 가 이미 완료한 작업**

| 항목 | 위치 | 상태 |
|---|---|---|
| `.gitignore` 보강 (`.claude/settings.local.json`, `.claude/.cache/`) | `burnfat/.gitignore` | ✅ |
| `settings.json` (권한 + hooks 2종) | `burnfat/.claude/settings.json` | ✅ JSON 검증 통과 |
| Slash command 7개 (`sprint-status`, `verify`, `handoff`, `migrate-check`, `deploy-check`, `e2e-run`, `analytics-audit`) | `burnfat/.claude/commands/*.md` | ✅ |
| MCP 설정 (Supabase / GitHub / Vercel) | `burnfat/.mcp.json` | ✅ JSON 검증 통과 |

**사용자가 남은 두 가지만 하면 끝**

```bash
# 1) 토큰 export (한 번만, ~/.zshrc 권장)
export SUPABASE_ACCESS_TOKEN="sbp_xxx"
export GITHUB_TOKEN="ghp_xxx"
export VERCEL_TOKEN="xxx"

# 2) 검증 + 커밋
cd /Users/malife/crossfit-system/burnfat
claude
> /sprint-status     # 슬래시 커맨드 인식 확인
> /verify            # tsc + vitest + build 베이스라인
# 만족스러우면
git add .claude/ .mcp.json .gitignore
cd .. && git add BURNFAT_CLAUDE_CODE_SETUP.md
git commit -m "chore(burnfat): add Claude Code workspace setup (commands, hooks, mcp)"
```

자세한 검증·커밋 절차는 **§2 Step 5·6** 참고. 셋업의 *내용* 설명만 보려면 **§3 이후**로 바로 가도 됩니다.

---

## 0. 사전 체크리스트

세션 시작 시 Claude 가 먼저 확인할 것:

```bash
# Claude Code 설치 및 버전
claude --version || curl https://claude.ai/install.sh | sh

# 작업 디렉토리
cd /Users/malife/crossfit-system

# 현재 상태
git status
git branch --show-current
```

위 결과를 사용자에게 보여주고, **dirty tree** 이거나 main/master 브랜치에 있으면 작업용 브랜치 생성을 제안:

```bash
git checkout -b chore/claude-code-setup
```

---

## 1. 디렉토리 구조 (생성 목표)

```
crossfit-system/
├── CLAUDE.md                       # ✅ 이미 존재
├── BURNFAT_CLAUDE_CODE_SETUP.md    # ✅ 이 파일
└── burnfat/
    ├── .claude/
    │   ├── settings.json           # 권한 + hooks
    │   ├── settings.local.json     # (gitignore) 개인 환경
    │   └── commands/
    │       ├── sprint-status.md
    │       ├── verify.md
    │       ├── handoff.md
    │       ├── migrate-check.md
    │       └── deploy-check.md
    └── .mcp.json                    # Supabase / GitHub / Vercel
```

> `.claude/` 는 **burnfat/ 안**에 둡니다. `cd burnfat && claude` 가 표준 워크플로우이기 때문(CLAUDE.md §4 참고).  
> 루트에서도 `claude` 를 쓰고 싶다면 동일한 파일을 루트 `.claude/` 로 복사하거나 심볼릭 링크하세요.

---

## 2. 작업 순서

### ✅ Step 1~4 — Claude 가 이미 완료 (2026-05-19)

| Step | 내용 | 결과물 |
|---|---|---|
| 1 | `.gitignore` 보강 (`.claude/settings.local.json`, `.claude/.cache/`) | `burnfat/.gitignore` 마지막 3줄 |
| 2 | `.claude/settings.json` 작성 (권한 + hooks 2종) | `burnfat/.claude/settings.json` — JSON 검증 통과 |
| 3 | `.claude/commands/*.md` 5개 생성 | `burnfat/.claude/commands/{sprint-status,verify,handoff,migrate-check,deploy-check}.md` |
| 4 | `.mcp.json` 생성 (Supabase / GitHub / Vercel, `${VAR}` 보간) | `burnfat/.mcp.json` — JSON 검증 통과 |

각 파일의 실제 내용은 **§4 (settings)**, **§5 (commands)**, **§6 (mcp)** 에 그대로 임베드되어 있습니다 — 향후 다른 환경에 동일하게 재현할 때 참고하세요.

### ⏳ Step 5 — 사용자가 직접 (검증)

**전제: 토큰 환경변수가 셸에 export 되어 있어야 함** (§6-2 참고).

```bash
cd /Users/malife/crossfit-system/burnfat
claude
```

세션 안에서 차례로:

```text
> /sprint-status     # 커맨드가 인식되는지 + 현재 Sprint 상태 요약 확인
> /verify            # tsc + vitest + build 베이스라인 (≥48 테스트 통과 기대)
> /config            # 설정·hooks 인식 여부 확인
```

`/config` 에서 **Hooks** 섹션에 `PostToolUse: Edit|Write|MultiEdit` 와 `PreToolUse: Bash` 두 항목이 보여야 정상입니다. 안 보이면 §8 트러블슈팅 참고.

MCP 서버는 세션 시작 시 자동 연결됩니다. 회색(연결 실패) 표시가 나오면 해당 토큰 환경변수를 먼저 확인:

```bash
echo $SUPABASE_ACCESS_TOKEN $GITHUB_TOKEN $VERCEL_TOKEN
claude mcp list
```

### ⏳ Step 6 — 사용자가 직접 (커밋)

`/verify` 가 통과한 뒤에만 커밋. `settings.local.json` 이 staging 에 들어가면 안 됩니다(`.gitignore` 가 막아주지만 한 번 더 확인).

```bash
cd /Users/malife/crossfit-system
git status                       # .claude/settings.local.json 이 없어야 함
git add burnfat/.claude/ burnfat/.mcp.json burnfat/.gitignore BURNFAT_CLAUDE_CODE_SETUP.md
git commit -m "chore(burnfat): add Claude Code workspace setup (commands, hooks, mcp)"
```

`git commit` 실행 순간 `.claude/settings.json` 의 **PreToolUse Bash hook** 이 자동으로 `vitest run` + `tsc --noEmit` 을 돌립니다. 실패하면 커밋 자체가 차단되므로, 위 `/verify` 가 통과했다면 이 단계에서 막힐 일은 거의 없습니다.

---

## 3. 권한 모델 (settings.json `permissions`)

CLAUDE.md §5 의 보안 원칙을 그대로 반영:

| 허용 (allow) | 거부 (deny) |
|---|---|
| `Read`, `Edit`, `Write`, `Grep`, `Glob` | `Bash(rm -rf *)` |
| `Bash(npm run *)` — dev/build/test 그룹 | `Bash(supabase db reset*)` |
| `Bash(npx tsc *)`, `Bash(npx vitest *)` | `Bash(curl * \| sh)` |
| `Bash(npx playwright *)`, `Bash(npm run e2e*)` — Sprint 3 Phase C 용 | |
| `Bash(git status)`, `Bash(git diff*)`, `Bash(git log*)` | `Write(**/.env)` — 평문 시크릿 보호 |
| `Bash(git add*)`, `Bash(git commit*)`, `Bash(git checkout -b*)` | `Edit(**/.env.production)` |
| `Bash(supabase db push)`, `Bash(supabase migration *)` | |

> **민감 키 보호 원칙**: `.env`, `.env.production` 은 Claude 가 *읽기*는 가능해도 *쓰기*는 막습니다.  
> 평문 admin_pin / device_secret 관련 작업은 RPC 패턴만 따르도록 유도(CLAUDE.md §5).

---

## 4. `.claude/settings.json` (그대로 작성)

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Read",
      "Grep",
      "Glob",
      "Edit",
      "Write",
      "Bash(npm run dev)",
      "Bash(npm run build)",
      "Bash(npm test)",
      "Bash(npm run test:*)",
      "Bash(npx tsc --noEmit)",
      "Bash(npx vitest *)",
      "Bash(git status)",
      "Bash(git diff*)",
      "Bash(git log*)",
      "Bash(git branch*)",
      "Bash(git add*)",
      "Bash(git commit*)",
      "Bash(git checkout -b *)",
      "Bash(supabase migration *)",
      "Bash(supabase db push)",
      "Bash(npx playwright *)",
      "Bash(npm run e2e*)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(supabase db reset*)",
      "Bash(curl * | sh)",
      "Write(**/.env)",
      "Write(**/.env.*)",
      "Edit(**/.env)",
      "Edit(**/.env.*)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && (echo \"$CLAUDE_TOOL_INPUT\" | grep -Eq '\\.(ts|tsx)\"' && npx tsc --noEmit -p tsconfig.json 2>&1 | tail -20) || true"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "echo \"$CLAUDE_TOOL_INPUT\" | grep -Eq 'git commit' && (cd \"$CLAUDE_PROJECT_DIR\" && npx vitest run --reporter=dot && npx tsc --noEmit) || exit 0"
          }
        ]
      }
    ]
  }
}
```

**hooks 동작 설명**

- `PostToolUse: Edit|Write|MultiEdit` — `.ts` / `.tsx` 파일이 변경됐을 때만 `tsc --noEmit` 빠른 검사. 결과 마지막 20줄만 컨텍스트에 노출.
- `PreToolUse: Bash` — `git commit` 명령일 때만 차단적으로 `vitest run` + `tsc --noEmit` 실행. 실패 시 커밋 자체가 막힘.

> `CLAUDE_PROJECT_DIR` 는 Claude Code 가 자동 주입하는 환경변수(이 파일이 있는 디렉토리 = `burnfat/`).

---

## 5. Slash Commands (`.claude/commands/*.md`)

각 파일을 **그대로** 만드세요. 파일명이 곧 커맨드명입니다 (`sprint-status.md` → `/sprint-status`).

현재 정의된 커맨드 7개:

| 커맨드 | 용도 | 도입 시점 |
|---|---|---|
| `/sprint-status` | 현재 Sprint 진행 상태 요약 | 초기 |
| `/verify` | tsc + vitest + build 풀 검증 | 초기 |
| `/handoff <N>` | `SPRINT<N>_HANDOFF.md` 초안 자동 작성 | 초기 |
| `/migrate-check` | Supabase 마이그레이션 누락분 점검 | 초기 |
| `/deploy-check` | 배포 직전 7개 안전망 체크 | 초기 |
| `/e2e-run [패턴]` | Playwright E2E 실행 + 트레이스 안내 | **Sprint 3 Phase C** |
| `/analytics-audit` | 분석 이벤트 구현 상태 점검 | **Sprint 3 Phase C** |

### 5-1. `sprint-status.md`

```markdown
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

마지막에는 "다음에 할 일 한 줄 제안"을 굵게 추가.
```

### 5-2. `verify.md`

```markdown
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
```

### 5-3. `handoff.md`

```markdown
---
description: 현재 작업한 Sprint 의 SPRINT<N>_HANDOFF.md 초안 생성
argument-hint: <sprint-번호> 예: 3B
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
```

### 5-4. `migrate-check.md`

```markdown
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
**SQL 자동 실행 금지** — supabase db push 는 사용자가 직접 확인 후 돌린다.
```

### 5-5. `deploy-check.md`

```markdown
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
```

### 5-6. `e2e-run.md` *(Sprint 3 Phase C)*

```markdown
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
- 없다면 **여기서 멈추고** 설치 가이드만 출력 (npm i -D @playwright/test → npx playwright install --with-deps chromium → npx playwright init)

## 2) 실행

- 인자 `$1` 가 비어 있으면 → `npx playwright test`
- 비어 있지 않으면 → `npx playwright test "$1"`
- 항상 `--reporter=list`, 로컬은 `--workers=2`

## 3) 결과 보고 (한국어)

- 통과/실패/스킵 개수
- 실패 시 각 케이스별로: 시나리오 제목, 실패 스텝, trace 파일 경로, `npx playwright show-trace <path>` 명령어
- 통과만 있으면 ✅ + 총 시간만

## 4) 새 시나리오 패턴 (참고)

신규 시나리오는 `burnfat/e2e/` 아래에 두고 3개 흐름을 반드시 포함:
1. 챌린지 생성 → admin_pin → 코드 입장
2. SubmitModal → 이미지 마스킹 → Storage → device_secret
3. WeeklyLogForm → useNextRecordableWeek → AI 조언 캐시 hit

셀렉터는 `data-testid` 기반(텍스트 의존 금지).
```

### 5-7. `analytics-audit.md` *(Sprint 3 Phase C)*

```markdown
---
description: burnfat 분석 이벤트 구현 점검 (Sprint 3 Phase C)
allowed-tools: Read, Grep, Glob
---

# /analytics-audit

burnfat 의 분석 이벤트 구현 상태를 점검한다.

## 1) 이벤트 트리거 검색

`burnfat/src/` 에서 다음 패턴 grep — `track(`, `analytics.track(`, `analytics.capture(`, `posthog.capture(`, `window.gtag(`, `useAnalytics(`. 결과를 파일·라인·이벤트 이름 표로 정리.

## 2) 권장 이벤트 8개와 대조

| 이벤트 키 | 트리거 위치 | 필수 속성 |
|---|---|---|
| `challenge_created` | `CreateChallengePage` 성공 핸들러 | `challenge_id`, `duration_days`, `template_id?` |
| `challenge_entered` | `HomePage` 코드 입장 성공 | `challenge_id`, `via` |
| `submission_started` | `SubmitModal` 열기 | `challenge_id`, `kind` |
| `submission_completed` | `SubmitModal` 업로드 성공 | `challenge_id`, `kind`, `duration_ms`, `has_image` |
| `weekly_log_saved` | `WeeklyLogForm` 저장 성공 | `challenge_id`, `week_index`, `kg_delta` |
| `ai_advice_viewed` | `AIAdviceCard` 마운트 | `challenge_id`, `cache_hit` |
| `coach_session_opened` | `CoachChatDialog` open | `challenge_id`, `entry` |
| `ranking_shared` | `RankingShareDialog` 공유 | `challenge_id`, `channel` |

## 3) 출력

- ✅ 구현된 / ❌ 누락된 / ⚠️ 속성 누락 세 묶음으로 정리
- 누락된 이벤트는 추가 권장 파일 1개씩
- "다음 PR 한 줄 제목 후보" 3개

**자동 코드 수정 금지** — 보고만 한다.
```

---

## 6. MCP 서버 추가 (`burnfat/.mcp.json`)

burnfat 의 외부 의존성: **Supabase**(DB) + **GitHub**(PR) + **Vercel**(프론트 배포).  
Railway 는 공식 MCP 가 안정화 안 되어 있어 CLI(`railway up`) 그대로 사용.

### 6-1. `.mcp.json` 템플릿

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase",
        "--access-token",
        "${SUPABASE_ACCESS_TOKEN}"
      ]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "vercel": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp-adapter"],
      "env": {
        "VERCEL_API_TOKEN": "${VERCEL_TOKEN}"
      }
    }
  }
}
```

### 6-2. 환경 변수 (개인 머신, `.zshrc` 또는 `.env.local`)

```bash
export SUPABASE_ACCESS_TOKEN="sbp_xxx"   # https://supabase.com/dashboard/account/tokens
export GITHUB_TOKEN="ghp_xxx"            # repo + workflow scope
export VERCEL_TOKEN="xxx"                # https://vercel.com/account/tokens
```

> **절대 `.mcp.json` 에 평문 토큰을 하드코딩하지 마세요.** `${VAR}` 보간만 사용.

### 6-3. 명령형 등록 (대안)

`.mcp.json` 대신 CLI 로 등록하고 싶다면:

```bash
cd /Users/malife/crossfit-system/burnfat
claude mcp add supabase "npx -y @supabase/mcp-server-supabase --access-token $SUPABASE_ACCESS_TOKEN"
claude mcp add github   "npx -y @modelcontextprotocol/server-github"   --env GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_TOKEN
claude mcp add vercel   "npx -y @vercel/mcp-adapter"                    --env VERCEL_API_TOKEN=$VERCEL_TOKEN
claude mcp list
```

---

## 7. 운용 워크플로우 (셋업 이후)

평상시 사용 시나리오:

```bash
cd /Users/malife/crossfit-system/burnfat
claude

> /sprint-status          # 무엇부터 할지 파악
> Sprint 3B 진입 파일 보여줘
> ...(작업)...
> /verify                 # 중간 검증
> /handoff 3B             # 핸드오프 작성
> /deploy-check           # 배포 전 점검
> git commit -am "feat(sprint3b): ..."   # hook 이 자동으로 vitest + tsc 검증
```

**자동으로 일어나는 일**

- `.ts` / `.tsx` 편집 직후 → `tsc --noEmit` 빠른 검사 (PostToolUse hook)
- `git commit` 직전 → `vitest run` + `tsc --noEmit` (PreToolUse hook). 실패 시 커밋 차단.

---

## 8. 트러블슈팅

| 증상 | 원인 | 조치 |
|---|---|---|
| `/sprint-status` 가 안 보임 | `.claude/commands/` 위치가 잘못됨 | `burnfat/.claude/commands/` 에 있어야 함. `cd burnfat && claude` 로 진입했는지 확인 |
| hook 이 안 돈다 | `CLAUDE_PROJECT_DIR` 미주입(루트에서 실행) | `cd burnfat` 후 `claude` 실행 |
| MCP 서버가 회색(연결 실패) | 토큰 env 미주입 | `echo $SUPABASE_ACCESS_TOKEN` 으로 셸 env 확인 |
| tsc hook 이 너무 느리다 | 대규모 변경 시 매번 풀 체크 | hook 의 `tsc --noEmit` 을 `tsc --noEmit --incremental` 로 변경 |
| 권한 거부 too aggressive | `.env` 읽기까지 막힐 수 있음 | `permissions.allow` 에 `Read(**/.env.example)` 명시 추가 |

---

## 9. 다음 단계 (Step 5·6 통과 후)

검증과 커밋이 끝났다면, Claude 에게 다음을 차례로 시키면 됩니다:

1. `> /sprint-status` — 다음 Sprint 진입점 한 줄 제안 (현재 추천: **Sprint 3 Phase C — Playwright E2E + 분석 이벤트**)
2. `> /migrate-check` — 아직 적용 안 된 SQL 이 있는지 점검 (Sprint 2 / 2.5 / 3A 의 마이그레이션이 남아있을 수 있음)
3. **Sprint 3 Phase C 실작업**:
   - `> /analytics-audit` 로 현재 분석 이벤트 누락분 보고 받기
   - `> /e2e-run` 로 Playwright 셋업·시나리오 진행 (첫 호출 시 `@playwright/test` 미설치 안내 출력)
4. 실작업 진행 → `> /verify` 중간 검증 → `> /handoff 3C` 로 핸드오프 문서 자동 생성

---

## 부록 A. CLAUDE.md 와의 관계

- 이 문서는 **운영 자동화** 레이어.
- 작업 *내용* 의 단일 출처는 여전히 `CLAUDE.md` 와 `burnfat/docs/IMPROVEMENT_REPORT_2026-05.md`.
- 새로운 Sprint 가 시작될 때 슬래시 커맨드 안의 경로(`SPRINT*_HANDOFF.md`)는 그대로 작동합니다 — 핸드오프 패턴이 유지되기 때문.

## 부록 B. 보안 체크

- `.mcp.json` 은 커밋 OK (시크릿은 `${VAR}` 보간)
- `.claude/settings.local.json` 은 **반드시** `.gitignore`
- `permissions.deny` 의 `Write(**/.env*)` 는 절대 풀지 말 것 (CLAUDE.md §5 의 admin_pin / device_secret 보안 모델 보호)

---

작성일: 2026-05-19  
최종 갱신: 2026-05-19 (Sprint 3 Phase C 용 슬래시 커맨드 2개 추가)  
대상: `crossfit-system/burnfat`  
작성자: Claude (Cowork mode)

---

## 변경 로그

| 일자 | 변경 |
|---|---|
| 2026-05-19 | 초안 작성 — §0~§9 + 부록 A/B |
| 2026-05-19 | Step 1~4 실제 적용 완료. 상단 "현재 상태" 박스 추가, §2 를 완료/잔여 두 블록으로 재구성, §9 다음 단계를 사용자 액션 중심으로 단순화 |
| 2026-05-19 | **Sprint 3 Phase C 반영** — 슬래시 커맨드 `/e2e-run`, `/analytics-audit` 2개 추가 (실파일 + §5 본문). settings.json 권한에 `Bash(npx playwright *)`, `Bash(npm run e2e*)` 추가. §3 권한 표 + §1 상단 박스(5개→7개) + §9 흐름 갱신 |
