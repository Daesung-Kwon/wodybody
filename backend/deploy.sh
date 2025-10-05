#!/bin/bash

# Railway 배포 스크립트
echo "Starting Railway deployment for backend..."

# Python 의존성 설치
pip install -r requirements.txt

# Flask 앱 실행
echo "Starting Flask application..."
python app.py

# Railway 헬스체크 엔드포인트 확인
if curl -f http://localhost:8000/api/health; then
    echo "Health check passed"
else
    echo "Health check failed"
    exit 1
fi
