# BurnFat V2 기술 검토 및 구현 아키텍처

> PRODUCT_PLAN_V2.md 기반 기술 검토 및 구현 구조 상세화 문서

---

## 1. 기술 검토 요약

### 1.1 서비스 철학: 신뢰 기반 공개형 (기술 반영)

| 항목 | 기술적 구현 |
|------|-------------|
| **데이터 입력** | 대결방 접속자 누구나 특정 참가자(닉네임)의 데이터 입력 가능 → RLS 익명 INSERT 유지 |
| **데이터 공개** | 모든 참가자의 데이터가 전원에게 공개 → SELECT 정책 공개, 개인 락 없음 |
| **공동 입력·공동 확인** | "내 데이터만" 접근 제한 없음 → participant 소유 검증 없음 |
| **RLS/권한** | 대결방 코드만 알면 읽기·쓰기 동일 → 기존 MVP 정책 유지 |

**확장 시 준수**: 인증·소유 검증 도입 금지. 공개형 UX 전제로 설계.

### 1.2 UI/UX 기본: 모바일 최적화

| 항목 | 내용 |
|------|------|
| **기본 원칙** | **모바일 화면 최적화 기본** – 지인 대결은 모바일 접속 비중이 높음 |
| **설계** | Mobile-first, 데스크톱은 확장 레이아웃 |
| **구현** | 모든 신규 UI는 모바일 기준으로 먼저 설계·구현 |

### 1.3 기획 제약사항 검토

| 제약 | 검토 결과 | 권장사항 |
|------|----------|----------|
| **Supabase + Cloudflare Pages** | ✅ 호환 가능 | Pages는 SPA 정적 배포, Supabase는 BaaS로 역할 분리 적절 |
| **Functions 없이 SPA 우선** | ⚠️ AI 조언 기능은 서버 로직 필요 | Supabase Edge Functions 도입 권장 (기획 5.1과 일치) |
| **기존 데이터·인프라 활용** | ✅ `challenges`, `participants`, `submissions` 스키마 재사용 | 마이그레이션 최소화 |

### 1.4 기술 제약 해석

- **Cloudflare Pages Functions 없음**: Pages는 정적 사이트 배포에 집중. 서버 로직(AI, PDF, 알림)은 **Supabase Edge Functions** 또는 **Cloudflare Workers**(별도 프로젝트)로 처리.
- **SPA 우선**: React SPA 유지. SEO 필요 시 추후 SSG/SSR 검토.

---

## 2. 현재 아키텍처 (AS-IS)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         BurnFat MVP 아키텍처                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   [Browser]                                                             │
│       │                                                                 │
│       │  React SPA (Vite + MUI)                                         │
│       │  - CreateChallengePage                                          │
│       │  - ChallengePage (참가자/인증/순위 탭)                             │
│       │  - SubmitModal, ImageMaskEditor                                  │
│       │                                                                 │
│       ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Cloudflare Pages (정적 배포)                                      │  │
│   │  - dist/ → wrangler pages deploy                                  │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│       │                                                                 │
│       │  REST API (PostgREST)                                           │
│       │  Storage API                                                    │
│       ▼                                                                 │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Supabase                                                        │  │
│   │  - PostgreSQL (challenges, participants, submissions)            │  │
│   │  - Storage (inbody bucket)                                       │  │
│   │  - RLS: 익명 읽기/쓰기 (코드 기반 MVP)                              │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.1 현재 데이터 모델

```
challenges (id, code, title, start_date, end_date, stake_amount)
    │
    └── participants (id, challenge_id, nickname)
            │
            └── submissions (id, participant_id, type, body_fat_rate, image_url)
                    type: 'start' | 'end'
```

---

## 3. 확장 아키텍처 (TO-BE)

