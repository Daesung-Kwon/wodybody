# WebSocket Safari 호환성 수정 완료 요약

**작성일**: 2025-10-17  
**문제**: 아이폰 Safari에서 WebSocket 연결 실패  
**해결**: eventlet worker + polling 전용 모드

---

## 🔧 수정된 파일 목록

### 백엔드 (6개 파일)
1. ✅ `backend/requirements.txt` - eventlet 추가
2. ✅ `backend/app.py` - SocketIO 설정 개선
3. ✅ `Procfile` - eventlet worker 설정
4. ✅ `railway.toml` - eventlet worker 설정

### 프론트엔드 (2개 파일)
5. ✅ `frontend/src/contexts/NotificationContext.tsx` - Safari 최적화
6. ✅ `frontend/src/components/MuiWebSocketDebugger.tsx` - Safari 최적화

### 문서 (3개 파일)
7. ✅ `WEBSOCKET_SAFARI_DIAGNOSIS.md` - 문제 진단 보고서
8. ✅ `WEBSOCKET_DEPLOY_GUIDE.md` - 배포 가이드
9. ✅ `WEBSOCKET_CHANGES_SUMMARY.md` - 이 파일

---

## 📝 주요 변경 내용

### 1. Backend - eventlet 추가
**파일**: `backend/requirements.txt`

```diff
+ eventlet==0.33.3
```

**이유**: Flask-SocketIO가 WebSocket을 제대로 처리하려면 비동기 서버(eventlet/gevent)가 필요. Gunicorn 기본 worker는 WebSocket을 지원하지 않음.

---

### 2. Backend - SocketIO 설정 개선
**파일**: `backend/app.py`

```python
# 변경 전
socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins="*",  # ❌ credentials와 함께 사용 불가
    cors_credentials=True
)

# 변경 후
FRONTEND_URLS = os.environ.get('FRONTEND_URLS', 'http://localhost:3000').split(',')
socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins=FRONTEND_URLS,  # ✅ 명시적 도메인
    cors_credentials=True,
    async_mode='eventlet',  # ✅ eventlet 명시
    ping_timeout=60,  # ✅ Safari 긴 타임아웃
    ping_interval=25,
    transports=['polling', 'websocket'],  # ✅ polling 우선
    allow_upgrades=True,
    cookie='io',
)
```

**주요 개선**:
- ✅ CORS 와일드카드 제거 (Safari 호환)
- ✅ eventlet async_mode 명시
- ✅ Safari를 위한 긴 타임아웃 설정
- ✅ polling 우선 transport

---

### 3. Backend - Gunicorn eventlet worker
**파일**: `Procfile`, `railway.toml`

```bash
# 변경 전
web: cd backend && python app.py

# 변경 후
web: cd backend && gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT --timeout 120 --keep-alive 5 app:app
```

**주요 개선**:
- ✅ `--worker-class eventlet` - WebSocket 지원
- ✅ `-w 1` - 단일 worker (eventlet은 비동기로 여러 연결 처리)
- ✅ `--timeout 120` - 긴 타임아웃
- ✅ `--keep-alive 5` - 연결 유지

---

### 4. Frontend - Safari 최적화 설정
**파일**: `frontend/src/contexts/NotificationContext.tsx`

```typescript
// 변경 전
const newSocket = io(apiBaseUrl, {
    transports: isMobileSafari ? ['polling', 'websocket'] : ['websocket', 'polling'],
    withCredentials: true,  // ❌ Safari third-party cookie 문제
    upgrade: !isMobileSafari,
    // ...
});

// 변경 후
const socketConfig: any = {
    path: '/socket.io/',
    transports: isMobileSafari ? ['polling'] : ['polling', 'websocket'],  // ✅ Safari는 polling만
    withCredentials: false,  // ✅ third-party cookie 회피
    upgrade: false,  // ✅ polling 유지 (안정성)
    timeout: 20000,
    closeOnBeforeunload: false,
    // 토큰 기반 인증
    auth: authToken ? { token: authToken } : undefined,
    query: { token: authToken || '', user_id: userId.toString() },
    extraHeaders: {
        'Authorization': `Bearer ${authToken || ''}`
    }
};
```

**주요 개선**:
- ✅ Safari는 polling 전용 (WebSocket 업그레이드 없음)
- ✅ `withCredentials: false` (Safari third-party cookie 문제 회피)
- ✅ 토큰 기반 인증 (쿠키 대신)
- ✅ `extraHeaders`로 Authorization 헤더 전달

---

## 🚀 배포 체크리스트

### 1️⃣ Railway 환경 변수 설정 (필수!)

Railway 대시보드에서 설정:
```
변수명: FRONTEND_URLS
값: https://your-vercel-app.vercel.app,http://localhost:3000
```

**중요**: `your-vercel-app.vercel.app`을 실제 Vercel 도메인으로 교체!

#### Vercel 도메인 확인 방법:
1. Vercel 대시보드 > 프로젝트 선택
2. "Domains" 탭에서 프로덕션 도메인 확인
3. 예: `crossfit-frontend-abc123.vercel.app`

