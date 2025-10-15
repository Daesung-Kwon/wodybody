#!/bin/bash
# CRUD 작업 전체 테스트

BASE_URL="http://localhost:5001/api"
PASS=0
FAIL=0

echo "🧪 ========================================"
echo "   CRUD 작업 통합 테스트"
echo "========================================"
echo ""

# 테스트 로그인
echo "🔐 테스트 사용자 로그인..."
curl -s -c /tmp/test_cookies.txt -X POST $BASE_URL/debug/test-login \
    -H "Content-Type: application/json" \
    -d '{"user_id":1}' > /dev/null
echo "✅ 로그인 완료"
echo ""

# ========================================
# Programs CRUD 테스트 (programs.py)
# ========================================
echo "📦 [Programs] CRUD 테스트"
echo "----------------------------------------"

# CREATE - 프로그램 생성
echo "1️⃣  프로그램 생성 (POST /api/programs)..."
CREATE_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X POST $BASE_URL/programs \
    -H "Content-Type: application/json" \
    -d '{
        "title": "리팩토링 테스트 WOD",
        "description": "자동화 테스트용",
        "workout_type": "time_based",
        "target_value": "20분",
        "difficulty": "beginner",
        "max_participants": 10,
        "selected_exercises": []
    }')
PROGRAM_ID=$(echo "$CREATE_RESPONSE" | jq -r '.program_id' 2>/dev/null)
if [ "$PROGRAM_ID" != "null" ] && [ -n "$PROGRAM_ID" ]; then
    echo "✅ PASS - 프로그램 생성 성공 (ID: $PROGRAM_ID)"
    ((PASS++))
else
    echo "❌ FAIL - 프로그램 생성"
    echo "Response: $CREATE_RESPONSE"
    ((FAIL++))
    PROGRAM_ID=""
fi

# READ - 내 프로그램 조회
echo "2️⃣  내 프로그램 조회 (GET /api/user/programs)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt $BASE_URL/user/programs)
if echo "$RESPONSE" | jq -e '.programs | length > 0' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.programs | length')
    echo "✅ PASS - $COUNT개 프로그램 조회 성공"
    ((PASS++))
else
    echo "❌ FAIL - 내 프로그램 조회"
    ((FAIL++))
fi

# UPDATE - 프로그램 수정 (생성된 프로그램이 있을 때만)
if [ -n "$PROGRAM_ID" ]; then
    echo "3️⃣  프로그램 수정 (PUT /api/programs/$PROGRAM_ID)..."
    UPDATE_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X PUT $BASE_URL/programs/$PROGRAM_ID \
        -H "Content-Type: application/json" \
        -d '{
            "title": "리팩토링 테스트 WOD (수정됨)",
            "description": "자동화 테스트용 - 수정",
            "workout_type": "time_based",
            "target_value": "15분",
            "difficulty": "intermediate",
            "max_participants": 15,
            "selected_exercises": []
        }')
    if echo "$UPDATE_RESPONSE" | jq -e '.message | contains("수정")' > /dev/null 2>&1; then
        echo "✅ PASS - 프로그램 수정 성공"
        ((PASS++))
    else
        echo "❌ FAIL - 프로그램 수정"
        ((FAIL++))
    fi
fi

# DELETE - 프로그램 삭제 (생성된 프로그램이 있을 때만)
if [ -n "$PROGRAM_ID" ]; then
    echo "4️⃣  프로그램 삭제 (DELETE /api/programs/$PROGRAM_ID)..."
    DELETE_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X DELETE $BASE_URL/programs/$PROGRAM_ID)
    if echo "$DELETE_RESPONSE" | jq -e '.message | contains("삭제")' > /dev/null 2>&1; then
        echo "✅ PASS - 프로그램 삭제 성공"
        ((PASS++))
    else
        echo "❌ FAIL - 프로그램 삭제"
        ((FAIL++))
    fi
fi

echo ""

# ========================================
# Notifications CRUD 테스트 (notifications.py)
# ========================================
echo "🔔 [Notifications] 테스트"
echo "----------------------------------------"

# READ - 알림 목록
echo "5️⃣  알림 목록 조회 (GET /api/notifications)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt $BASE_URL/notifications)
if echo "$RESPONSE" | jq -e 'type == "array"' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq 'length')
    UNREAD=$(echo "$RESPONSE" | jq '[.[] | select(.is_read == false)] | length')
    echo "✅ PASS - $COUNT개 알림 (읽지 않음: $UNREAD)"
    ((PASS++))
else
    echo "❌ FAIL - 알림 조회"
    ((FAIL++))
fi

# UPDATE - 모든 알림 읽음 처리
echo "6️⃣  모든 알림 읽음 (PUT /api/notifications/read-all)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X PUT $BASE_URL/notifications/read-all)
if echo "$RESPONSE" | jq -e '.message | contains("알림")' > /dev/null 2>&1; then
    echo "✅ PASS - 모든 알림 읽음 처리 성공"
    ((PASS++))
else
    echo "❌ FAIL - 알림 읽음 처리"
    ((FAIL++))
fi

echo ""

# ========================================
# Workout Records 테스트
# ========================================
echo "💪 [Workout Records] 테스트"
echo "----------------------------------------"

echo "7️⃣  개인 운동 기록 조회 (GET /api/users/records)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt $BASE_URL/users/records)
if echo "$RESPONSE" | jq -e '.records' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.records | length')
    echo "✅ PASS - $COUNT개 운동 기록"
    ((PASS++))
else
    echo "❌ FAIL - 운동 기록 조회"
    ((FAIL++))
fi

echo "8️⃣  개인 통계 조회 (GET /api/users/records/stats)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt $BASE_URL/users/records/stats)
if echo "$RESPONSE" | jq -e '.total_workouts' > /dev/null 2>&1; then
    TOTAL=$(echo "$RESPONSE" | jq '.total_workouts')
    AVG=$(echo "$RESPONSE" | jq '.average_time')
    echo "✅ PASS - 통계 조회 (총: $TOTAL, 평균: ${AVG}s)"
    ((PASS++))
else
    echo "❌ FAIL - 통계 조회"
    ((FAIL++))
fi

echo ""

# ========================================
# Goals 테스트
# ========================================
echo "🎯 [Goals] 테스트"
echo "----------------------------------------"

echo "9️⃣  개인 목표 조회 (GET /api/users/goals)..."
RESPONSE=$(curl -s -b /tmp/test_cookies.txt $BASE_URL/users/goals)
if echo "$RESPONSE" | jq -e '.goals' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.goals | length')
    echo "✅ PASS - $COUNT개 목표"
    ((PASS++))
else
    echo "❌ FAIL - 목표 조회"
    ((FAIL++))
fi

echo ""

# ========================================
# 최종 결과
# ========================================
echo "========================================"
echo "   🏆 최종 통합 테스트 결과"
echo "========================================"
echo ""
echo "✅ PASS: $PASS / 9"
echo "❌ FAIL: $FAIL / 9"
echo "📊 성공률: $(( PASS * 100 / 9 ))%"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉🎉🎉 완벽! 모든 CRUD 작업 정상! 🎉🎉🎉"
    echo ""
    echo "검증된 기능:"
    echo "  ✅ Programs: CREATE, READ, UPDATE, DELETE"
    echo "  ✅ Notifications: READ, UPDATE"
    echo "  ✅ Workout Records: READ, STATS"
    echo "  ✅ Goals: READ"
    echo ""
    exit 0
else
    echo "⚠️  일부 기능에 문제가 있습니다"
    exit 1
fi

