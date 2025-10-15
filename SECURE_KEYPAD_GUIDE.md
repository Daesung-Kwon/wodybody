# 🔒 보안 키패드 시스템 가이드

## 개요

웹 애플리케이션을 위한 금융권 수준의 보안 키패드 시스템입니다. 키로거 공격, 화면 녹화, 어깨너머 공격 등 다양한 보안 위협으로부터 사용자의 민감한 정보를 보호합니다.

## 주요 기능

### 1. 🔀 무작위 숫자 배치
- **Fisher-Yates 알고리즘** 사용
- 키패드를 열 때마다 숫자 위치가 무작위로 변경
- 패턴 기반 공격 차단

### 2. 🛡️ 키로거 방지
- 키보드 입력 대신 마우스/터치 클릭 사용
- 하드웨어/소프트웨어 키로거로부터 안전
- 실제 입력값이 키보드 이벤트로 노출되지 않음

### 3. 🔐 입력 마스킹
- 입력된 값은 `●` 문자로 표시
- 화면 녹화/스크린샷으로부터 보호
- 어깨너머 공격(Shoulder Surfing) 방지

### 4. 🚀 최적화된 사용자 경험
- 부드러운 애니메이션 효과
- 다크모드 완벽 지원
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 직관적인 UI/UX

## 파일 구조

```
frontend/src/components/
├── SecureKeypad.tsx                      # 보안 키패드 메인 컴포넌트
├── SecureKeypadDemo.tsx                   # 데모 페이지
└── MuiLoginPageWithSecureKeypad.tsx      # 로그인 페이지 통합 예제
```

## 사용 방법

### 기본 사용법

```tsx
import React, { useState } from 'react';
import SecureKeypad from './components/SecureKeypad';

function MyComponent() {
    const [pin, setPin] = useState('');

    return (
        <SecureKeypad
            label="PIN 번호"
            value={pin}
            onChange={setPin}
            maxLength={6}
        />
    );
}
```

### Props 상세 설명

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `string` | `'보안 입력'` | 입력 필드 레이블 |
| `value` | `string` | (필수) | 입력된 값 |
| `onChange` | `(value: string) => void` | (필수) | 값 변경 핸들러 |
| `maxLength` | `number` | `20` | 최대 입력 길이 |
| `disabled` | `boolean` | `false` | 비활성화 여부 |
| `onEnter` | `() => void` | `undefined` | 확인 버튼 클릭 시 실행 |
| `autoFocus` | `boolean` | `false` | 자동으로 키패드 열기 |

### 로그인 페이지 통합 예제

```tsx
import React, { useState } from 'react';
import SecureKeypad from './components/SecureKeypad';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [useSecureKeypad, setUseSecureKeypad] = useState(true);

    const handleLogin = async () => {
        // 로그인 로직
        console.log('Email:', email);
        console.log('Password:', password); // 실제로는 암호화하여 전송
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
            />

            {useSecureKeypad ? (
                <SecureKeypad
                    label="비밀번호 (보안 입력)"
                    value={password}
                    onChange={setPassword}
                    maxLength={50}
                    onEnter={handleLogin}
                />
            ) : (
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호"
                />
            )}

            <button type="submit">로그인</button>
        </form>
    );
}
```

## 보안 기능 상세

### 1. Fisher-Yates 셔플 알고리즘

```typescript
const shuffleNumbers = () => {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const shuffled = [...numbers];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
};
```

**장점:**
- O(n) 시간 복잡도로 효율적
- 균등한 확률 분포 보장
- 예측 불가능한 배치

### 2. 입력 마스킹 처리

```typescript
const getMaskedValue = (value: string) => {
    return '●'.repeat(value.length);
};
```

**보호 대상:**
- 화면 녹화 소프트웨어
- 스크린샷 캡처
- 어깨너머 관찰
- 보안 카메라

### 3. 키로거 방지 메커니즘

**전통적 입력 방식의 취약점:**
```typescript
// ❌ 키로거에 노출되는 방식
<input type="password" onChange={handleChange} />
// 키보드 이벤트로 입력값 노출
```

**보안 키패드 방식:**
```typescript
// ✅ 키로거로부터 안전한 방식
<Button onClick={() => handleNumberClick(num)}>
    {num}
</Button>
// 마우스 클릭 이벤트만 사용, 키보드 이벤트 없음
```

## 추천 사용 사례

### 금융 서비스 🏦
- 계좌 비밀번호 입력
- 이체 인증 코드
- 카드 PIN 번호
- OTP 입력

### 의료 시스템 🏥
- 환자 정보 접근
- 전자 처방전 승인
- 의료진 인증
- 민감 의료 데이터 접근

### 기업 보안 🏢
- 관리자 로그인
- 민감 데이터 접근
- 시스템 설정 변경
- 권한 승인

### 공공 서비스 🏛️
- 무인 민원 발급기
- 공공 키오스크
- 전자투표 시스템
- 정부 서비스 포털

