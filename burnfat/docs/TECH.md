# BurnFat 기술 문서

## 1. 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **프로젝트명** | BurnFat (번팻) |
| **의미** | 지방을 태워 체지방률을 낮추는 다이어트 내기 |
| **버전** | V1 (MVP) |
| **참조** | crossfit-system 기술·디자인 |

---

## 2. 기술 스택

### 2.1 선정 이유 (crossfit-system 대비)

| 구분 | crossfit-system | BurnFat | 선택 이유 |
|------|-----------------|---------|-----------|
| **프론트 호스팅** | Vercel | **Vercel (`burnfat.wodybody.com`)** | 동일 계정/파이프라인, 서브도메인으로 분리 운영 |
| **DB/Storage** | Railway + PostgreSQL | **Supabase** | 설정 최소화, DB+Storage+Auth 통합, 콜드스타트 적음 |
| **AI 조언** | - | **Flask(Railway) → xAI Grok 프록시** | 키를 서버에 보관, CORS·속도 제한 관리 용이 |
| **프론트 프레임워크** | React (CRA) + MUI | **Vite + React + MUI** | CRA 대비 빠른 빌드, crossfit 디자인 유지 |
| **이미지 저장** | - | **Supabase Storage** | 별도 S3 없이 통합 |

### 2.2 스택 상세

| 레이어 | 기술 | 용도 |
|--------|------|------|
| **빌드** | Vite 6 | 빌드·HMR |
| **프론트** | React 18, TypeScript | UI |
| **UI** | MUI (Material UI) 7 | crossfit-system 테마 호환 |
| **상태** | React Context | 경량 상태 관리 |
| **데이터** | Supabase | PostgreSQL + Storage + Realtime(선택) |
| **AI 조언** | Flask(Railway) + xAI Grok | `/api/burnfat/ai/advice` 프록시 |
| **호스팅** | Vercel | 정적 SPA, 커스텀 도메인 `burnfat.wodybody.com` |

---

## 3. 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│           Vercel (burnfat.wodybody.com)                  │
│              Static: Vite React SPA (burnfat)            │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               ▼                          ▼
┌───────────────────────┐   ┌──────────────────────────────┐
│   Supabase Project    │   │  Railway: wodybody Flask     │
│  PostgreSQL + Storage │   │  /api/burnfat/ai/advice      │
│  challenges /         │   │   └─► xAI Grok API           │
│  participants /       │   │      (서버 보관된 XAI_API_KEY)│
│  submissions / inbody │   └──────────────────────────────┘
└───────────────────────┘
```

---

## 4. 데이터 모델 (Supabase)

### 4.1 ERD

```
challenges                    participants                 submissions
┌──────────────────────┐     ┌──────────────────────┐    ┌──────────────────────┐
│ id (uuid, PK)        │     │ id (uuid, PK)         │    │ id (uuid, PK)        │
│ code (text, unique)  │◄────│ challenge_id (FK)      │◄───│ participant_id (FK)   │
│ title (text)         │     │ nickname (text)       │    │ type ('start'|'end')  │
│ start_date (date)    │     │ created_at (timestamp)│    │ body_fat_rate (float) │
│ end_date (date)      │     └──────────────────────┘    │ image_url (text)      │
│ stake_amount (int)   │                                  │ created_at (timestamp)│
│ created_at           │                                  └──────────────────────┘
└──────────────────────┘
```

### 4.2 테이블 정의

```sql
-- challenges: 대결방
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL DEFAULT '다이어트 챌린지',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  stake_amount INTEGER DEFAULT 50000,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- participants: 참가자 (닉네임만)
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(challenge_id, nickname)
);

-- submissions: 인증 제출 (시작일/종료일 각 1회)
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('start', 'end')),
  body_fat_rate DECIMAL(5,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, type)
);

-- RLS: 익명 접근 허용 (코드 기반)
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- 익명 읽기/쓰기 정책 (MVP: 코드만 알면 접근)
CREATE POLICY "Allow anonymous read" ON challenges FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON participants FOR SELECT USING (true);
CREATE POLICY "Allow anonymous read" ON submissions FOR SELECT USING (true);
CREATE POLICY "Allow anonymous insert" ON participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous insert" ON submissions FOR INSERT WITH CHECK (true);
```

---

## 5. API (Supabase Client)

| 기능 | 메서드 | 테이블 |
|------|--------|--------|
| 대결 조회 | `select().eq('code', code)` | challenges |
| 참가자 목록 | `select().eq('challenge_id', id)` | participants |
| 인증 제출 | `insert({...})` | submissions |
| 인증 목록 | `select().eq('participant_id', id)` | submissions |

---

## 6. 배포 (Vercel)

### 6.1 설정

- **Root directory**: `burnfat`
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Output directory**: `dist`
- **Environment variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
  - (선택) `VITE_AI_ADVICE_URL` — 기본값(Railway 프록시)을 덮어쓸 때
- **커스텀 도메인**: `burnfat.wodybody.com`
- 상세 절차는 [DEPLOY.md](DEPLOY.md) 참고.

### 6.2 배포 속도

- Vercel: `main` push → 빌드 → CDN 전파 (수십 초 수준)
- Supabase: 프로젝트 생성 시점에 바로 사용 가능
- Railway(Grok 프록시): 변경 시 자동 재배포 (wodybody 백엔드 쪽)

---

## 7. 디자인 시스템 (crossfit-system 참조)

### 7.1 컬러

- Primary: `#0284c7` (crossfit sky-blue)
- Success: `#16a34a` (체지방 감소 강조)
- Error: `#dc2626`

### 7.2 타이포그래피

- Font: Noto Sans KR
- crossfit-system `theme.ts` 패턴 활용

### 7.3 컴포넌트

- MUI Button, Card, TextField, Typography
- borderRadius: 12, spacing: 8

---

## 8. V1 기능 범위

| # | 기능 | 구현 |
|---|------|------|
| 1 | 대결방 생성 | 코드 자동 생성, challenges insert |
| 2 | 대결방 입장 | 코드 입력 → challenges 조회 |
| 3 | 참가 등록 | 닉네임 입력, participants insert |
| 4 | 시작일 인증 | 사진 업로드 + 체지방률 입력, submissions insert (type=start) |
| 5 | 종료일 인증 | 사진 업로드 + 체지방률 입력, submissions insert (type=end) |
| 6 | 결과 대시보드 | 감소량 = start - end, 내림차순 정렬 |

---

## 9. 디렉터리 구조

```
burnfat/
├── docs/
│   └── TECH.md          # 본 문서
├── src/
│   ├── components/
│   ├── pages/
│   ├── theme/
│   ├── lib/
│   └── types/
├── public/
├── package.json
├── vite.config.ts
└── README.md
```
