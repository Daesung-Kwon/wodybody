# Railway 배포 가이드

## 1. Railway CLI 설치 및 배포

### CLI 설치
```bash
# npm을 통한 설치
npm install -g @railway/cli

# 또는 curl을 통한 설치
curl -fsSL https://railway.app/install.sh | sh
```

### CLI를 통한 배포
```bash
# Railway 로그인
railway login

# 프로젝트 연결
railway link

# backend 브랜치에서 배포
git checkout backend
railway up
```

## 2. GitHub Actions를 통한 자동 배포

### 설정된 워크플로우
- `.github/workflows/railway-deploy.yml`: backend 브랜치 푸시 시 자동 배포
- `.github/workflows/deploy.yml`: main/backend 브랜치 푸시 시 전체 배포

### 수동 트리거
1. GitHub 저장소 → Actions 탭
2. "Railway Backend Deploy" 워크플로우 선택
3. "Run workflow" 버튼 클릭
4. backend 브랜치 선택 후 실행

## 3. Railway 대시보드에서 수동 배포

### 현재 Railway 인터페이스에서 찾을 수 있는 옵션들:

1. **Deployments 탭**
   - 최근 배포 목록 확인
   - "Redeploy" 버튼 (기존 배포 재실행)

2. **Settings 탭**
   - Auto Deploy 설정 확인
   - Production Branch 설정

3. **Variables 탭**
   - 환경 변수 설정

### 수동 배포 버튼이 없는 경우:
- Railway가 GitHub Actions를 통한 배포를 우선 사용
- CLI를 통한 배포 권장
- GitHub Actions의 workflow_dispatch 사용

## 4. 문제 해결

### Railway 토큰 설정
GitHub Secrets에 다음 설정 필요:
- `RAILWAY_TOKEN`: Railway API 토큰
- Railway 대시보드 → Account Settings → Tokens에서 생성

### 배포 실패 시 확인사항:
1. Railway 로그 확인
2. GitHub Actions 로그 확인
3. 환경 변수 설정 확인
4. requirements.txt 의존성 확인
