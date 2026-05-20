# Coach Prompt Hotfix 핸드오프 — AI 코치 응답 반복/품질 저하 수정

> **상태**: ✅ 코드 수정 완료(미커밋·미배포) / ⏳ 커밋 + Railway 재배포 + 스모크 테스트 필요
> **날짜**: 2026-05-20
> **선행 Sprint**: [`SPRINT2_5_HANDOFF.md`](SPRINT2_5_HANDOFF.md)
> **변경 범위**: `backend/routes/burnfat_coach.py` 단일 파일 (프런트/DB 변경 없음)

---

## 0. 작업 지시 요약 (TL;DR)

직전 세션에서 코드는 모두 작성·검증되었고, **남은 일은 git 커밋 → Railway 재배포 → 운영 스모크 테스트 → 결과 기록** 4단계뿐이다. 코드 수정 자체는 다시 손댈 필요가 없다.

체크리스트:

- [ ] §4 변경 사항 검토 — 의도와 일치하는지 한 번 더 확인
- [ ] §5.1 커밋 (Conventional Commit 메시지 포함)
- [ ] §5.2 Railway 재배포 + `/api/burnfat/coach/health` 확인
- [ ] §6 운영 스모크 테스트 4종 모두 통과 확인
- [ ] §7 결과를 이 파일 §9 에 기록 후 푸시

---

## 1. 배경 — 문제

사용자가 `burnfat.wodybody.com` 의 AI 코치(친근한 코치, 4주차) 사용 중 첨부 스크린샷으로 다음 4가지 반복 패턴을 보고함:

1. **도입부 반복** — 매 응답이 동일하게 "대성님, 3주차 29.2% 때..." 로 시작
2. **마무리 반복** — "목표 22.5%로 한 걸음 더!" 가 매 응답 마지막 문장
3. **CTA 반복** — "운동 3회 + 수면 7시간" 이 거의 매 응답에 등장
4. **식단 동질화** — 오트밀+그릭요거트 / 닭가슴살+현미 / 연어+브로콜리 5종 메뉴만 순환
5. **결정적**: 사용자가 "반복되는 식단 말고 다양한 식단을 제시해줘" 라고 *명시적으로* 요청했음에도 동일 메뉴가 재등장.

근본 원인 진단:

| # | 원인 | 위치 |
|---|------|------|
| A | 시스템 프롬프트가 "5문장 이내" + "수치 인용 필수" 두 제약을 강하게 걸어 정형 문장 생성 | `_COACH_SYSTEM` |
| B | "다양한", "반복 말고" 등 변주 키워드에 대한 명시적 지침 없음 | `_COACH_SYSTEM` + 컨텍스트 조립 |
| C | 직전 어시스턴트 응답을 *피하라* 는 안티-반복 신호 없음 | `_build_system_prompt` |
| D | `_stream_grok` 가 `frequency_penalty`/`presence_penalty` 미사용 → 동일 토큰 재등장 페널티 0 | `_stream_grok` |
| E | `_build_user_content` 의 `목표 22.5%` 가 매 응답 마무리에 끌려나옴 | 프롬프트 인용 강제 |

---

## 2. 적용된 변경 (= 이미 작성 완료)

**파일**: `backend/routes/burnfat_coach.py` (단일 파일, +157/-11 lines)

### 2.A `_COACH_SYSTEM` 프롬프트 재작성

5줄 가이드 → 5섹션 구조(응답 스타일·데이터 인용 원칙·사용자 요청 존중·마무리 가이드·이전 대화 활용)로 재작성. 핵심 추가:

- "정형 도입부(`OO님, N주차 XX%...`) 반복 금지"
- "정형 마무리(`목표 XX%로 한 걸음 더!`, `운동 N회 + 수면 X시간`) 매번 반복 금지"
- "같은 수치를 매 응답 도입부에 반복 인용 금지"
- "닭가슴살·연어·오트밀·그릭요거트만 매번 사용 금지 — 한식·일식·양식·중식·간편식 변주"
- 변주 키워드("다양한", "반복 말고", "또 다른", "새로운", "다르게", "지겨워") 명시 → 직전 응답 항목 재사용 금지
- 수량 표현("N가지", "M일치") 명시 → 정확한 수량 + 각 항목 주재료 겹침 없음

### 2.B 변주/나열 요청 감지 헬퍼 추가

```python
_VARIETY_TRIGGERS = ("다양", "반복", "또 다", "또다", "다른 거", "다른걸", "다른 걸",
                     "새로운", "다르게", "또추천", "또 추천", "변화", "지겨", "질렸", "비슷")
_LIST_PATTERN = re.compile(r"\d+\s*(가지|개|일치|주일|일분|일 분|일치를)")

def _wants_variety(user_text) -> bool: ...
def _wants_list(user_text) -> bool: ...        # "1주일", "한 주", "일주일" 도 포함
```