### 전자상거래 🛒
- 결제 비밀번호
- 본인 인증
- 회원 정보 수정
- 환불/취소 승인

## 데모 실행 방법

### 1. 데모 페이지 접근

`App.tsx`에 데모 라우트 추가:

```tsx
import SecureKeypadDemo from './components/SecureKeypadDemo';

function App() {
    return (
        <div>
            {/* 기존 라우트들... */}
            <SecureKeypadDemo />
        </div>
    );
}
```

### 2. 로그인 페이지에 적용

기존 `MuiLoginPage.tsx` 대신 `MuiLoginPageWithSecureKeypad.tsx` 사용:

```tsx
import MuiLoginPageWithSecureKeypad from './components/MuiLoginPageWithSecureKeypad';

// App.tsx에서
<MuiLoginPageWithSecureKeypad
    setUser={setUser}
    goRegister={goRegister}
    goPrograms={goPrograms}
/>
```

## 기술 스택

- **React 18+**: 현대적인 UI 프레임워크
- **TypeScript**: 타입 안정성
- **Material-UI (MUI)**: UI 컴포넌트 라이브러리
- **Fisher-Yates Algorithm**: 무작위 셔플
- **React Hooks**: 상태 관리

## 성능 최적화

### 1. 메모이제이션

```typescript
const shuffleNumbers = useCallback(() => {
    // 셔플 로직
}, []);
```

### 2. 조건부 렌더링

```typescript
{isOpen && (
    <KeypadComponent />
)}
```

### 3. 애니메이션 최적화

```css
@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}
```

## 접근성 (Accessibility)

- ✅ 키보드 네비게이션 지원
- ✅ ARIA 레이블 적용
- ✅ 스크린 리더 호환
- ✅ 고대비 모드 지원
- ✅ 포커스 인디케이터 제공

## 브라우저 호환성

| 브라우저 | 버전 | 지원 여부 |
|---------|------|-----------|
| Chrome | 90+ | ✅ 완벽 지원 |
| Firefox | 88+ | ✅ 완벽 지원 |
| Safari | 14+ | ✅ 완벽 지원 |
| Edge | 90+ | ✅ 완벽 지원 |
| Opera | 76+ | ✅ 완벽 지원 |
| Mobile Safari | iOS 14+ | ✅ 완벽 지원 |
| Chrome Mobile | 90+ | ✅ 완벽 지원 |

## 보안 권장사항

### 1. HTTPS 사용 필수
```
❌ http://example.com
✅ https://example.com
```

### 2. 서버측 암호화
```typescript
// 클라이언트에서 전송 전 해싱 (선택사항)
import bcrypt from 'bcryptjs';

const hashedPassword = await bcrypt.hash(password, 10);
// 해싱된 값을 서버로 전송
```

### 3. CSRF 토큰 사용
```typescript
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
// API 요청 시 포함
```

### 4. Rate Limiting
```typescript
// 서버측에서 구현
// 연속 실패 시도 제한
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 30 * 60 * 1000; // 30분
```

## 커스터마이징

### 테마 변경

```tsx
<SecureKeypad
    value={pin}
    onChange={setPin}
    // 커스텀 스타일 적용
    sx={{
        '& .MuiButton-root': {
            backgroundColor: 'your-color',
        }
    }}
/>
```

### 숫자 외 문자 추가

현재는 0-9 숫자만 지원하지만, 확장 가능:

```typescript
// SecureKeypad.tsx 수정
const characters = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 
                    'A', 'B', 'C', 'D', 'E', 'F']; // 16진수 예시
```

### 레이아웃 변경

```typescript
// 3x4 그리드 대신 4x3 그리드
<Grid container spacing={1.5}>
    {shuffledNumbers.map((num) => (
        <Grid item xs={3} key={num}> {/* xs={4}에서 xs={3}으로 변경 */}
            <Button>{num}</Button>
        </Grid>
    ))}
</Grid>
```

## 문제 해결

### Q: 키패드가 열리지 않아요
**A:** `isOpen` 상태를 확인하고, 클릭 이벤트가 제대로 전달되는지 확인하세요.

### Q: 숫자가 섞이지 않아요
**A:** `shuffleNumbers` 함수가 `isOpen` 변경 시 호출되는지 확인하세요.

### Q: 모바일에서 터치가 안돼요
**A:** Material-UI Button 컴포넌트는 터치 이벤트를 자동으로 처리합니다. `touch-action: none` CSS가 적용되지 않았는지 확인하세요.

### Q: 다크모드에서 안보여요
**A:** `useTheme` 훅에서 `isDarkMode` 값이 제대로 전달되는지 확인하세요.

## 라이선스

MIT License - 자유롭게 사용하실 수 있습니다.

## 기여

이슈나 개선 제안은 GitHub Issues를 통해 제출해주세요.

## 연락처

개발 관련 문의: [프로젝트 이슈 페이지]

---

**보안은 선택이 아닌 필수입니다. 🔒**

사용자의 민감한 정보를 보호하고, 더 안전한 웹 환경을 만들어갑시다.

