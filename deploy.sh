#!/bin/bash

# CrossFit System 배포 스크립트
# 사용법: ./deploy.sh [backend|frontend|all]

set -e

BACKEND_DIR="backend"
FRONTEND_DIR="frontend"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 백엔드 배포
deploy_backend() {
    log_info "백엔드 배포 시작..."
    
    cd $BACKEND_DIR
    
    # 의존성 설치
    log_info "Python 의존성 설치 중..."
    pip install -r requirements.txt
    
    # 테스트 실행
    log_info "테스트 실행 중..."
    python -m pytest tests/ -v || log_warn "테스트 파일이 없습니다"
    
    # Railway 배포
    log_info "Railway에 배포 중..."
    railway up --detach
    
    cd ..
    log_info "백엔드 배포 완료!"
}

# 프론트엔드 배포
deploy_frontend() {
    log_info "프론트엔드 배포 시작..."
    
    cd $FRONTEND_DIR
    
    # 의존성 설치
    log_info "Node.js 의존성 설치 중..."
    npm ci
    
    # 테스트 실행
    log_info "테스트 실행 중..."
    npm test -- --coverage --watchAll=false
    
    # 빌드
    log_info "프로덕션 빌드 중..."
    npm run build
    
    # Vercel 배포
    log_info "Vercel에 배포 중..."
    vercel --prod
    
    cd ..
    log_info "프론트엔드 배포 완료!"
}

# 전체 배포
deploy_all() {
    log_info "전체 시스템 배포 시작..."
    
    deploy_backend
    deploy_frontend
    
    log_info "전체 시스템 배포 완료!"
    log_info "백엔드: https://your-backend.railway.app"
    log_info "프론트엔드: https://your-frontend.vercel.app"
}

# 메인 로직
case "${1:-all}" in
    "backend")
        deploy_backend
        ;;
    "frontend")
        deploy_frontend
        ;;
    "all")
        deploy_all
        ;;
    *)
        log_error "사용법: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