### 3.1 전체 시스템 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           BurnFat V2 확장 아키텍처                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│   [Browser - React SPA]                                                             │
│       │                                                                             │
│       │  • 기존: CreateChallenge, Challenge (참가/인증/순위)                           │
│       │  • 신규: 주간 기록 탭, 목표 체지방 진행률 차트, AI 조언 카드, 리포트 다운로드     │
│       │                                                                             │
│       ▼                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Cloudflare Pages (정적 SPA)                                                  │   │
│   │  - /dist 배포, Functions 없음                                                  │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│       │                                                                             │
│       │  PostgREST / Storage / Edge Functions                                       │
│       ▼                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  Supabase                                                                     │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────────────┐   │   │
│   │  │ PostgreSQL  │  │  Storage   │  │  Edge Functions (Deno)               │   │   │
│   │  │ + RLS       │  │  inbody    │  │  • /ai-advice (OpenAI 연동)           │   │   │
│   │  │             │  │            │  │  • /generate-report (PDF, 선택)        │   │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────────────────────┘   │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│       │                                                                             │
│       │  (선택) Webhooks → Resend/SendGrid                                           │
│       ▼                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │  외부 서비스                                                                   │   │
│   │  • OpenAI API (gpt-4o-mini 권장)                                              │   │
│   │  • Resend / SendGrid (리마인더)                                                │   │
│   └─────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 데이터 흐름 (1순위: 주별 데이터 + AI 조언)

```
[참가 시] participants INSERT (nickname + age, gender, height_cm, target_body_fat)
    │
[주 1회] weekly_logs INSERT (participant_id, week_no, body_fat_rate, weight_kg, ...)
    │
[AI 조언 요청] Frontend → Edge Function /ai-advice
    │           Body: { participant_id }
    │           Function: participants + weekly_logs 조회 → OpenAI API → JSON 응답
    │
[프론트] AI 조언 카드/모달 노출
```

---

## 4. 데이터베이스 스키마 상세

### 4.1 신규 테이블: weekly_logs

```sql
-- 주간 로그 (participant별 주차별 1회)
CREATE TABLE weekly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  week_no INTEGER NOT NULL,
  recorded_at DATE NOT NULL,
  age INTEGER,
  gender TEXT CHECK (gender IN ('M', 'F')),
  weight_kg DECIMAL(5,2),
  height_cm DECIMAL(5,1),
  body_fat_rate DECIMAL(5,2),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),   -- (선택) 수정 이력용, "누가" 수정은 추적하지 않음
  UNIQUE(participant_id, week_no)
);

-- 인덱스: participant별 조회 최적화
CREATE INDEX idx_weekly_logs_participant ON weekly_logs(participant_id);
CREATE INDEX idx_weekly_logs_participant_week ON weekly_logs(participant_id, week_no);

-- updated_at 자동 갱신 (선택)
CREATE OR REPLACE FUNCTION update_weekly_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_weekly_logs_updated_at
  BEFORE UPDATE ON weekly_logs
  FOR EACH ROW EXECUTE PROCEDURE update_weekly_logs_updated_at();

-- RLS
ALTER TABLE weekly_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous read weekly_logs" ON weekly_logs FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert weekly_logs" ON weekly_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous update weekly_logs" ON weekly_logs FOR UPDATE USING (true);  -- 신뢰 기반: 누구나 수정 가능
```

### 4.2 participants 확장

```sql
ALTER TABLE participants ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE participants ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('M', 'F'));
ALTER TABLE participants ADD COLUMN IF NOT EXISTS height_cm DECIMAL(5,1);
ALTER TABLE participants ADD COLUMN IF NOT EXISTS target_body_fat DECIMAL(5,2);
```

### 4.3 challenges 확장 (2.5 대결 템플릿, 2.6 팀 대결)

```sql
-- 대결 템플릿 (4.5단계)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS template_id TEXT;

-- 대결방 규칙/약속 (선택, 기획 6.3)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS rules_text TEXT;

-- 팀 대결 (6단계)
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, name)
);

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'solo' CHECK (mode IN ('solo', 'team'));
ALTER TABLE participants ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
```

### 4.4 ER 다이어그램 (V2)

