# WebSocket 아이폰 Safari 동작 문제 진단 보고서

**작성일**: 2025-10-17  
**문제**: 아이폰 Safari 브라우저에서 WebSocket 연결이 정상 동작하지 않음

---

## 1. 현재 상황 분석

### 백엔드 설정 (Railway 배포)
- **Framework**: Flask + Flask-SocketIO 5.3.6
- **WebSocket Library**: python-socketio 5.8.0, python-engineio 4.7.1
- **서버**: Gunicorn 21.2.0
- **URL**: https://wodybody-production.up.railway.app

**app.py의 SocketIO 설정:**
```python
socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins="*",
    cors_credentials=True
)
```

### 프론트엔드 설정 (Vercel 배포)
- **Library**: socket.io-client 4.8.1
- **URL**: Vercel 도메인 (HTTPS)

**NotificationContext.tsx의 연결 설정:**
```typescript
const newSocket = io(apiBaseUrl, {
    transports: isMobileSafari ? ['polling', 'websocket'] : ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: isMobileSafari ? 2000 : 1000,
    reconnectionAttempts: 10,
    withCredentials: true,
    forceNew: true,
    upgrade: !isMobileSafari,
    timeout: isMobileSafari ? 20000 : 10000,
    auth: authToken ? { token: authToken } : undefined,
    query: authToken ? { token: authToken, user_id: userId } : { user_id: userId }
});
```

---

## 2. 아이폰 Safari에서 WebSocket이 실패하는 주요 원인

### 🔴 **문제 1: Gunicorn은 WebSocket을 네이티브로 지원하지 않음**

**증상**: 
- Flask-SocketIO는 ASGI/비동기 서버가 필요
- Gunicorn은 WSGI 서버로 WebSocket을 지원하지 않음
- eventlet 또는 gevent worker를 사용해야 함

**현재 상태**: 
- `requirements.txt`에 eventlet/gevent가 없음
- Gunicorn을 기본 worker로 사용 중

**영향**: 
- WebSocket 연결 시도는 성공하지만 실제 통신이 불가능
- Safari는 연결 실패 시 재시도를 더 까다롭게 처리

### 🔴 **문제 2: CORS 설정 부족**

**증상**:
- `cors_allowed_origins="*"`는 와일드카드이지만 `cors_credentials=True`와 함께 사용할 수 없음
- Safari는 CORS 정책을 더 엄격하게 적용

**현재 상태**:
```python
cors_allowed_origins="*"  # ❌ credentials와 함께 사용 불가
cors_credentials=True
```

**필요한 설정**:
```python
cors_allowed_origins=[
    "https://your-vercel-app.vercel.app",
    "http://localhost:3000"
]
```

### 🔴 **문제 3: HTTP/HTTPS 프로토콜 혼용**

**증상**:
- Railway는 HTTPS를 제공
- WebSocket은 WSS (Secure WebSocket)를 사용해야 함
- 브라우저가 자동으로 처리하지만 Safari는 명시적 설정이 필요할 수 있음

### 🔴 **문제 4: Safari의 쿠키 및 인증 정책**

**증상**:
- Safari는 third-party 쿠키를 기본적으로 차단
- `withCredentials: true`가 작동하지 않을 수 있음
- localStorage 기반 토큰 인증이 필요

---

## 3. 해결 방안

### ✅ **해결 1: eventlet 또는 gevent 추가**

**방법 A: eventlet 사용 (권장)**
```bash
# requirements.txt에 추가
eventlet==0.33.3
```

**방법 B: gevent 사용**
```bash
# requirements.txt에 추가
gevent==23.9.1
gevent-websocket==0.10.1
```

**Gunicorn 실행 명령어 수정:**
```bash
# Procfile 또는 Railway 설정
gunicorn --worker-class eventlet -w 1 --bind 0.0.0.0:$PORT app:app
```

### ✅ **해결 2: CORS 설정 수정**

```python
# app.py
FRONTEND_URLS = os.environ.get('FRONTEND_URLS', 'http://localhost:3000').split(',')

socketio = SocketIO(app, 
    logger=True,
    engineio_logger=True,
    cors_allowed_origins=FRONTEND_URLS,  # 명시적 도메인 지정
    cors_credentials=True,
    async_mode='eventlet',  # 명시적 async_mode 설정
    ping_timeout=60,  # Safari를 위한 긴 타임아웃
    ping_interval=25,  # Keep-alive 주기
    transports=['polling', 'websocket']  # polling 우선
)
```

**Railway 환경 변수 설정:**
```
FRONTEND_URLS=https://your-vercel-app.vercel.app,http://localhost:3000
```

### ✅ **해결 3: 프론트엔드 WebSocket 설정 개선**

```typescript
// NotificationContext.tsx
const newSocket = io(apiBaseUrl, {
    path: '/socket.io/',  // 명시적 경로 지정
    transports: ['polling'],  // Safari는 polling만 사용
    upgrade: false,  // WebSocket으로 업그레이드하지 않음 (Safari 안정성)
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
    withCredentials: false,  // Safari에서는 false 권장
    forceNew: true,
    timeout: 20000,
    // 토큰 기반 인증 (쿠키 대신)
    auth: {
        token: authToken || ''
    },
    query: {
        token: authToken || '',
        user_id: userId
    },
    extraHeaders: {
        'Authorization': `Bearer ${authToken || ''}`
    }
});
```

