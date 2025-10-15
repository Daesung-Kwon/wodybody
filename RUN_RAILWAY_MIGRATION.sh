#!/bin/bash

# Railway PostgreSQL 마이그레이션 실행 스크립트

echo "======================================"
echo "Railway PostgreSQL 신규 운동 추가"
echo "======================================"
echo ""

# PATH 설정
export PATH="$HOME/.npm-global/bin:$PATH"

# Railway 버전 확인
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI가 설치되지 않았습니다."
    echo "다음 명령으로 설치하세요: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI 버전: $(railway --version)"
echo ""

# 로그인 상태 확인
echo "📝 Railway 로그인이 필요합니다."
echo "브라우저가 열리면 로그인해주세요..."
echo ""

railway login

if [ $? -ne 0 ]; then
    echo "❌ 로그인 실패"
    exit 1
fi

echo ""
echo "✅ 로그인 성공"
echo ""

# 프로젝트 연결
echo "📦 프로젝트 연결 중..."
echo ""
echo "⚠️  서비스 선택 시 'wodybody' (Backend)를 선택하세요!"
echo "   (Postgres가 아닌 wodybody 선택)"
echo ""
railway link -p 6008d760-34b2-45d7-b715-ac741b999775

if [ $? -ne 0 ]; then
    echo "❌ 프로젝트 연결 실패"
    exit 1
fi

echo ""
echo "✅ 프로젝트 연결 성공"
echo ""

# SQL 파일 경로
SQL_FILE="RAILWAY_SQL_MIGRATION.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ SQL 파일을 찾을 수 없습니다: $SQL_FILE"
    exit 1
fi

echo "🚀 SQL 마이그레이션 실행 중..."
echo ""

# PostgreSQL 쉘에서 SQL 실행
railway run psql -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo ""
    echo "======================================"
    echo "✅ 마이그레이션 완료!"
    echo "======================================"
    echo ""
    echo "프로덕션에서 53개 운동이 표시되어야 합니다."
else
    echo ""
    echo "❌ 마이그레이션 실패"
    echo "수동으로 Railway 대시보드에서 SQL을 실행해주세요."
fi