```
challenges
  ├── participants (1:N)
  │     ├── submissions (1:N, type: start|end)
  │     ├── weekly_logs (1:N, week_no)
  │     └── team_id → teams (N:1, mode=team일 때)
  └── teams (1:N, mode=team일 때)
```

---

## 5. Supabase Edge Functions 상세

### 5.1 AI 조언 함수: `ai-advice`

**경로**: `supabase/functions/ai-advice/index.ts`

**요청**:
```http
POST /functions/v1/ai-advice
Content-Type: application/json
Authorization: Bearer <anon_key>

{
  "participant_id": "uuid"
}
```

**처리 로직**:
1. `participant_id`로 `participants` + `weekly_logs` 조회 (Supabase Client)
2. 대결 기간, 주차별 체지방률 변화 계산
3. OpenAI API 호출 (gpt-4o-mini, 시스템 프롬프트 + 사용자 컨텍스트)
4. JSON `{ "advice": "..." }` 반환

**보안 (공개형)**:
- participant 소유 검증 없음: 대결방 코드 기반 접근만 검증, "내 데이터만" 제한 없음
- RLS: 익명 읽기/쓰기 유지 → 공동 입력·공동 확인 UX
- Rate limiting: Supabase Edge Function 기본 제한 또는 Upstash Redis 연동

**비용**: gpt-4o-mini ~$0.15/1M input, 소규모 사용 시 월 $1~5 수준

### 5.2 (선택) 리포트 생성 함수: `generate-report`

- 클라이언트: `html2canvas` + `jsPDF` 또는 `@react-pdf/renderer`로 PDF 생성 후 다운로드
- 서버 PDF: Edge Function에서 Puppeteer/Playwright 대신 **@react-pdf/renderer** 또는 **pdf-lib** 사용 권장 (Deno 호환)

---

## 6. 프론트엔드 구현 구조

### 6.1 디렉터리 구조 (제안)

```
src/
├── components/
│   ├── SubmitModal.tsx          # 기존
│   ├── ImageMaskEditor.tsx      # 기존
│   ├── WeeklyLogForm.tsx        # 신규: 주간 기록 입력 폼
│   ├── WeeklyLogChart.tsx       # 신규: 체지방률 추이 차트 (recharts 등)
│   ├── AllParticipantsChart.tsx # 신규: 참가자 전원 추이 한눈에 (공동 모니터링)
│   ├── AIAdviceCard.tsx         # 신규: AI 조언 표시 (전원 공개 옵션)
│   ├── ProgressChart.tsx        # 신규: 목표 대비 진행률 (2순위)
│   ├── RecordStatusSummary.tsx  # 신규: "이번 주 N명 기록 완료, M명 미기록"
│   └── BasicInfoModal.tsx      # 신규: 참가 등록 후 기본정보 입력 팝업 (모바일 최적화)
├── pages/
│   ├── CreateChallengePage.tsx  # 기존 + 참가 시 기본정보 입력 확장
│   └── ChallengePage.tsx        # 기존 + 주간 기록 탭, 공동 모니터링
├── lib/
│   ├── supabase.ts              # 기존
│   ├── edgeFunctions.ts         # 신규: Edge Function 호출 래퍼
│   └── formatRelativeTime.ts   # 신규: "N일 전 입력" 포맷
├── hooks/
│   ├── useWeeklyLogs.ts         # 신규: 주간 로그 CRUD
│   ├── useAIAdvice.ts           # 신규: AI 조언 fetch
│   └── useRecordStatus.ts       # 신규: 참가자별 기록 현황 (N명 완료/M명 미기록)
└── types/
    └── index.ts                 # WeeklyLog, Participant 확장 타입 추가
```

### 6.2 ChallengePage 탭 확장

| 탭 | 내용 |
|----|------|
| 참가자 / 인증 | 기존 유지 |
| 순위 | 기존 유지 |
| **주간 기록** | 공동 입력·공동 확인 UX (개인 락 없음, 전원 데이터 나열) |

