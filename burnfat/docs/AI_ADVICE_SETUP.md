# AI 조언 기능 설정 가이드

---

## 1. 사전 요구사항

- [x] DB 마이그레이션 완료 (participants 확장, weekly_logs 테이블)
- [ ] OpenAI API 키 보유
- [ ] Supabase CLI 설치 (선택, 로컬 테스트 시)

---

## 2. OpenAI API 키 발급

1. [OpenAI Platform](https://platform.openai.com/) 로그인
2. **API keys** → **Create new secret key**
3. 키 복사 (한 번만 표시됨, `sk-...` 형식)

---

## 3. Supabase Secrets 설정

Supabase 대시보드 또는 CLI로 설정:

### 방법 A: Supabase 대시보드

1. **Project Settings** → **Edge Functions**
2. **Secrets** 섹션에서 `OPENAI_API_KEY` 추가
3. 값: `sk-...` (발급받은 키)

### 방법 B: Supabase CLI

```bash
# 프로젝트 연결 (최초 1회)
supabase link --project-ref <프로젝트_REF>

# Secret 설정
supabase secrets set OPENAI_API_KEY=sk-프로젝트키
```

---

## 4. Edge Function 배포

```bash
# 프로젝트 루트에서
cd /Users/malife/burnfat

# ai-advice 함수 배포
supabase functions deploy ai-advice
```

배포 완료 시 함수 URL 예시:
`https://<프로젝트_REF>.supabase.co/functions/v1/ai-advice`

---

## 5. 프론트엔드 연동 확인

`.env`에 다음이 설정되어 있는지 확인:

```
VITE_SUPABASE_URL=https://<프로젝트_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

프론트엔드 `edgeFunctions.ts`는 `VITE_SUPABASE_URL`을 기반으로 Functions URL을 자동 구성합니다.

---

## 6. 동작 테스트

1. 대결방 접속 → **주간 기록** 탭
2. 참가자 카드에서 **AI 조언 보기** 클릭
3. 조언이 표시되면 성공

### 오류 시 확인

| 오류 | 원인 | 조치 |
|------|------|------|
| `OPENAI_API_KEY not configured` | Secret 미설정 | 3번 재확인 |
| `Participant not found` | participant_id 오류 | 주간 기록 탭에서 올바른 참가자 선택 확인 |
| `AI service error` | OpenAI API 오류 | API 키 유효성, 잔액 확인 |

---

## 7. 비용 참고

- **gpt-4o-mini**: 입력 ~$0.15/1M tokens
- 소규모 사용 시 월 $1~5 수준 예상
