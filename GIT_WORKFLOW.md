# Git 브랜치 전략 가이드

## 브랜치 구조

```
main (통합 브랜치)
├── frontend (프론트엔드 전용)
└── backend (백엔드 전용)
```

## 브랜치별 역할

### main
- **용도**: 프로덕션 배포용 통합 브랜치
- **배포**: Vercel에서 비활성화 (불필요한 배포 방지)
- **사용법**: frontend/backend 브랜치에서 머지된 안정적인 코드만 유지

### frontend
- **용도**: React 프론트엔드 개발 전용
- **배포**: Vercel에서 자동 배포 활성화
- **사용법**: UI/UX 변경, 컴포넌트 개발, 프론트엔드 기능 추가

### backend
- **용도**: Flask 백엔드 개발 전용
- **배포**: Railway에서 자동 배포 (기존 설정 유지)
- **사용법**: API 개발, 데이터베이스 변경, 백엔드 로직 수정

## 워크플로우

### 1. 프론트엔드 개발
```bash
# frontend 브랜치로 전환
git checkout frontend

# 새 기능 브랜치 생성 (선택사항)
git checkout -b feature/new-ui-component

# 개발 및 커밋
git add .
git commit -m "feat: 새로운 UI 컴포넌트 추가"

# frontend 브랜치에 푸시
git push origin frontend

# 필요시 main에 머지
git checkout main
git merge frontend
git push origin main
```

### 2. 백엔드 개발
```bash
# backend 브랜치로 전환
git checkout backend

# 새 기능 브랜치 생성 (선택사항)
git checkout -b feature/new-api-endpoint

# 개발 및 커밋
git add .
git commit -m "feat: 새로운 API 엔드포인트 추가"

# backend 브랜치에 푸시
git push origin backend

# 필요시 main에 머지
git checkout main
git merge backend
git push origin main
```

### 3. 통합 배포
```bash
# main 브랜치에서 최신 변경사항 확인
git checkout main
git pull origin main

# 필요시 통합 테스트 수행
# ...

# 태그 생성 및 배포
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

## Vercel 설정

현재 `frontend/vercel.json`에서 다음 설정으로 변경됨:
- `frontend` 브랜치만 배포 활성화
- `main`, `backend` 브랜치는 배포 비활성화

## 주의사항

1. **브랜치 전환 시**: 항상 현재 변경사항을 커밋하거나 스태시
2. **머지 시**: 충돌 해결 후 테스트 필수
3. **배포 확인**: 각 브랜치별 배포 상태 모니터링
4. **환경 변수**: 각 브랜치별 환경 변수 설정 확인

## 문제 해결

### 불필요한 배포가 계속 발생하는 경우
1. Vercel 대시보드에서 배포 브랜치 설정 확인
2. `vercel.json`의 `git.deploymentEnabled` 설정 검토
3. 웹훅 설정 확인

### 브랜치 동기화 문제
```bash
# main에서 최신 변경사항 가져오기
git checkout main
git pull origin main

# 각 브랜치에 반영
git checkout frontend
git merge main
git push origin frontend

git checkout backend
git merge main
git push origin backend
```

## 커밋 메시지 규칙

- `feat:` 새로운 기능
- `fix:` 버그 수정
- `docs:` 문서 변경
- `style:` 코드 포맷팅
- `refactor:` 코드 리팩토링
- `test:` 테스트 추가/수정
- `chore:` 빌드/설정 변경