### 6.3 공개형 UX/카피 (기획 6.1 반영)

| 구분 | 구현 | 기술 포인트 |
|------|------|-------------|
| **입력 버튼** | "OO님 주간 기록 입력" | 본인/타인 구분 없이 동일 라벨, `participant.nickname` 사용 |
| **안내 문구** | "대결방 참가자 누구나 서로의 기록을 입력·확인할 수 있습니다" | 주간 기록 탭 상단에 고정 표시 |
| **탭/섹션** | "주간 기록" | 개인 락 없음, 참가자 전원 데이터 나열 |

### 6.4 공동 모니터링 강화 기능 (기획 6.2 반영)

| 기능 | 구현 | 데이터/API |
|------|------|------------|
| **참가자별 기록 현황** | "이번 주 N명 기록 완료, M명 미기록" 한눈에 표시 | `weekly_logs` + `challenge.start_date`로 현재 주차 계산, `participants` 수와 비교 |
| **전체 추이 한눈에** | 참가자 전원의 주간 체지방 변화를 한 화면에 차트 | `participants` + `weekly_logs` 조인, recharts 라인/바 차트 |
| **최종 수정 시각** | 각 기록에 "N일 전 입력" 표시 | `weekly_logs.created_at` → `formatRelativeTime()` |

### 6.5 신뢰 기반 활용 (기획 6.3 반영)

| 기능 | 구현 | 비고 |
|------|------|------|
| **대결방 규칙/약속** | (선택) "우리 대결방 규칙" 텍스트 영역 | `challenges`에 `rules_text` 컬럼 추가 검토 |
| **공동 케어** | 미기록자에게 "이번 주 기록 부탁해요" 안내 노출 | RecordStatusSummary에서 미기록자 목록 표시 |
| **AI 조언 공개 범위** | 참가자별 AI 조언도 전원 공개 (선택) | AIAdviceCard를 참가자 카드에 포함, 전체 공개 |

### 6.6 악용 방지 (최소 수준, 기획 6.4 반영)

| 위험 | 기술적 대응 |
|------|-------------|
| **대결방 코드 유출** | 코드 공유 범위는 생성자·참가자 책임 (현 구조 유지) |
| **허위 데이터 입력** | 신뢰 기반: 지인 대결 전제, 악의적 입력은 참가자 간 협의 |
| **수정 이력** | (선택) `updated_at`만 유지, "누가" 수정은 추적하지 않음 (익명성 유지) |

### 6.7 주간 기록 입력 플로우

1. **week_no 계산**: `(recorded_at - challenge.start_date) / 7` 또는 사용자 선택
2. **유효성**: `participant_id` + `week_no` UNIQUE로 중복 방지
3. **UI**: 주차별 카드 또는 테이블 행으로 입력 폼 제공

### 6.8 AI 조언 호출 시점

- **옵션 A**: 주간 기록 저장 직후 자동 요청
- **옵션 B**: "AI 조언 보기" 버튼 클릭 시 요청
- **권장**: 옵션 B (API 비용 절감, 사용자 의도적 액션)

---

## 6.9 모바일 최적화 · UI/UX 구현 (기획 4.4 반영)

### 6.9.1 참가하기 2단계 플로우

| 단계 | 구현 | 기술 포인트 |
|------|------|-------------|
| 1 | **참가하기 영역** | 닉네임 TextField + 참가 Button만 노출. 기존 영역 유지 |
| 2 | **참가 등록** | `participants.insert({ challenge_id, nickname })` |
| 3 | **BasicInfoModal 팝업** | 등록 성공 시 `participant_id` 전달하여 모달 오픈 |
| 4 | **기본정보 입력** | age, gender, height_cm, target_body_fat (선택 가능) |
| 5 | **저장** | `participants.update({ id: participant_id, ... })` 후 모달 닫기 |

**데이터 흐름**:
```
[닉네임 입력] → [참가 클릭] → participants INSERT → 성공 시 BasicInfoModal(participant_id) 오픈
→ [기본정보 입력] → [저장] → participants UPDATE → 모달 닫기 → 목록 갱신
```

