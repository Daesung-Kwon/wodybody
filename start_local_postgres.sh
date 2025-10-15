#!/bin/bash

echo "🐘 로컬 PostgreSQL 환경 시작"
echo "================================"
echo ""

# Docker 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다."
    echo "   https://www.docker.com/products/docker-desktop 에서 설치해주세요."
    exit 1
fi

# Docker Compose 확인
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되어 있지 않습니다."
    exit 1
fi

# 1. PostgreSQL 시작
echo "1️⃣  PostgreSQL 컨테이너 시작..."
cd "$(dirname "$0")"
docker-compose up -d

# 컨테이너 시작 대기
echo "   PostgreSQL 초기화 대기 중..."
sleep 5

# 컨테이너 상태 확인
if docker ps | grep -q crossfit-postgres; then
    echo "   ✅ PostgreSQL 실행 중 (포트 5432)"
else
    echo "   ❌ PostgreSQL 시작 실패"
    exit 1
fi

# 2. 마이그레이션 확인
echo ""
echo "2️⃣  데이터 마이그레이션"

# SQLite DB 존재 확인
if [ -f "backend/instance/crossfit.db" ]; then
    echo "   📂 SQLite DB 발견"
    read -p "   SQLite 데이터를 PostgreSQL로 마이그레이션하시겠습니까? (y/n): " migrate
    
    if [ "$migrate" = "y" ] || [ "$migrate" = "Y" ]; then
        cd backend
        source venv/bin/activate 2>/dev/null || true
        export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
        
        # psycopg2 설치 확인
        if ! python -c "import psycopg2" 2>/dev/null; then
            echo "   📦 psycopg2-binary 설치 중..."
            pip install psycopg2-binary
        fi
        
        echo "yes" | python migrate_to_postgres.py
        cd ..
    else
        echo "   ⏭️  마이그레이션 건너뛰기"
    fi
else
    echo "   ℹ️  SQLite DB 없음 (새로 시작)"
    cd backend
    source venv/bin/activate 2>/dev/null || true
    export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit
    
    # 테이블만 생성
    python -c "from app import app, db; app.app_context().push(); db.create_all(); print('✅ 테이블 생성 완료')"
    cd ..
fi

# 3. 사용 방법 안내
echo ""
echo "================================"
echo "✅ PostgreSQL 환경 준비 완료!"
echo "================================"
echo ""
echo "🚀 백엔드 시작 방법:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   export DATABASE_URL=postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit"
echo "   python app.py"
echo ""
echo "📊 PostgreSQL 접속:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: crossfit"
echo "   User: crossfit_user"
echo "   Password: crossfit_password"
echo ""
echo "🛑 PostgreSQL 종료:"
echo "   docker-compose down"
echo ""
echo "💾 데이터 삭제 (주의!):"
echo "   docker-compose down -v"
echo ""

