# BurnFat 배포 가이드

BurnFat은 **Vercel(프론트) + Supabase(데이터) + Railway(AI 프록시)** 구성으로 운영됩니다.

## 1. 사전 준비

- [Supabase](https://supabase.com) 프로젝트 생성 및 `docs/supabase-setup.sql` 실행
- Supabase Storage에 `inbody` 버킷 생성 (Public)
- [Vercel](https://vercel.com) 계정
- wodybody Flask 백엔드(Railway)가 배포되어 있어야 함 (Grok 프록시 사용)

## 2. Vercel 배포

1. **Vercel Dashboard** → New Project → GitHub 저장소 선택
2. 프로젝트 설정:
   - **Root Directory**: `burnfat`
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon / publishable key
   - (선택) `VITE_AI_ADVICE_URL`: 기본값(Railway 프록시)을 덮어쓸 때만 지정
4. Deploy 실행

`burnfat/vercel.json`의 `git.deploymentEnabled.main = true` 덕분에 `main` 브랜치 push 시만 배포됩니다. SPA 라우팅을 위해 모든 경로가 `index.html`로 rewrite 됩니다.

## 3. 커스텀 도메인

1. Vercel 프로젝트 → **Settings → Domains** → `burnfat.wodybody.com` 추가
2. DNS(Squarespace) 관리:
   - **Type**: `CNAME`
   - **Host**: `burnfat`
   - **Value**: Vercel이 안내하는 프로젝트별 값 (예: `dXXXXXXXXXXXXXXXX.vercel-dns-0XX.com.`)
3. HTTPS 발급 완료 후 `https://burnfat.wodybody.com` 200 응답 확인

## 4. AI 조언(Grok) 연동

AI 조언은 **wodybody Flask 백엔드(Railway)** 의 Grok 프록시를 호출합니다.

### 4.1 Railway 환경 변수 (wodybody 백엔드 쪽)

| 변수 | 용도 |
|------|------|
| `XAI_API_KEY` | xAI Grok API Key |
| `XAI_MODEL` (선택) | 기본 `grok-4-1-fast-non-reasoning` |
| `SUPABASE_URL` | AI 컨텍스트용 Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용 서비스 롤 키 |
| `CORS_ORIGINS` | `https://burnfat.wodybody.com, https://wodybody.vercel.app` 포함 |

### 4.2 엔드포인트

- `POST /api/burnfat/ai/advice` — `{ participant_id }` → `{ advice }`
- `GET /api/burnfat/ai/health` — 운영 상태 점검

### 4.3 프론트 호출

`src/lib/edgeFunctions.ts`가 다음 URL로 POST를 보냅니다.

```
https://wodybody-production.up.railway.app/api/burnfat/ai/advice
```

`VITE_AI_ADVICE_URL` 환경 변수가 설정된 경우 그 값을 우선 사용합니다.

## 5. 배포 확인 체크리스트

- [ ] `https://burnfat.wodybody.com` 200 응답
- [ ] 대결 생성 → 참가 → 인증 업로드 → 대시보드 정상
- [ ] **AI 조언 보기** 클릭 시 Network 탭에 Railway 도메인으로 POST, 200 OK, `advice` 텍스트 표시
- [ ] 브라우저 콘솔에 CORS 에러 없음
