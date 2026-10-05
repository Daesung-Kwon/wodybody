# 🔍 프론트엔드 인증 문제 디버깅 가이드

**현재 상황**: 
- ✅ 백엔드 API 100% 정상 작동
- ✅ 인증 토큰 발급 및 검증 정상
- ⚠️ 프론트엔드에서 간헐적 401 오류 발생

---

## 📊 현재 상태 분석

### 백엔드 로그 분석

```
[2025-10-11 23:58:05] Authorization 토큰에서 사용자 ID 확인: 1
[2025-10-11 23:58:05] GET /api/user/programs → 200 OK
```

**결론**: 백엔드는 완벽하게 작동 중

### 문제 패턴

```
초기 로드:
  ❌ GET /api/user/programs → 401 (토큰 없음)
  
재시도 또는 새로고침:
  ✅ GET /api/user/programs → 200 OK (토큰 있음)
```

**결론**: 타이밍 이슈

---

## 🔍 원인 분석

### Issue #1: 토큰 저장 타이밍

**시나리오**:
```
1. 사용자 로그인 클릭
2. API 호출: POST /api/login
3. 응답 받음: { access_token: "..." }
4. localStorage에 토큰 저장 (비동기)
5. AuthContext의 setUser 호출
6. App.tsx에서 user가 변경되면서 페이지 전환
7. 페이지 컴포넌트 마운트
8. useEffect에서 API 호출 (GET /api/user/programs)
9. 🚨 이 시점에 아직 토큰이 localStorage에 저장 안되었을 수 있음!
```

**확인 필요**:
```typescript
// MuiLoginPage.tsx
const data = await userApi.login({ email, password });
// ↑ 여기서 access_token이 localStorage에 저장됨

const user: User = { ... };
setAuthUser(user);  // ← 이게 즉시 실행되면
                    //   localStorage 저장보다 빠를 수 있음
```

### Issue #2: 중복 API 호출

로그를 보면 모든 요청이 **2번씩** 호출됩니다:
```
Request: GET /api/user/programs  (2번)
Request: GET /api/user/programs  (2번)
```

**원인**: React Strict Mode 또는 useEffect 중복 호출

---

## 🛠️ 해결 방법

### 방법 1: 로그인 후 토큰 확인 대기 (권장)

```typescript
// frontend/src/components/MuiLoginPage.tsx

const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    clearMessages();

    try {
        const data = await userApi.login({ email, password });
        
        // 토큰이 localStorage에 저장될 때까지 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // 토큰 저장 확인
        const token = localStorage.getItem('access_token');
        console.log('Token saved:', token ? 'Yes' : 'No');
        
        const user: User = {
            id: data.user_id,
            email,
            name: data.name || ''
        };

        setAuthUser(user);
        setUser(user);
        setSuccess(`${data.name || email}님, 환영합니다!`);

        setTimeout(() => {
            goPrograms();
        }, 1500);
    } catch (error) {
        // ...
    }
};
```

### 방법 2: AuthContext에서 토큰 검증

```typescript
// frontend/src/contexts/AuthContext.tsx

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onRedirectToLogin }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isReady, setIsReady] = useState(false);  // 추가

    useEffect(() => {
        const checkAuth = async (): Promise<void> => {
            try {
                // 토큰 확인 먼저
                const token = localStorage.getItem('access_token');
                if (!token) {
                    setUser(null);
                    setIsReady(true);
                    return;
                }
                
                const userData = await userApi.getProfile();
                setUser(userData);
            } catch (error) {
                console.log('인증되지 않은 사용자');
                setUser(null);
            } finally {
                setIsReady(true);  // 인증 확인 완료
            }
        };
        checkAuth();
    }, []);

    // 인증 확인 완료될 때까지 로딩 표시
    if (!isReady) {
        return <div>Loading...</div>;
    }

    return (
        <AuthContext.Provider value={{ user, setUser, logout, redirectToLogin }}>
            {children}
        </AuthContext.Provider>
    );
};
```

### 방법 3: API 호출 시 토큰 재확인

```typescript
// frontend/src/utils/api.ts

async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };

    // Authorization 헤더 (토큰 우선) - 매번 새로 가져오기
    const accessToken = getAccessToken();  // 항상 최신 토큰 가져옴
    console.log('API Request:', endpoint, 'Token:', accessToken ? 'Yes' : 'No');  // 디버깅
    
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }
    
    // ...
}
```

---

## 🧪 디버깅 단계

### Step 1: 브라우저 개발자 도구

```javascript
// Console에서 실행

// 1. 토큰 확인
localStorage.getItem('access_token')
// → null이면 문제! 토큰이 저장 안됨

// 2. 로그인 API 직접 호출
await fetch('http://localhost:5001/api/login', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    email: 'simadeit@naver.com', 
    password: '<rotated-password>'
  })
}).then(r => r.json()).then(d => {
  console.log('Login response:', d);
  localStorage.setItem('access_token', d.access_token);
})

// 3. 토큰으로 API 호출
const token = localStorage.getItem('access_token');
await fetch('http://localhost:5001/api/user/programs', {
  headers: {'Authorization': `Bearer ${token}`}
}).then(r => r.json()).then(d => console.log('Programs:', d))
```

