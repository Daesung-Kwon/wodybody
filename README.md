# WODYBODY

크로스핏 운동 프로그램을 만들고 공유하는 모바일 앱입니다.

## 주요 기능

- 운동 프로그램 생성 및 관리
- 개인 기록 추적
- 운동 프로그램 공유
- 실시간 알림
- 다크/라이트 모드 지원

## 기술 스택

### Frontend
- React + TypeScript
- Material-UI (MUI)
- Context API

### Backend
- Python Flask
- SQLite
- WebSocket

## 설치 및 실행

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

## 브랜딩

WODYBODY는 크로스핏 운동을 사랑하는 사람들을 위한 피트니스 트래킹 플랫폼입니다.

## 서브 서비스: BurnFat

`burnfat/` 하위에 체지방 감량 챌린지 서비스(BurnFat)가 포함되어 있습니다.
`burnfat.wodybody.com` 서브도메인으로 서비스됩니다.

### 기술 스택
- Frontend: Vite + React + TypeScript + MUI (별도 빌드, 별도 Vercel 프로젝트)
- Data: Supabase (PostgreSQL + Storage) — 현행 유지
- AI 조언: Flask 백엔드의 Grok 프록시(`/api/burnfat/ai/advice`) 경유 — xAI Grok 사용
- 호스팅: Vercel (`burnfat.wodybody.com`) — Cloudflare 관련 설정·코드는 사용하지 않음

### 로컬 실행
```bash
cd burnfat
npm install
cp .env.example .env   # VITE_SUPABASE_URL, VITE_AI_ADVICE_URL 설정
npm run dev
```

### 배포 파이프라인
- `burnfat/**` 경로 변경 시 `.github/workflows/burnfat.yml`에서 빌드 검증
- 프로덕션 배포는 Vercel Git Integration 사용 (Root Directory: `burnfat`)
- 커스텀 도메인: `burnfat.wodybody.com`

### Railway 백엔드 추가 환경 변수
- `XAI_API_KEY` — xAI Grok API Key
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — AI 컨텍스트 조회용(백엔드 전용)
- `CORS_ORIGINS`에 `https://burnfat.wodybody.com` 추가

