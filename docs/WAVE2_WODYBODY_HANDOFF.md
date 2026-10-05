# Wave 2 핸드오프 — CRA → Vite + BurnFat 번들

날짜: 2026-09-16
상태: 코드 완료 (`frontend` Vite, `@burnfat` alias)

## 무엇을 바꿨나

- `frontend/` 는 CRA(`react-scripts`) 가 아니라 Vite 6.
- BurnFat 소스는 복사하지 않고 `../burnfat/src` 를 `@burnfat` 로 같은 번들에 넣음.
- Capacitor `webDir` = `../frontend/dist`
- `/burnfat`, `/burnfat/create`, `/burnfat/c/:code` 가 실제 BurnFat 화면.
- `burnfat.wodybody.com` 호스트면 PT 없이 BurnFat만 (`/`, `/create`, `/c/:code`).
- 기존 `burnfat/` Vite 프로젝트는 그대로 배포 가능 (`setBurnFatStandalone(true)`).

## 환경 변수

프론트 빌드:

- `VITE_API_URL` (기존 `REACT_APP_API_URL` 도 `envPrefix` 로 읽힘)
- BurnFat을 이 번들에서 쓰려면 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

Vercel 프로젝트 Root Directory 는 계속 `frontend`. Framework: Vite, output: `dist`.

## 확인 명령

```bash
cd frontend && npm test && npm run build
```