### Step 2: Network 탭 확인

**로그인 요청 확인**:
```
POST /api/login
Response: {
  access_token: "eyJ..."  ← 이게 있어야 함
}
```

**이후 API 요청 확인**:
```
GET /api/user/programs
Request Headers:
  Authorization: Bearer eyJ...  ← 이게 있어야 함
```

만약 Authorization 헤더가 없다면 → 토큰 저장 실패

---

## 🔧 즉시 적용 가능한 수정

### 수정 1: 로그인 시 명시적 토큰 확인

`frontend/src/components/MuiLoginPage.tsx`:

```typescript
try {
    const data = await userApi.login({ email, password });
    
    // 🔍 디버깅 로그 추가
    console.log('Login response:', data);
    console.log('Token stored:', localStorage.getItem('access_token'));
    
    const user: User = {
        id: data.user_id,
        email,
        name: data.name || ''
    };

    setAuthUser(user);
    setUser(user);
    setSuccess(`${data.name || email}님, 환영합니다!`);

    // 토큰 저장 확인 후 페이지 전환
    const tokenCheck = setInterval(() => {
        if (localStorage.getItem('access_token')) {
            clearInterval(tokenCheck);
            setTimeout(() => goPrograms(), 1500);
        }
    }, 50);
    
} catch (error) {
    // ...
}
```

### 수정 2: userApi.login에서 확실한 저장

`frontend/src/utils/api.ts`:

```typescript
login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiRequest<LoginResponse & { access_token?: string }>('/api/login', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    // access_token 저장
    if (response.access_token) {
        console.log('[auth] Storing access_token to localStorage');
        setAccessToken(response.access_token);
        
        // 저장 확인
        const stored = localStorage.getItem(TOKEN_KEY);
        console.log('[auth] Token stored:', stored ? 'Success' : 'Failed');
        
        if (!stored) {
            console.error('[auth] Failed to store token!');
        }
    } else {
        console.log('[auth] No access_token in response');
    }

    return response;
},
```

---

## ✅ 빠른 테스트 방법

### 브라우저에서 즉시 확인

1. **F12** (개발자 도구 열기)

2. **Console 탭**:
```javascript
// 로그인 전
localStorage.getItem('access_token')  // → null

// 로그인 (UI에서)
// ...

// 로그인 후
localStorage.getItem('access_token')  // → "eyJ..." 있어야 함
```

3. **Network 탭**:
   - `/api/login` 요청 찾기
   - Response 탭에서 `access_token` 확인
   - 이후 `/api/user/programs` 요청 찾기
   - Headers 탭에서 `Authorization: Bearer ...` 확인

---

## 🎯 현재 추정

### 가능성 1: 타이밍 이슈 (70%)
- 로그인 직후 토큰 저장 전에 페이지 전환
- 컴포넌트 마운트 시 토큰 없음 → 401
- 약간 후 토큰 저장 완료 → 재호출 시 200

### 가능성 2: React Strict Mode (20%)
- 개발 모드에서 useEffect 2번 실행
- 첫 번째 실행 시 토큰 없음 → 401
- 두 번째 실행 시 토큰 있음 → 200

### 가능성 3: 상태 업데이트 지연 (10%)
- AuthContext user 상태 업데이트 지연
- 컴포넌트가 user를 기반으로 API 호출하는데
- user가 null에서 User로 변경되는 과정에서 지연

---

## 🚀 권장 조치

### 즉시 적용 (디버깅)

프론트엔드 코드에 로그 추가:

```typescript
// frontend/src/components/MuiMyProgramsPage.tsx
const load = async (): Promise<void> => {
    console.log('🔍 [MyPrograms] Loading...', {
        hasToken: !!localStorage.getItem('access_token'),
        tokenPreview: localStorage.getItem('access_token')?.substring(0, 20)
    });
    
    setBusy(true);
    try {
        const data = await programApi.getMyPrograms();
        console.log('✅ [MyPrograms] Loaded:', data.programs?.length, 'programs');
        setMine(data.programs || []);
    } catch (error) {
        console.error('❌ [MyPrograms] Failed:', error);
    } finally {
        setBusy(false);
    }
};
```

---

## 📝 최종 확인 사항

현재 브라우저에서:

1. **로그아웃**
2. **F12 개발자 도구 열기**
3. **Console 탭 선택**
4. **로그인 시도**
5. **Console에서 다음 확인**:
   ```
   [auth] Storing access_token to localStorage
   [auth] Token stored: Success (또는 Failed)
   ```

토큰이 "Success"로 저장되면 → 타이밍 이슈  
토큰이 "Failed"로 나오면 → localStorage 접근 문제

---

**지금 브라우저에서 위 단계를 실행하고 결과를 알려주세요!**