#### Railway CLI로 설정:
```bash
railway variables set FRONTEND_URLS="https://your-vercel-app.vercel.app,http://localhost:3000"
```

---

### 2️⃣ 백엔드 배포 (Railway)

```bash
# 커밋
git add backend/requirements.txt backend/app.py Procfile railway.toml
git commit -m "feat: WebSocket Safari 호환 - eventlet worker"

# 배포 (main 브랜치에 push하면 자동)
git push origin main
```

---

### 3️⃣ 프론트엔드 배포 (Vercel)

```bash
# 커밋
git add frontend/src/contexts/NotificationContext.tsx
git add frontend/src/components/MuiWebSocketDebugger.tsx
git commit -m "feat: WebSocket Safari 호환 - polling 전용"

# 배포 (frontend 브랜치에 push하면 자동)
git push origin frontend
```

---

### 4️⃣ 배포 확인

#### Railway 로그 확인
```bash
railway logs
```

**확인할 로그**:
```
✅ Collecting eventlet==0.33.3
✅ Successfully installed eventlet-0.33.3
✅ SocketIO CORS allowed origins: ['https://...', 'http://localhost:3000']
✅ Server initialized for eventlet
✅ Listening at: http://0.0.0.0:PORT (eventlet)
```

#### Vercel 배포 확인
- Vercel 대시보드에서 "Deployments" 탭 확인
- 최근 배포가 "Ready" 상태인지 확인

---

### 5️⃣ 아이폰 Safari 테스트

1. **아이폰에서 접속**
   - Safari로 Vercel 프론트엔드 접속
   - 로그인

2. **WebSocket 디버거 확인**
   - 우측 하단 버그 아이콘 (🐛) 클릭
   - "연결됨" 상태 확인
   - 로그에서 다음 확인:
     ```
     ✅ WebSocket 연결 성공!
     Transport: polling
     사용자 방 참여 요청 전송: 1
     ```

3. **실시간 알림 테스트**
   - 다른 사용자가 프로그램에 참여
   - 알림이 실시간으로 수신되는지 확인

---

## 🐛 문제 해결

### ❌ "Module eventlet not found"
```bash
# requirements.txt 확인
cat backend/requirements.txt | grep eventlet

# 없으면 추가 후 재배포
echo "eventlet==0.33.3" >> backend/requirements.txt
git add backend/requirements.txt
git commit -m "fix: eventlet 추가"
git push
```

### ❌ CORS 에러
1. Railway 환경 변수 `FRONTEND_URLS` 확인
2. 올바른 Vercel 도메인이 포함되어 있는지 확인
3. 쉼표로 구분 (공백 없이)

### ❌ 아이폰에서 연결 실패
1. **토큰 확인**: 아이폰 Safari 콘솔에서
   ```javascript
   console.log(localStorage.getItem('access_token'));
   ```
   - 토큰이 없으면 재로그인

2. **Railway 로그 확인**:
   ```bash
   railway logs --tail
   ```
   - WebSocket 연결 요청이 도착하는지 확인

3. **강제 재배포**:
   ```bash
   # 빈 커밋으로 강제 재배포
   git commit --allow-empty -m "chore: force redeploy"
   git push
   ```

---

## 📊 예상 결과

### 배포 전 (문제 상태)
- ❌ 아이폰 Safari: WebSocket 연결 실패
- ❌ WebSocket 디버거: "연결 오류"
- ❌ 실시간 알림: 동작 안 함

### 배포 후 (해결 상태)
- ✅ 아이폰 Safari: WebSocket 연결 성공 (polling 모드)
- ✅ WebSocket 디버거: "연결됨" (Transport: polling)
- ✅ 실시간 알림: 정상 동작
- ✅ 프로그램 참여/나가기 알림: 즉시 수신

---

## 📚 관련 문서

- 📄 `WEBSOCKET_SAFARI_DIAGNOSIS.md` - 문제 진단 상세 분석
- 📄 `WEBSOCKET_DEPLOY_GUIDE.md` - 배포 가이드 (문제 해결 포함)
- 📄 이 파일 - 변경사항 요약

---

## ⏱️ 소요 시간 (예상)

- 환경 변수 설정: 2분
- 백엔드 배포: 5-10분 (Railway 빌드 시간)
- 프론트엔드 배포: 3-5분 (Vercel 빌드 시간)
- 테스트: 5분
- **총합: 약 15-20분**

---

## ✅ 완료 확인

모든 항목이 체크되면 배포 완료:

- [ ] Railway 환경 변수 `FRONTEND_URLS` 설정
- [ ] 백엔드 배포 완료
- [ ] Railway 로그에서 eventlet 로드 확인
- [ ] 프론트엔드 배포 완료
- [ ] 데스크톱 브라우저 WebSocket 연결 확인
- [ ] 아이폰 Safari WebSocket 연결 확인 ⭐
- [ ] 실시간 알림 수신 확인

---

**🎉 배포 완료 후, 아이폰 Safari에서 WebSocket이 정상 동작하는지 확인하세요!**

문제가 계속되면 `WEBSOCKET_DEPLOY_GUIDE.md`의 문제 해결 섹션을 참고하세요.