### 6.9.2 모바일 UX 구현 가이드

| 원칙 | 구현 |
|------|------|
| **터치 타겟** | MUI Button/IconButton `minHeight: 44`, `minWidth: 44` 또는 `touchAction` |
| **참가하기 영역 최소화** | 기본정보 입력란을 참가 영역에 두지 않음. 팝업으로 분리 |
| **모달** | MUI Dialog `fullScreen` (모바일) 또는 `maxWidth="sm"` + 하단 고정 버튼 |
| **입력 폼** | `inputMode="numeric"`, `inputMode="decimal"` 등 모바일 키보드 최적화 |
| **반응형** | `useMediaQuery` 또는 MUI `sx` breakpoints (`xs`, `sm`, `md`) |

### 6.9.3 BasicInfoModal 컴포넌트 스펙

| props | 타입 | 설명 |
|-------|------|------|
| open | boolean | 모달 표시 여부 |
| participantId | string | participants UPDATE 대상 |
| participantNickname | string | "OO님 기본정보" 등 표시용 |
| onClose | () => void | 닫기 (저장 후 또는 취소) |
| onSuccess | () => void | 저장 성공 시 콜백 (목록 갱신) |

| 필드 | 필수 | 비고 |
|------|------|------|
| age | 선택 | number input |
| gender | 선택 | M/F 선택 (Radio 또는 Select) |
| height_cm | 선택 | number input |
| target_body_fat | 선택 | number input, 소수점 |

---

## 7. 기술 스택 및 의존성

### 7.1 기존

| 구분 | 기술 |
|------|------|
| 프론트 | React 18, Vite 6, MUI 7, React Router 6 |
| 배포 | Cloudflare Pages (wrangler) |
| 백엔드 | Supabase (PostgreSQL, Storage, RLS) |

### 7.2 신규 추가

| 구분 | 기술 | 용도 |
|------|------|------|
| 차트 | recharts 또는 Chart.js | 주간 체지방률 추이, 목표 진행률 |
| Edge Functions | Supabase Edge (Deno) | AI 조언, (선택) PDF |
| AI | OpenAI API (gpt-4o-mini) | 체지방 감량 조언 |
| (선택) PDF | @react-pdf/renderer 또는 jsPDF | 클라이언트 리포트 |

### 7.3 패키지 추가 예시

```bash
npm install recharts
# Supabase Edge Functions는 supabase CLI로 별도 관리
```

---

## 8. 보안 및 RLS 정책

### 8.1 현재 정책 (익명)

- 모든 테이블: SELECT, INSERT 허용 (코드 기반 MVP)
- 수정/삭제 정책 없음 → 향후 인증 도입 시 정교화

### 8.2 weekly_logs RLS (공개형·신뢰 기반)

- **소유 검증 없음**: 공동 입력·공동 확인 UX 전제. participant 소유 제한 없음.
- **익명 INSERT 허용**: 대결방 코드만 알면 누구나 특정 참가자의 주간 기록 입력 가능.
- **악용 방지**: 신뢰 기반(지인 대결) 전제. 기술적 차단 없음.

### 8.3 Edge Function 보안

- OpenAI API 키: Supabase Secrets에 저장 (`OPENAI_API_KEY`)
- `participant_id` 검증: 해당 participant가 존재하고, challenge가 유효한지 확인

---

## 9. 배포 및 CI/CD

### 9.1 현재

```
npm run build → wrangler pages deploy dist --project-name=burnfat
```

### 9.2 V2 확장

| 컴포넌트 | 배포 방법 |
|----------|----------|
| SPA | `npm run build && wrangler pages deploy` (기존) |
| Edge Functions | `supabase functions deploy ai-advice` |
| DB 마이그레이션 | Supabase SQL Editor 또는 migrations 폴더 |

### 9.3 환경 변수

