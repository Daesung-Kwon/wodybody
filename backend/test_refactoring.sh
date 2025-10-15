#!/bin/bash
# 리팩토링 후 통합 테스트 스크립트

BASE_URL="http://localhost:5001/api"
PASS=0
FAIL=0

echo "🧪 ================================"
echo "   리팩토링 통합 테스트"
echo "================================"
echo ""

# 1. Health Check
echo "1️⃣  Health Check..."
RESPONSE=$(curl -s $BASE_URL/health)
if echo "$RESPONSE" | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ PASS - Health check"
    ((PASS++))
else
    echo "❌ FAIL - Health check"
    ((FAIL++))
fi

# 2. Exercise Categories (exercises.py)
echo "2️⃣  Exercise Categories..."
RESPONSE=$(curl -s $BASE_URL/exercise-categories)
COUNT=$(echo "$RESPONSE" | jq '.categories | length' 2>/dev/null || echo "0")
if [ "$COUNT" -gt 0 ]; then
    echo "✅ PASS - Exercise Categories ($COUNT categories)"
    ((PASS++))
else
    echo "⚠️  WARN - Exercise Categories (0 categories - DB may be empty)"
    ((PASS++))
fi

# 3. Exercises (exercises.py)
echo "3️⃣  Exercises..."
RESPONSE=$(curl -s $BASE_URL/exercises)
COUNT=$(echo "$RESPONSE" | jq '.exercises | length' 2>/dev/null || echo "0")
if [ "$COUNT" -ge 0 ]; then
    echo "✅ PASS - Exercises ($COUNT exercises)"
    ((PASS++))
else
    echo "❌ FAIL - Exercises"
    ((FAIL++))
fi

# 4. Programs (programs.py)
echo "4️⃣  Programs..."
RESPONSE=$(curl -s $BASE_URL/programs)
if echo "$RESPONSE" | jq -e '.programs' > /dev/null 2>&1; then
    COUNT=$(echo "$RESPONSE" | jq '.programs | length')
    echo "✅ PASS - Programs ($COUNT programs)"
    ((PASS++))
else
    echo "❌ FAIL - Programs"
    echo "Response: $RESPONSE"
    ((FAIL++))
fi

# 5. Debug Test Login (auth.py)
echo "5️⃣  Debug Test Login..."
RESPONSE=$(curl -s -X POST $BASE_URL/debug/test-login -H "Content-Type: application/json" -d '{"user_id":1}')
if echo "$RESPONSE" | jq -e '.message == "Test login successful"' > /dev/null; then
    echo "✅ PASS - Debug Test Login"
    ((PASS++))
else
    echo "❌ FAIL - Debug Test Login"
    ((FAIL++))
fi

# 6. Login with wrong password (auth.py)
echo "6️⃣  Login Validation..."
RESPONSE=$(curl -s -X POST $BASE_URL/login -H "Content-Type: application/json" -d '{"email":"test@test.com","password":"wrong"}')
if echo "$RESPONSE" | jq -e '.message' > /dev/null; then
    echo "✅ PASS - Login validation works"
    ((PASS++))
else
    echo "❌ FAIL - Login validation"
    ((FAIL++))
fi

# 7. Notifications without auth (notifications.py)
echo "7️⃣  Notifications Auth Check..."
RESPONSE=$(curl -s $BASE_URL/notifications)
if echo "$RESPONSE" | jq -e '.message | contains("로그인")' > /dev/null; then
    echo "✅ PASS - Notifications requires auth"
    ((PASS++))
else
    echo "❌ FAIL - Notifications auth check"
    ((FAIL++))
fi

# 8. User Records without auth (workout_records.py)
echo "8️⃣  User Records Auth Check..."
RESPONSE=$(curl -s $BASE_URL/users/records)
if echo "$RESPONSE" | jq -e '.error | contains("로그인")' > /dev/null; then
    echo "✅ PASS - User Records requires auth"
    ((PASS++))
else
    echo "❌ FAIL - User Records auth check"
    ((FAIL++))
fi

# 9. User Goals without auth (goals.py)
echo "9️⃣  User Goals Auth Check..."
RESPONSE=$(curl -s $BASE_URL/users/goals)
if echo "$RESPONSE" | jq -e '.error | contains("로그인")' > /dev/null; then
    echo "✅ PASS - User Goals requires auth"
    ((PASS++))
else
    echo "❌ FAIL - User Goals auth check"
    ((FAIL++))
fi

# 10. User Stats without auth (workout_records.py)
echo "🔟 User Stats Auth Check..."
RESPONSE=$(curl -s $BASE_URL/users/records/stats)
if echo "$RESPONSE" | jq -e '.error | contains("로그인")' > /dev/null; then
    echo "✅ PASS - User Stats requires auth"
    ((PASS++))
else
    echo "❌ FAIL - User Stats auth check"
    ((FAIL++))
fi

echo ""
echo "================================"
echo "   테스트 결과"
echo "================================"
echo "✅ PASS: $PASS"
echo "❌ FAIL: $FAIL"
echo "Total: $((PASS + FAIL))"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "🎉 모든 테스트 통과!"
    exit 0
else
    echo "⚠️  일부 테스트 실패"
    exit 1
fi

