# WebSocket Safari 호환 배포 가이드

**작성일**: 2025-10-17  
**목적**: 아이폰 Safari에서 WebSocket이 정상 동작하도록 수정된 코드를 배포

---

## 변경 사항 요약

### 백엔드 변경사항

1. **requirements.txt**: eventlet 추가
   - `eventlet==0.33.3` 추가
   - Flask-SocketIO가 WebSocket을 제대로 처리하기 위해 필요

2. **app.py**: SocketIO 설정 개선
   - CORS 설정: 와일드카드 대신 명시적 도메인 지정
   - `async_mode='eventlet'` 명시
   - Safari 호환을 위한 긴 타임아웃 설정
   - polling 우선 transport 설정

3. **Procfile**: Gunicorn eventlet worker 설정
   - `gunicorn --worker-class eventlet -w 1` 사용
   - WebSocket 연결을 제대로 처리

4. **railway.toml**: 동일하게 eventlet worker 설정

### 프론트엔드 변경사항

1. **NotificationContext.tsx**: Safari 최적화 설정
   - Safari에서는 polling 전용 모드 사용
   - `withCredentials: false` (third-party cookie 문제 회피)
   - `upgrade: false` (polling 유지)
   - 토큰 기반 인증으로 변경

2. **MuiWebSocketDebugger.tsx**: 동일한 설정 적용

---

## 배포 절차

### 1단계: Railway 환경 변수 설정

Railway 대시보드 또는 CLI로 환경 변수를 설정합니다.

#### Railway 대시보드 사용
1. Railway 프로젝트 대시보드 접속
2. 백엔드 서비스 선택
3. **Variables** 탭 클릭
4. 다음 환경 변수 추가:

```
FRONTEND_URLS=https://your-vercel-app.vercel.app,http://localhost:3000
```

**중요**: `your-vercel-app.vercel.app`을 실제 Vercel 프론트엔드 도메인으로 교체하세요!

#### Railway CLI 사용
```bash
railway variables set FRONTEND_URLS="https://your-vercel-app.vercel.app,http://localhost:3000"
```

### 2단계: 백엔드 배포 (Railway)

#### 방법 A: Git Push로 자동 배포 (권장)
```bash
cd /Users/malife/crossfit-system

# 변경사항 커밋
git add backend/requirements.txt
git add backend/app.py
git add Procfile
git add railway.toml
git commit -m "feat: WebSocket Safari 호환성 개선 - eventlet worker 추가"

# Railway에 배포
git push origin main  # 또는 your-branch-name
```

#### 방법 B: Railway CLI로 배포
```bash
railway up
```

### 3단계: 배포 확인 및 로그 모니터링

```bash
# Railway 로그 실시간 모니터링
railway logs

# 또는 Railway 대시보드에서 Deployments > Logs 확인
```

**확인할 내용**:
- ✅ `eventlet` 패키지가 설치되는지
- ✅ `async_mode='eventlet'` 로그가 나타나는지
- ✅ `SocketIO CORS allowed origins:` 로그에 올바른 도메인이 표시되는지
- ✅ 서버가 정상 시작되는지

**예상 로그**:
```
Collecting eventlet==0.33.3
Successfully installed eventlet-0.33.3
INFO:werkzeug:SocketIO CORS allowed origins: ['https://your-vercel-app.vercel.app', 'http://localhost:3000']
INFO:socketio:Server initialized for eventlet
```

### 4단계: 프론트엔드 배포 (Vercel)

#### 방법 A: Git Push로 자동 배포 (권장)
```bash
# 변경사항 커밋
git add frontend/src/contexts/NotificationContext.tsx
git add frontend/src/components/MuiWebSocketDebugger.tsx
git commit -m "feat: WebSocket Safari 호환성 개선 - polling 전용 모드"

# Vercel에 배포 (frontend 브랜치에 push하면 자동 배포)
git push origin frontend
```

#### 방법 B: Vercel CLI로 배포
```bash
cd frontend
vercel --prod
```

### 5단계: 테스트

#### 데스크톱 브라우저 테스트
1. Chrome/Safari에서 프론트엔드 접속
2. 로그인
3. 브라우저 개발자 도구 > 콘솔 확인
4. "✅ WebSocket 연결 성공!" 메시지 확인
5. "Transport: polling" 또는 "Transport: websocket" 확인

#### 아이폰 Safari 테스트

**준비 사항**:
- Mac과 아이폰이 같은 Apple ID로 로그인
- 아이폰에서 "설정 > Safari > 고급 > 웹 인스펙터" 활성화

**테스트 절차**:
1. 아이폰 Safari에서 앱 접속
2. 로그인
3. **WebSocket 디버거 확인**:
   - 화면 우측 하단의 버그 아이콘 클릭
   - 디버거 펼치기
   - "연결됨" 상태 확인
   - 로그에서 "✅ WebSocket 연결 성공!" 확인

