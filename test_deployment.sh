#!/bin/bash

# 배포 테스트 스크립트
# 사용법: ./test_deployment.sh [backend_url] [frontend_url]

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 기본 URL 설정
BACKEND_URL=${1:-"https://your-backend.railway.app"}
FRONTEND_URL=${2:-"https://your-frontend.vercel.app"}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 백엔드 테스트
test_backend() {
    log_info "백엔드 테스트 시작..."
    
    # 헬스체크 테스트
    log_info "헬스체크 테스트..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/health")
    
    if [ "$response" = "200" ]; then
        log_info "헬스체크 성공 (HTTP $response)"
    else
        log_error "헬스체크 실패 (HTTP $response)"
        return 1
    fi
    
    # API 엔드포인트 테스트
    log_info "API 엔드포인트 테스트..."
    
    # 운동 목록 테스트
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/exercises")
    if [ "$response" = "200" ]; then
        log_info "운동 목록 API 성공 (HTTP $response)"
    else
        log_warn "운동 목록 API 실패 (HTTP $response)"
    fi
    
    # 프로그램 목록 테스트
    response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/api/programs")
    if [ "$response" = "200" ]; then
        log_info "프로그램 목록 API 성공 (HTTP $response)"
    else
        log_warn "프로그램 목록 API 실패 (HTTP $response)"
    fi
    
    log_info "백엔드 테스트 완료!"
}

# 프론트엔드 테스트
test_frontend() {
    log_info "프론트엔드 테스트 시작..."
    
    # 페이지 로딩 테스트
    log_info "페이지 로딩 테스트..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
    
    if [ "$response" = "200" ]; then
        log_info "페이지 로딩 성공 (HTTP $response)"
    else
        log_error "페이지 로딩 실패 (HTTP $response)"
        return 1
    fi
    
    # 정적 파일 테스트
    log_info "정적 파일 테스트..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/static/js/main.js")
    
    if [ "$response" = "200" ]; then
        log_info "정적 파일 로딩 성공 (HTTP $response)"
    else
        log_warn "정적 파일 로딩 실패 (HTTP $response)"
    fi
    
    log_info "프론트엔드 테스트 완료!"
}

# 전체 테스트
test_all() {
    log_info "전체 배포 테스트 시작..."
    log_info "백엔드 URL: $BACKEND_URL"
    log_info "프론트엔드 URL: $FRONTEND_URL"
    
    test_backend
    test_frontend
    
    log_info "전체 테스트 완료!"
    log_info "서비스가 정상적으로 배포되었습니다."
}

# 메인 실행
test_all