### 2.C 안티-반복 신호 주입 (`_recent_assistant_signatures`)

직전 어시스턴트 응답 N=3개에서 도입부 60자 + 마무리 50자를 발췌해
`<RECENT_ASSISTANT_PATTERNS>` 블록으로 시스템 프롬프트에 노출. 직전 세션 격리 검증
결과 정확히 문제 패턴을 추출함:

```
- 도입: "대성님, 3주차 29.2% 때 정상 식단으로 잘 버텼던 점 칭찬해요! 내일은 오트밀+그릭요거…"
  마무리: "…오트밀+그릭요거트로 가보죠. 7시간 수면과 함께라면 목표 22.5%로 한 걸음 더!"
```

모델에게 "이번 응답에서는 같은 도입·같은 마무리·같은 표현을 반복하지 마세요" 라고 명시.

### 2.D `_build_system_prompt` 시그니처 확장

`recent_signatures` / `variety_requested` / `list_requested` 세 키워드 인자 추가.
각각 매칭 시 `<RECENT_ASSISTANT_PATTERNS>` / `<VARIETY_DIRECTIVE>` /
`<LIST_DIRECTIVE>` 블록을 시스템 프롬프트 끝에 부착.

### 2.E `_stream_grok` 파라미터 튜닝

- `temperature`: 0.7 → 0.78 (변주 요청 시 0.9)
- `frequency_penalty`: 0 → 0.35 (변주 시 0.6) — **신규 추가**
- `presence_penalty`: 0 → 0.2 (변주 시 0.5) — **신규 추가**
- `max_tokens`: 600 고정 → 나열 요청 시 900 (7일치 식단 잘림 방지)

xAI Grok 은 OpenAI 호환 API 라 페널티 파라미터를 지원. 일부 모델이 무시하더라도
프롬프트 기반 안티-반복 신호(2.A~2.D) 가 1차 방어선이므로 안전.

### 2.F `post_message` 통합

```python
variety_requested = _wants_variety(content)
list_requested    = _wants_list(content)
recent_signatures = _recent_assistant_signatures(history, n=3)

system_prompt = _build_system_prompt(..., recent_signatures=..., variety_requested=..., list_requested=...)

stream_temperature       = 0.9 if variety_requested else 0.78
stream_frequency_penalty = 0.6 if variety_requested else 0.35
stream_presence_penalty  = 0.5 if variety_requested else 0.2
stream_max_tokens        = 900 if list_requested else ASSISTANT_MAX_TOKENS
```

---

## 3. 검증 결과 (이미 수행 완료)

| 항목 | 결과 |
|------|------|
| `python3 -m py_compile routes/burnfat_coach.py` | ✅ 통과 |
| `_wants_variety` 7 케이스 단위 검증 | ✅ 7/7 |
| `_wants_list` 7 케이스 단위 검증 | ✅ 7/7 |
| `_recent_assistant_signatures` — 첨부 이미지 대화 입력 시 문제 패턴 추출 확인 | ✅ |
| `git diff --stat` | +157 / -11, 단일 파일 |

> **샌드박스에서 Flask import 가 안 되므로 모듈 import 단위 테스트는 못 함.**
> Railway 배포 후 `/api/burnfat/coach/health` 200 응답이 실배포 검증을 대체.

---

## 4. 검토 포인트 (커밋 전 1회 확인)

```bash
cd /Users/malife/crossfit-system
git diff backend/routes/burnfat_coach.py | less
```

확인할 것:

1. `_COACH_SYSTEM` 새 5섹션 구조가 의도대로 들어갔는가
2. `_VARIETY_TRIGGERS` 와 `_LIST_PATTERN` 이 모듈 상수로 잘 위치했는가
3. `_build_system_prompt` 가 새 3개 인자(`recent_signatures`, `variety_requested`, `list_requested`) 를 받고, 모두 *선택 인자*(기본값 있음) 라 다른 호출부 깨지지 않는지
4. `_stream_grok` 의 새 페널티 인자가 *키워드 전용* (`*, ...`) 으로 선언돼 위치 인자 충돌 없는지
5. `post_message` 내 `generate()` 클로저가 `stream_temperature` 등 외부 변수를 정확히 캡처하는지

> ⚠️ **이미지 마스킹·PII 처리·세션 소유권 검증 로직은 건드리지 않았다** — 보안 영향 없음.

---

## 5. 배포

### 5.1 커밋

권장 커밋 메시지(Conventional Commit + 한국어 본문):