4. **Mac에서 원격 디버깅** (선택사항):
   - Mac Safari > 개발 > [아이폰 이름] > [웹 페이지] 선택
   - 콘솔에서 WebSocket 로그 확인

**예상 로그**:
```javascript
WebSocket 연결 시도 중... 1
모바일 Safari 감지: true | 인증 토큰: 있음
WebSocket 연결 URL: https://wodybody-production.up.railway.app
Socket.IO 연결 설정: { transports: ['polling'], upgrade: false, ... }
✅ WebSocket 연결 성공! abc123
Transport: polling
사용자 방 참여 요청 전송: 1
```

---

## 문제 해결 (Troubleshooting)

### ❌ 문제 1: "Module eventlet not found"

**증상**: Railway 로그에서 eventlet을 찾을 수 없다는 오류

**해결**:
```bash
# requirements.txt에 eventlet이 제대로 추가되었는지 확인
cat backend/requirements.txt | grep eventlet

# 없으면 추가
echo "eventlet==0.33.3" >> backend/requirements.txt

# 재배포
git add backend/requirements.txt
git commit -m "fix: eventlet 추가"
git push
```

### ❌ 문제 2: CORS 에러

**증상**: 브라우저 콘솔에서 "CORS policy blocked" 에러

**해결**:
1. Railway 환경 변수 확인:
   ```bash
   railway variables
   ```
2. `FRONTEND_URLS`이 올바른 도메인을 포함하는지 확인
3. 쉼표로 여러 도메인 구분 (공백 없이)
4. HTTPS 프로토콜 사용 확인

### ❌ 문제 3: 아이폰에서 여전히 연결 실패

**증상**: WebSocket 디버거에서 "연결 오류" 표시

**해결 방법 A: 토큰 확인**
```javascript
// 브라우저 콘솔에서 실행
console.log(localStorage.getItem('access_token'));
```
- 토큰이 없으면 재로그인

**해결 방법 B: 강제 polling 모드**
```typescript
// NotificationContext.tsx에서 모든 브라우저에 polling 적용
transports: ['polling'],  // 모든 경우에 polling만 사용
upgrade: false,
```

**해결 방법 C: Railway 로그 확인**
```bash
railway logs --tail
```
- WebSocket 연결 요청이 도착하는지 확인
- 인증 실패 로그가 있는지 확인

### ❌ 문제 4: Gunicorn이 eventlet을 로드하지 못함

**증상**: "Worker class 'eventlet' not found"

**해결**:
```bash
# Procfile 확인
cat Procfile

# 올바른 형식:
# web: cd backend && gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```

---

## 성능 최적화 팁

### Polling 주기 조정

기본적으로 Socket.IO는 25초마다 ping을 보냅니다. 배터리 절약을 위해 조정할 수 있습니다:

```python
# app.py
socketio = SocketIO(app,
    # ...
    ping_interval=30,  # 30초로 증가
    ping_timeout=90,   # 타임아웃도 증가
)
```

### WebSocket 업그레이드 허용 (선택사항)

Safari에서 안정적으로 동작하는 것이 확인되면 WebSocket 업그레이드를 다시 허용할 수 있습니다:

```typescript
// NotificationContext.tsx
transports: ['polling', 'websocket'],  // websocket도 허용
upgrade: true,  // 업그레이드 허용
```

---

## 롤백 절차

문제가 발생하면 이전 버전으로 롤백:

### Railway 롤백
1. Railway 대시보드 > Deployments
2. 이전에 성공한 배포 선택
3. "Redeploy" 클릭

### Git 롤백
```bash
git revert HEAD
git push
```

---

## 참고 자료

- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Socket.IO Client API](https://socket.io/docs/v4/client-api/)
- [Eventlet Documentation](https://eventlet.net/)
- [Railway Deployment Guide](https://docs.railway.app/)
- [Safari WebSocket Known Issues](https://developer.apple.com/documentation/safari-release-notes)

---

## 체크리스트

배포 전:
- [ ] `requirements.txt`에 eventlet 추가 확인
- [ ] `app.py` SocketIO 설정 수정 확인
- [ ] `Procfile` eventlet worker 설정 확인
- [ ] `railway.toml` startCommand 수정 확인
- [ ] 프론트엔드 WebSocket 설정 수정 확인

배포 중:
- [ ] Railway 환경 변수 `FRONTEND_URLS` 설정
- [ ] 백엔드 배포 완료
- [ ] Railway 로그에서 eventlet 로드 확인
- [ ] 프론트엔드 배포 완료

배포 후:
- [ ] 데스크톱 브라우저에서 WebSocket 연결 테스트
- [ ] 아이폰 Safari에서 WebSocket 연결 테스트
- [ ] WebSocket 디버거로 연결 상태 확인
- [ ] 실시간 알림 수신 테스트
- [ ] 프로그램 참여/나가기 알림 테스트

---

**배포 완료 후 이 가이드를 참고하여 모든 항목이 정상 작동하는지 확인하세요!**

