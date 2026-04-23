# BurnFat 배포 가이드

## Cloudflare Pages 배포 (Vercel/Railway 대비 빠른 구동)

Cloudflare Pages는 200+ 전역 엣지에서 서빙되며, Supabase와 함께 사용 시 별도 백엔드 서버 없이 빠르게 서비스를 제공할 수 있습니다.

### 1. 사전 준비

- [Supabase](https://supabase.com) 프로젝트 생성 및 `docs/supabase-setup.sql` 실행
- [Cloudflare](https://dash.cloudflare.com) 계정

### 2. Cloudflare Pages 배포

1. **Cloudflare Dashboard** → Pages → Create a project → Connect to Git
2. 저장소 선택 후 설정:
   - **Framework preset**: None (또는 Vite)
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Root directory**: (비워두기)
3. **Environment variables** 추가:
   - `VITE_SUPABASE_URL`: Supabase 프로젝트 URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anon public key
4. Save and Deploy

### 3. Supabase Storage 버킷

- Storage → New bucket → 이름: `inbody`
- Public bucket으로 생성
- Policies: `Allow public read` (또는 RLS로 제어)

### 4. 배포 확인

- 배포 완료 후 `https://<project>.pages.dev` 접속
- 대결 생성 → 코드 공유 → 참가자 입장 → 인증 업로드 → 순위 확인

---

## Vercel/Railway 대비 비교

| 항목 | Vercel + Railway | Cloudflare Pages + Supabase |
|------|------------------|-----------------------------|
| 백엔드 | 별도 Flask/Node 서버 | Supabase (Managed BaaS) |
| DB | PostgreSQL (Railway) | Supabase PostgreSQL |
| 이미지 | 별도 S3/스토리지 | Supabase Storage |
| 콜드스타트 | 있음 (Railway) | Supabase 연결 풀 최적화 |
| 대역폭 | 유료 플랜 제한 | 무제한 (Pages 무료) |
| 설정 복잡도 | 높음 | 낮음 |
