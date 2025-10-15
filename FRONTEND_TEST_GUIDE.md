# 🧪 프론트엔드 통합 테스트 가이드

## 📋 백엔드 준비 상태

### ✅ 백엔드 API 테스트 결과

| 테스트 | 결과 |
|--------|------|
| 통합 테스트 | ✅ 10/10 (100%) |
| CRUD 테스트 | ✅ 9/9 (100%) |
| PostgreSQL 연결 | ✅ 정상 |
| WOD Status API | ✅ 정상 |

**백엔드는 완벽하게 작동 중입니다!**

---

## 🔐 로그인 테스트

### 1. 프론트엔드 접속

```
URL: http://localhost:3000
```

### 2. 로그인 정보

```
Email: simadeit@naver.com
Password: Daon!161219
```

### 3. 로그인 후 예상 결과

✅ **성공 시**:
- 토큰 발급: `access_token` 받음
- 사용자 정보: `{id: 1, name: "권대성", role: "user"}`
- 네비게이션 바 표시
- 프로그램 목록 페이지로 이동

---

## 📱 네비게이션 메뉴별 테스트

### 1️⃣ **프로그램 목록 (메인)**

**API**: `GET /api/programs`

**예상 결과**:
- 2개의 공개 프로그램 표시
- 프로그램 카드에 제목, 설명, 난이도, 참여자 수 표시

**백엔드 테스트 결과**:
```json
{
  "programs_count": 2,
  "first_program": "엎드린 자세 위주 가볍게 10분 어때?"
}
```
✅ 정상 작동

---

### 2️⃣ **내가 등록한 WOD**

**API**: `GET /api/user/programs`

**예상 결과**:
- 3개의 내 프로그램 표시
- 공개/비공개 상태 표시
- 수정/삭제 버튼 표시

**백엔드 테스트 결과**:
```json
{
  "my_programs_count": 3
}
```
✅ 정상 작동

---

### 3️⃣ **개인 기록**

**API**: `GET /api/users/records`

**예상 결과**:
- 1개의 운동 기록 표시
- 기록 편집/삭제 가능

**백엔드 테스트 결과**:
```json
{
  "records_count": 1
}
```
✅ 정상 작동

---

### 4️⃣ **알림**

**API**: `GET /api/notifications`

**예상 결과**:
- 50개의 알림 표시
- 읽지 않은 알림 1개 강조
- 알림 읽음 처리 가능

**백엔드 테스트 결과**:
```json
{
  "notifications_count": 50,
  "unread": 1
}
```
✅ 정상 작동

---

### 5️⃣ **WOD 현황** (프로그램 생성 페이지)

**API**: `GET /api/user/wod-status`

**예상 결과**:
```json
{
  "total_wods": 3,
  "max_total_wods": 5,
  "public_wods": 1,
  "max_public_wods": 3,
  "can_create_wod": true,
  "can_create_public_wod": true
}
```
✅ 정상 작동

---

## 🐛 문제 발생 시 디버깅

### 증상 1: 로그인 후 빈 화면

**확인사항**:
1. 개발자 도구 콘솔에 에러 확인
2. Network 탭에서 API 호출 실패 확인
3. Application 탭에서 토큰 저장 확인

**해결방법**:
```javascript
// localStorage에 토큰 확인
localStorage.getItem('access_token')

// 세션 확인
document.cookie
```

### 증상 2: 401 Unauthorized

**원인**:
- 토큰이 제대로 전달되지 않음
- 쿠키가 차단됨 (Safari)

**해결방법**:
1. 로그아웃 후 재로그인
2. localStorage 초기화: `localStorage.clear()`
3. 쿠키 삭제 후 재시도

### 증상 3: 404 Not Found

**원인**:
- 백엔드 서버가 다운됨
- API 경로 오류

**확인**:
```bash
# 백엔드 서버 상태 확인
curl http://localhost:5001/api/health

# 서버 재시작
cd backend
export DATABASE_URL="postgresql://crossfit_user:crossfit_password@localhost:5432/crossfit"
source venv/bin/activate
python app.py
```

---

## 🔍 실시간 로그 모니터링

백엔드 로그를 실시간으로 확인하면서 프론트엔드 테스트:

```bash
# 터미널 1: 백엔드 로그 모니터링
tail -f /tmp/flask_final_fixed.log | grep -E "Request:|ERROR"

# 터미널 2: 특정 API만 모니터링
tail -f /tmp/flask_final_fixed.log | grep -E "programs|notifications|records"
```

---

## ✅ 테스트 체크리스트

프론트엔드에서 다음 항목들을 순서대로 확인:

- [ ] 로그인 성공
- [ ] 프로그램 목록 페이지 로드
- [ ] 프로그램 카드 클릭 (상세 보기)
- [ ] "내가 등록한 WOD" 메뉴 클릭
- [ ] "개인 기록" 메뉴 클릭
- [ ] "알림" 아이콘 클릭
- [ ] "WOD 등록" 버튼 클릭
- [ ] 로그아웃

---

## 🎯 현재 상태

### 백엔드
- ✅ 서버 실행 중 (Port 5001)
- ✅ PostgreSQL 연결됨
- ✅ 모든 API 정상 (100% 테스트 통과)

### 프론트엔드  
- ✅ 서버 실행 중 (Port 3000)
- ⏳ 사용자 직접 테스트 필요

---

**다음**: 브라우저에서 실제로 로그인하고 각 메뉴를 클릭하면서 작동 확인