| 변수 | 위치 | 용도 |
|------|------|------|
| VITE_SUPABASE_URL | .env | 클라이언트 |
| VITE_SUPABASE_ANON_KEY | .env | 클라이언트 |
| OPENAI_API_KEY | Supabase Secrets | Edge Function |

---

## 10. 구현 단계별 체크리스트

### Phase 1: 주별 데이터 + AI 조언 (1순위)

| # | 작업 | 상세 | 예상 |
|---|------|------|------|
| 1 | DB 스키마 | weekly_logs 테이블, participants 컬럼 추가 | 0.5일 |
| 2 | 참가 시 기본정보 | BasicInfoModal 팝업 (닉네임 등록 후), 참가 영역은 닉네임만 유지 | 1일 |
| 3 | 주간 기록 | WeeklyLogForm, 주차별 입력, weekly_logs CRUD | 1~2일 |
| 4 | 모바일 최적화 | 참가하기 2단계 플로우, 터치 타겟, 모달 반응형 | 0.5일 |
| 5 | 공개형 UX/카피 | "OO님 주간 기록 입력", 안내 문구, 개인 락 없음 | 0.5일 |
| 6 | 공동 모니터링 | RecordStatusSummary(N명 완료/M명 미기록), 전체 추이 차트 | 1일 |
| 7 | 최종 수정 시각 | "N일 전 입력" 포맷 (created_at/updated_at) | 0.25일 |
| 8 | 차트 | recharts로 체지방률 추이 시각화 | 0.5일 |
| 9 | Edge Function | ai-advice 함수, OpenAI 연동 (participant 소유 검증 없음) | 1~2일 |
| 10 | AI 조언 UI | AIAdviceCard, 모달/카드 노출 (전원 공개 옵션) | 0.5일 |

### Phase 2: 목표 체지방 + 진행률 (2순위)

| # | 작업 | 상세 |
|---|------|------|
| 1 | target_body_fat | 참가 시 입력 (Phase 1에 포함 가능) |
| 2 | ProgressChart | 목표 대비 진행률 게이지/바 차트 |

### Phase 3: 결과 리포트 (3순위)

| # | 작업 | 상세 |
|---|------|------|
| 1 | 클라이언트 PDF | html2canvas + jsPDF 또는 @react-pdf/renderer |
| 2 | 리포트 레이아웃 | 순위, 체지방 변화, 간단 통계 |

### Phase 4~6: 템플릿, 리마인더, 팀 대결

- 기획서 우선순위에 따라 순차 진행
- 팀 대결은 스키마 변경이 크므로 별도 스프린트 권장

---

## 11. 리스크 및 대안

| 리스크 | 대안 |
|--------|------|
| Supabase Edge Function 무료 한도 | Pro 플랜 또는 Cloudflare Workers + OpenAI로 이전 |
| OpenAI API 비용 급증 | Rate limit, 캐싱(동일 participant+주차 24h), gpt-4o-mini 고정 |
| Deno 호환성 이슈 | OpenAI SDK Deno 호환 버전 또는 fetch 직접 호출 |
| RLS 익명 정책 악용 | **공개형 철학 유지**: 인증 전환 시 "공동 입력·공동 확인" UX 훼손 → 신뢰 기반 유지 권장 |

---

## 12. 참고 자료

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
- [Cloudflare Pages](https://developers.cloudflare.com/pages/)
- [Recharts](https://recharts.org/)

---

## 13. 공개형·신뢰 기반 설계 원칙 (요약)

| 원칙 | 기술적 구현 |
|------|-------------|
| 공동 입력 | 누구나 특정 참가자 데이터 입력 가능, RLS 익명 INSERT |
| 공동 확인 | 전원 데이터 공개, 개인 락 없음 |
| participant 소유 검증 없음 | Edge Function·RLS 모두 소유 검증 생략 |
| 악용 방지 | 최소 수준, 신뢰(지인 대결) 전제 |

---

*문서 작성일: 2025-02-25 | PRODUCT_PLAN_V2.md (업데이트) 기반*