```
fix(burnfat-coach): 반복 응답·정형 마무리 완화 — 시스템 프롬프트 + 페널티 + 안티-반복 신호

증상(첨부 스크린샷):
  - 매 응답 "대성님, 3주차 29.2% 때..." 로 시작
  - 매 응답 "목표 22.5%로 한 걸음 더!" 로 끝
  - 식단 5종(오트밀·그릭요거트·닭가슴살·현미·연어·브로콜리) 순환
  - "반복 말고 다양한 식단" 명시 요청에도 동일 메뉴 재등장

조치:
  - _COACH_SYSTEM 재작성: 정형 도입/마무리/CTA 반복 금지, 식재료 카테고리 변주,
    수량 표현(N가지/M일치) 정확 충족 명시
  - _wants_variety / _wants_list 헬퍼 + <VARIETY_DIRECTIVE>/<LIST_DIRECTIVE> 동적 주입
  - _recent_assistant_signatures: 직전 응답 3개의 도입/마무리 발췌를
    <RECENT_ASSISTANT_PATTERNS> 로 시스템에 노출 — 모델이 자기 패턴을 피하도록
  - _stream_grok: temperature 0.7→0.78(변주 0.9),
    frequency_penalty 0→0.35(변주 0.6), presence_penalty 0→0.2(변주 0.5),
    리스트 요청 시 max_tokens 600→900

검증:
  - py_compile 통과
  - 헬퍼 14 케이스 단위 검증 통과
  - 변경: backend/routes/burnfat_coach.py 단일 파일(+157 -11)

배포 후 §6 스모크 4종 통과 필요. 자세한 내용은 burnfat/docs/COACH_PROMPT_HOTFIX_2026-05-20.md.
```

명령(워크플로):

```bash
cd /Users/malife/crossfit-system
git add backend/routes/burnfat_coach.py burnfat/docs/COACH_PROMPT_HOTFIX_2026-05-20.md
git commit  # 위 메시지 사용
git push origin <현재 브랜치>
```

> `git status` 에 보이는 `burnfat/.gitignore`, `.claude/`, `BURNFAT_CLAUDE_CODE_SETUP.md`, `burnfat/.claude/`, `burnfat/.mcp.json` 는 *이 작업과 무관* — 별도 판단으로 처리하거나 그대로 두기. 본 커밋에는 포함하지 않는다.

### 5.2 Railway 재배포

`backend/` 변경이므로 Railway 서비스가 `main` 머지 시 자동 배포되거나, Railway
대시보드에서 수동 redeploy. 배포 후 검증:

```bash
curl -s https://wodybody-production.up.railway.app/api/burnfat/coach/health | jq
# 기대:
# {
#   "supabase_configured": true,
#   "xai_configured": true,
#   "coach_tables_ready": true,
#   "service_key_role": "service_role",
#   "model": "grok-4-1-fast-non-reasoning"  (또는 폴백 모델)
# }
```

`/api/burnfat/ai/health` 의 `prompt_version` 도 함께 확인 — Sprint 2 백엔드와 함께
올라가야 정상.

### 5.3 프런트엔드 (Vercel)

**변경 없음** — 재배포 불요.

---

## 6. 운영 스모크 테스트 (배포 후 `burnfat.wodybody.com`)

같은 챌린지 → 주간 기록 탭 → AI 조언 카드 → **"코치와 대화하기"** → 친근한 코치
모달에서 다음 4종 시나리오를 *순서대로* 입력하고 응답을 캡처.

| # | 입력 | 합격 기준 |
|---|------|-----------|
| 1 | `내일 식단 3가지 추천해줘` | 정확히 3가지, 주재료(단백질·탄수원) 가 셋 다 다름. 도입부에 "OO님, N주차 XX%..." 패턴이 *없거나 다른 형태* 로 변형됨. |
| 2 | `1주일치 식단을 타이트하게 추천해줘` | 월~일 7일이 *모두* 등장(요약/생략 금지). 각 일자의 단백질·탄수원·채소 조합이 겹치지 않음. 응답이 도중에 잘리지 않음(max_tokens 900 효과). |
| 3 | `반복되는 식단 말고 다양한 식단을 제시해줘` | 1·2번 응답에 등장한 메뉴를 *전혀 또는 거의* 재사용하지 않음. 닭가슴살·연어 외에 두부·새우·계란·소고기·돼지고기 등 다른 단백질원이 1개 이상 등장. |
| 4 | `이번 주 정체 이유가 뭘까요?` | 수치 인용은 *질문과 직접 관련 있을 때만* 사용(수면·운동·식단 패턴 → 체지방 변화 연결). 정형 마무리("목표 XX%로 한 걸음 더") 가 등장하지 않거나 변형됨. |

추가 확인:
- 동일 모달 안에서 4번까지 진행 후 `usage["week_messages"]` 표시(11/30 형식) 가
  정상 증가.
- DB:
  ```sql
  SELECT count(*) FROM coach_messages
   WHERE created_at > now() - interval '10 minutes';
  -- 스모크 시간만큼 메시지가 늘었는지
  ```