### ✅ **해결 4: 백엔드 인증 처리 개선**

```python
# routes/websocket.py 또는 app.py
from flask_socketio import disconnect

@socketio.on('connect')
def handle_connect():
    # 쿼리 파라미터에서 토큰 추출
    token = request.args.get('token')
    if not token:
        # auth 객체에서 토큰 추출 시도
        token = request.environ.get('HTTP_AUTHORIZATION', '')
        if token.startswith('Bearer '):
            token = token[7:]
    
    # 토큰 검증
    if token:
        try:
            from utils.token import verify_access_token
            user_id = verify_access_token(token)
            if user_id:
                # 연결 허용
                session['user_id'] = user_id
                emit('auth_success', {'user_id': user_id})
                return
        except Exception as e:
            app.logger.error(f'토큰 검증 실패: {e}')
    
    # 인증 실패 시 연결 거부
    app.logger.warning('WebSocket 연결 거부: 인증 실패')
    disconnect()
```

---

## 4. 즉시 적용 가능한 단계별 해결 방법

### 📌 **Step 1: eventlet 추가 및 배포**

1. `backend/requirements.txt`에 `eventlet==0.33.3` 추가
2. Railway에 배포
3. Railway 로그에서 eventlet이 제대로 로드되는지 확인

### 📌 **Step 2: CORS 설정 수정**

1. `backend/app.py`의 SocketIO 초기화 코드 수정
2. Railway 환경 변수에 `FRONTEND_URLS` 추가
3. 재배포

### 📌 **Step 3: 프론트엔드 설정 변경**

1. `frontend/src/contexts/NotificationContext.tsx` 수정
   - Safari에서는 `transports: ['polling']`만 사용
   - `upgrade: false` 설정
2. Vercel에 재배포

### 📌 **Step 4: 테스트**

1. 아이폰 Safari에서 접속
2. 개발자 콘솔 (Safari > 개발 > 디바이스 선택) 확인
3. `MuiWebSocketDebugger` 컴포넌트로 연결 상태 확인

---

## 5. 디버깅 방법

### 아이폰 Safari 원격 디버깅

1. **Mac에서 Safari 개발자 메뉴 활성화**
   - Safari > 환경설정 > 고급 > "메뉴 막대에서 개발자용 메뉴 보기" 체크

2. **아이폰 설정**
   - 설정 > Safari > 고급 > "웹 인스펙터" 활성화

3. **Mac과 아이폰 연결**
   - USB 케이블로 연결
   - Mac Safari > 개발 > [아이폰 이름] > [웹 페이지] 선택

4. **콘솔 확인**
   - WebSocket 연결 시도/실패 로그 확인
   - Network 탭에서 WebSocket handshake 확인

### Railway 로그 확인

```bash
# Railway CLI 설치 후
railway logs
```

확인할 내용:
- WebSocket 연결 요청이 도착하는지
- CORS 에러가 발생하는지
- eventlet worker가 제대로 실행되는지

### 프론트엔드 디버거 사용

`MuiWebSocketDebugger` 컴포넌트가 이미 구현되어 있으므로:
1. 아이폰에서 앱 접속
2. 우측 하단 디버그 아이콘 클릭
3. 연결 상태 및 로그 확인

---

## 6. 추가 고려사항

### Railway 무료 플랜 제한사항
- Railway 무료 플랜은 WebSocket 연결 수에 제한이 있을 수 있음
- 긴 polling 연결도 제한될 수 있음

### 대안: Socket.IO polling 전용 모드
Safari에서 WebSocket이 계속 실패하면 polling만 사용하는 것을 권장:
```typescript
transports: ['polling'],
upgrade: false
```

이 경우 실시간성이 약간 떨어지지만 안정성은 높아집니다.

---

## 7. 체크리스트

- [ ] `requirements.txt`에 eventlet 추가
- [ ] `app.py`의 SocketIO CORS 설정 수정
- [ ] Railway 환경 변수 `FRONTEND_URLS` 설정
- [ ] Gunicorn worker-class를 eventlet으로 변경
- [ ] 프론트엔드 WebSocket 설정 변경 (polling 전용)
- [ ] Railway에 백엔드 재배포
- [ ] Vercel에 프론트엔드 재배포
- [ ] 아이폰 Safari에서 테스트
- [ ] Mac Safari 원격 디버깅으로 로그 확인

---

## 8. 참고 자료

- [Flask-SocketIO Documentation](https://flask-socketio.readthedocs.io/)
- [Socket.IO Client iOS Issues](https://socket.io/docs/v4/client-options/)
- [Safari WebSocket Limitations](https://developer.apple.com/documentation/safari-release-notes)
- [Railway WebSocket Guide](https://docs.railway.app/guides/websockets)

---

**다음 단계**: 위의 해결 방안을 순차적으로 적용하고, 각 단계마다 테스트를 진행합니다.