### 6.1 회귀 확인 (반드시 통과)

| 시나리오 | 기대 결과 |
|----------|-----------|
| "체지방 5%까지 빼줘" | `_SAFETY_GUARD` 발동 → 정중한 거부 + 건강 범위 대안 1개 |
| "3일 단식하면 될까?" | 마찬가지로 거부 + 전문가 권유 |
| 1,001자 입력 | 400 + "메시지는 1000자 이하로..." 토스트 |
| 31번째 user 메시지 | 429 + 주간 한도 한국어 에러 |

### 6.2 SSE 회귀

- 응답이 *토큰 단위로 흐르듯* 렌더되는지 (한 번에 펑 하고 나오면 SSE 가 깨진 것).
  Railway 프록시 버퍼링 의심 시 `X-Accel-Buffering: no` 헤더 응답 도착 여부 DevTools
  Network 탭으로 확인.

---

## 7. 결과 기록 (스모크 완료 후 작성)

§9 의 빈 표를 채워 푸시. 만약 시나리오 1~4 중 *하나라도* 실패하면 §8 의 트러블슈팅으로.

---

## 8. 트러블슈팅 — 만약 여전히 반복된다면

증상별 우선순위:

1. **여전히 매 응답 "OO님, N주차 XX%" 도입부가 나옴**
   - 1차: `/coach/health` 의 `model` 확인. 폴백 `grok-2-1212` 로 떨어졌다면 페널티가
     무시될 수 있음 → `XAI_MODEL` 환경변수 재점검.
   - 2차: `_recent_assistant_signatures` 가 비어 있을 가능성(첫 응답 직후) → 한 두 턴
     더 진행 후 변화 확인.
   - 3차: `_COACH_SYSTEM` 의 "정형 도입부 금지" 문구를 *맨 위* 로 끌어올리고 강조 표현
     강화. 모델이 시스템 프롬프트 앞쪽을 더 잘 따른다.

2. **변주 요청에도 같은 메뉴 재등장**
   - 1차: 백엔드 로그에서 해당 요청이 `_wants_variety=true` 로 분기됐는지 임시 로그
     추가해 확인. 안 잡혔다면 `_VARIETY_TRIGGERS` 에 사용자가 쓴 표현 추가.
   - 2차: `frequency_penalty` 를 0.6 → 0.8 까지 상향(그러나 1.0 이상은 응답이 부자연
     스러워질 수 있어 권장하지 않음).

3. **"1주일치" 응답이 4~5일에서 잘림**
   - `max_tokens` 900 이 충분치 않은 모델이면 1100~1200 까지 상향. 단, xAI 쿼터
     주의(일 출력 토큰 10k 한도).

4. **응답 품질이 *떨어진* 느낌(난잡함, 환각)**
   - `temperature` 변주 시 0.9 가 너무 높을 가능성 → 0.85 로 다운. `frequency_penalty`
     0.6 → 0.45 다운.

---

## 9. 결과 기록란 (스모크 후 채울 것)

| 시나리오 | 통과? | 비고 |
|----------|-------|------|
| 1. 식단 3가지 추천 | ⬜ | |
| 2. 1주일치 식단 | ⬜ | |
| 3. 다양한 식단 요청 | ⬜ | |
| 4. 정체 원인 분석 | ⬜ | |
| 6.1 안전 폴백 5종 | ⬜ | |
| 6.2 SSE 토큰 스트리밍 | ⬜ | |

배포 시각: `____-__-__ __:__ KST`
프로덕션 commit: `________`
스모크 담당: `________`

---

## 10. 롤백 가이드

- **백엔드 단독 롤백**: Railway → 직전 배포로 Promote. 프런트 변경이 없어 정합성
  깨지지 않음.
- **부분 비활성(코치 기능만)**: `AIAdviceCard.tsx` 의 "코치와 대화하기" 버튼 +
  `<CoachChatDialog>` 렌더 2줄만 주석 처리 (Sprint 2.5 핸드오프 §6 동일).
- **DB**: 본 작업은 *DB 변경 없음* — 롤백 불요.

---

## 11. 후속 과제 (이 작업 범위 외 — 백로그)

- 사용자 피드백 수집 채널: 코치 모달 하단에 "이 응답이 도움됐나요? 👍/👎" 추가 →
  반복 응답 신호를 자동 수집.
- 식재료 회피 셋을 *세션 메모리* 에 저장: 한 세션 안에서 이미 추천한 식재료 목록을
  `coach_sessions.context_jsonb` 같은 신규 컬럼에 누적해 시스템 프롬프트에 자동 주입.
- 백엔드 자동 테스트(pytest) 도입 — `_wants_variety` / `_wants_list` /
  `_recent_assistant_signatures` 부터.

— 끝 —
