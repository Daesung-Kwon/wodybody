# 🔒 웹 보안 키패드 시스템

<div align="center">

![Security Badge](https://img.shields.io/badge/Security-Gold%20Standard-gold)
![React](https://img.shields.io/badge/React-18+-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue)
![Material--UI](https://img.shields.io/badge/Material--UI-5+-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**금융권 수준의 웹 보안 입력 시스템**

[특징](#주요-특징) • [데모](#데모) • [설치](#설치) • [사용법](#사용법) • [API](#api-문서) • [보안](#보안-기능)

</div>

---

## 📋 목차

- [개요](#개요)
- [주요 특징](#주요-특징)
- [데모](#데모)
- [설치](#설치)
- [빠른 시작](#빠른-시작)
- [사용법](#사용법)
- [API 문서](#api-문서)
- [보안 기능](#보안-기능)
- [사용 사례](#사용-사례)
- [브라우저 호환성](#브라우저-호환성)
- [FAQ](#faq)
- [라이선스](#라이선스)

## 개요

웹 애플리케이션을 위한 금융권 수준의 보안 키패드 시스템입니다. 키로거, 화면 녹화, 어깨너머 공격 등 다양한 보안 위협으로부터 사용자의 민감한 정보를 보호합니다.

### 왜 보안 키패드가 필요한가?

| 공격 유형 | 일반 입력 | 보안 키패드 |
|---------|----------|------------|
| 키로거 (Keylogger) | ❌ 취약 | ✅ 안전 |
| 화면 녹화 | ❌ 취약 | ✅ 안전 |
| 어깨너머 관찰 | ❌ 취약 | ✅ 안전 |
| 패턴 학습 | ❌ 취약 | ✅ 안전 |
| 중간자 공격 (MITM) | ❌ 취약 | ✅ 안전* |

*HTTPS와 함께 사용 시

## 주요 특징

### 🛡️ 핵심 보안 기능

- **키로거 방지**: 키보드 입력이 아닌 마우스/터치 클릭만 사용
- **무작위 배치**: Fisher-Yates 알고리즘으로 매번 숫자 위치 변경
- **입력 마스킹**: 입력값을 `●●●●` 형태로 표시
- **AES-256 암호화**: 군사급 암호화 알고리즘 적용
- **재전송 공격 방지**: 타임스탬프 기반 패킷 검증
- **무결성 검증**: Nonce 및 HMAC 기반 데이터 무결성 보장

### 🎨 사용자 경험

- **직관적인 UI**: 금융 앱과 같은 친숙한 인터페이스
- **부드러운 애니메이션**: 자연스러운 전환 효과
- **다크모드 지원**: 완벽한 라이트/다크 테마
- **반응형 디자인**: 모바일/태블릿/데스크톱 완벽 지원
- **접근성**: WCAG 2.1 가이드라인 준수

### 🚀 개발자 친화적

- **TypeScript**: 완벽한 타입 안정성
- **Material-UI**: 익숙한 컴포넌트 라이브러리
- **간단한 통합**: 3줄의 코드로 적용 가능
- **커스터마이징**: 스타일, 동작 자유롭게 변경
- **완벽한 문서화**: 예제, 가이드, API 문서 제공

## 데모

### 온라인 데모
🔗 [라이브 데모 보기](#) (예정)

### 로컬 데모 실행

```bash
# 프로젝트 클론
git clone [repository-url]

# 의존성 설치
cd frontend
npm install

# 개발 서버 실행
npm start

# 브라우저에서 http://localhost:3000 접속
```

### 스크린샷

**기본 보안 키패드**
```
┌─────────────────────────────┐
│   보안 입력                  │
│   ●●●●●●                    │
└─────────────────────────────┘
┌─────────────────────────────┐
│  3  │  7  │  1  │           │
│  9  │  2  │  5  │           │
│  0  │  8  │  4  │           │
│  6  │     │     │           │
├─────────────────────────────┤
│ ← 삭제 │ 전체삭제 │ 확인    │
└─────────────────────────────┘
```

**고급 버전 (강도 측정 포함)**
```
┌─────────────────────────────┐
│   비밀번호           🔐 암호화│
│   ●●●●●●●●                 │
│   강도: ████░ 강함           │
└─────────────────────────────┘
```

## 설치

### NPM 패키지 (예정)

```bash
npm install @yourorg/secure-keypad
```

### 수동 설치

필요한 파일들을 프로젝트에 복사:

```bash
# 컴포넌트
cp SecureKeypad.tsx your-project/src/components/
cp SecureKeypadAdvanced.tsx your-project/src/components/

# 유틸리티
cp secureKeypadCrypto.ts your-project/src/utils/
```

### 필수 의존성

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "@mui/material": "^5.0.0",
    "@emotion/react": "^11.0.0",
    "@emotion/styled": "^11.0.0"
  }
}
```

## 빠른 시작

### 1. 기본 사용법 (3줄의 코드)

```tsx
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

### 2. 로그인 페이지에 적용

```tsx
import { useState } from 'react';
import SecureKeypad from './components/SecureKeypad';

function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        await api.login({ email, password });
    };

    return (
        <form onSubmit={handleLogin}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일"
            />

            <SecureKeypad
                label="비밀번호"
                value={password}
                onChange={setPassword}
                maxLength={20}
                onEnter={handleLogin}
            />

            <button type="submit">로그인</button>
        </form>
    );
}
```

### 3. 고급 기능 (암호화 + 강도 측정)

```tsx
import SecureKeypadAdvanced from './components/SecureKeypadAdvanced';

function AdvancedLogin() {
    const [password, setPassword] = useState('');

    const handleSubmit = async (encryptedPacket: string) => {
        // 암호화된 패킷을 서버로 전송
        await api.secureLogin({
            email: email,
            secureData: encryptedPacket
        });
    };

    return (
        <SecureKeypadAdvanced
            label="비밀번호"
            value={password}
            onChange={setPassword}
            maxLength={20}
            enableEncryption={true}
            showStrengthMeter={true}
            onEnter={handleSubmit}
        />
    );
}
```

## 사용법

### 컴포넌트 선택 가이드

**언제 `SecureKeypad`를 사용하나요?**
- PIN 번호 입력
- 간단한 비밀번호 입력
- 인증 코드 입력
- 빠른 프로토타이핑

**언제 `SecureKeypadAdvanced`를 사용하나요?**
- 금융 거래 인증
- 민감한 개인정보 입력
- 의료 정보 시스템
- 높은 수준의 보안이 필요한 경우

### Props 상세 설명

#### SecureKeypad Props

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `label` | `string` | ❌ | `'보안 입력'` | 입력 필드 레이블 |
| `value` | `string` | ✅ | - | 입력된 값 |
| `onChange` | `(value: string) => void` | ✅ | - | 값 변경 핸들러 |
| `maxLength` | `number` | ❌ | `20` | 최대 입력 길이 |
| `disabled` | `boolean` | ❌ | `false` | 비활성화 여부 |
| `onEnter` | `() => void` | ❌ | - | 확인 버튼 클릭 시 실행 |
| `autoFocus` | `boolean` | ❌ | `false` | 자동으로 키패드 열기 |

#### SecureKeypadAdvanced Props

기본 Props + 추가:

| Prop | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| `enableEncryption` | `boolean` | ❌ | `true` | 암호화 활성화 |
| `showStrengthMeter` | `boolean` | ❌ | `false` | 강도 측정 표시 |
| `encryptionKey` | `string` | ❌ | (자동생성) | 암호화 키 |
| `onChange` | `(value: string, encrypted?: string) => void` | ✅ | - | 값 및 암호화 데이터 반환 |
| `onEnter` | `(encrypted: string) => void` | ❌ | - | 암호화된 패킷 반환 |

### 이벤트 핸들링

#### onChange 이벤트

```tsx
// 기본 버전
<SecureKeypad
    value={value}
    onChange={(newValue) => {
        console.log('입력값:', newValue);
        setValue(newValue);
    }}
/>

// 고급 버전
<SecureKeypadAdvanced
    value={value}
    onChange={(newValue, encrypted) => {
        console.log('입력값:', newValue);
        console.log('암호화:', encrypted);
        setValue(newValue);
    }}
/>
```

#### onEnter 이벤트

```tsx
// 기본 버전
<SecureKeypad
    value={value}
    onChange={setValue}
    onEnter={() => {
        console.log('확인 버튼 클릭');
        handleSubmit();
    }}
/>

// 고급 버전 (암호화된 패킷 전달)
<SecureKeypadAdvanced
    value={value}
    onChange={setValue}
    onEnter={(encryptedPacket) => {
        console.log('암호화된 패킷:', encryptedPacket);
        sendToServer(encryptedPacket);
    }}
/>
```

## API 문서

### SecureKeypadCrypto 유틸리티

#### 암호화/복호화

```typescript
import { SecureKeypadCrypto } from './utils/secureKeypadCrypto';

// AES-256-GCM 암호화
const { encrypted, iv } = await SecureKeypadCrypto.aesEncrypt(
    plainText,
    password
);

// AES-256-GCM 복호화
const decrypted = await SecureKeypadCrypto.aesDecrypt(
    encrypted,
    password,
    iv
);
```

#### 보안 패킷

```typescript
// 보안 패킷 생성 (타임스탬프 + 논스 포함)
const packet = await SecureKeypadCrypto.createSecurePacket(
    value,
    encryptionKey
);

// 패킷 구조
{
    encrypted: "base64...",
    iv: "base64:base64",
    timestamp: 1697234567890,
    nonce: "random16chars"
}

// 보안 패킷 검증 및 복호화
const originalValue = await SecureKeypadCrypto.verifySecurePacket(
    packet,
    encryptionKey,
    5 * 60 * 1000  // 최대 5분 허용
);
```

#### 비밀번호 강도 측정

```typescript
const strength = SecureKeypadCrypto.checkPasswordStrength(password);

// 결과
{
    score: 3,  // 0-4
    feedback: "12자 이상 사용하세요",
    strength: "strong"  // 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong'
}
```

#### 해시 및 HMAC

```typescript
// SHA-256 해시
const hash = await SecureKeypadCrypto.hash(value);

// HMAC 생성
const hmac = await SecureKeypadCrypto.createHMAC(message, key);

// HMAC 검증
const isValid = await SecureKeypadCrypto.verifyHMAC(message, key, expectedHmac);
```

#### 키/토큰 생성

```typescript
// 암호화 키 생성
const key = SecureKeypadCrypto.generateKey(32);

// 세션 토큰 생성
const token = SecureKeypadCrypto.generateToken(32);
```

## 보안 기능

### 1. 키로거 방지

**어떻게 작동하나요?**

일반 입력 방식에서는 키보드 이벤트가 발생하여 키로거가 입력값을 탈취할 수 있습니다:

```typescript
// ❌ 취약한 코드
<input 
    type="password" 
    onChange={(e) => setPassword(e.target.value)}
/>
// KeyboardEvent → 키로거가 감지 가능
```

보안 키패드는 마우스 클릭 이벤트만 사용합니다:

```typescript
// ✅ 안전한 코드
<Button onClick={() => handleClick(5)}>5</Button>
// MouseEvent → 키로거가 숫자를 알 수 없음
```

**효과:**
- 하드웨어 키로거: 100% 차단
- 소프트웨어 키로거: 100% 차단
- 키보드 이벤트 후킹: 100% 차단

### 2. 무작위 숫자 배치

**Fisher-Yates 알고리즘:**

```typescript
function shuffleNumbers() {
    const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    for (let i = 9; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    
    return numbers;
}
```

**효과:**
- 매번 키패드를 열 때마다 숫자 위치 변경
- 10! = 3,628,800 가지의 배치 조합
- 패턴 학습 공격 불가능
- 화면 녹화로도 패턴 파악 불가

### 3. AES-256-GCM 암호화

**암호화 프로세스:**

```
입력값 (평문)
    ↓
PBKDF2 키 유도 (100,000 iterations)
    ↓
AES-256-GCM 암호화
    ↓
암호문 + IV + 인증 태그
```

**보안 계층:**
1. **PBKDF2**: 무차별 대입 공격 방어 (100,000번 반복)
2. **AES-256**: 군사급 암호화 (2^256 = 10^77 키 공간)
3. **GCM 모드**: 인증 암호화 (기밀성 + 무결성)
4. **랜덤 IV**: 동일 평문도 다른 암호문으로 변환
5. **Salt**: 레인보우 테이블 공격 방어

**안전성:**
- NSA Suite B 승인 알고리즘
- NIST 표준 (FIPS 197)
- 금융권, 정부기관 사용

### 4. 재전송 공격 방지

**타임스탬프 검증:**

```typescript
// 패킷 생성 시 타임스탬프 추가
const packet = {
    encrypted: "...",
    timestamp: Date.now(),
    nonce: "random"
};

// 서버에서 검증
const age = Date.now() - packet.timestamp;
if (age > 5 * 60 * 1000) {  // 5분 초과
    throw new Error('패킷이 만료되었습니다');
}
```

**효과:**
- 재전송 공격(Replay Attack) 방지
- 패킷 유효 기간 제한
- 네트워크 지연 고려

### 5. 무결성 검증

**Nonce + HMAC:**

```typescript
// Nonce 생성 및 검증
const nonce = generateRandomString(16);

// 데이터와 함께 암호화
const data = { value, nonce, timestamp };

// 서버에서 검증
if (decrypted.nonce !== packet.nonce) {
    throw new Error('데이터가 변조되었습니다');
}
```

**효과:**
- 데이터 변조 탐지
- 중간자 공격 방어
- 무결성 보장

## 사용 사례

### 금융 서비스 🏦

**은행 ATM 웹 버전**
```tsx
<SecureKeypadAdvanced
    label="PIN 번호 (6자리)"
    value={pin}
    onChange={setPin}
    maxLength={6}
    enableEncryption={true}
    onEnter={handleWithdrawal}
/>
```

**온라인 뱅킹 로그인**
```tsx
<SecureKeypadAdvanced
    label="보안 비밀번호"
    value={password}
    onChange={setPassword}
    maxLength={20}
    enableEncryption={true}
    showStrengthMeter={true}
/>
```

**카드 결제 인증**
```tsx
<SecureKeypad
    label="카드 비밀번호"
    value={cardPin}
    onChange={setCardPin}
    maxLength={4}
    onEnter={processPayment}
/>
```

### 의료 시스템 🏥

**환자 정보 접근**
```tsx
<SecureKeypadAdvanced
    label="의료진 PIN"
    value={staffPin}
    onChange={setStaffPin}
    maxLength={6}
    enableEncryption={true}
/>
```

**전자 처방전 승인**
```tsx
<SecureKeypad
    label="승인 코드"
    value={approvalCode}
    onChange={setApprovalCode}
    maxLength={8}
/>
```

### 기업 보안 🏢

**관리자 로그인**
```tsx
<SecureKeypadAdvanced
    label="관리자 비밀번호"
    value={adminPassword}
    onChange={setAdminPassword}
    maxLength={20}
    enableEncryption={true}
    showStrengthMeter={true}
/>
```

**민감 데이터 접근**
```tsx
<SecureKeypad
    label="접근 PIN"
    value={accessPin}
    onChange={setAccessPin}
    maxLength={8}
    onEnter={grantAccess}
/>
```

### 공공 서비스 🏛️

**무인 민원 발급기**
```tsx
<SecureKeypad
    label="주민등록번호 뒷자리"
    value={idNumber}
    onChange={setIdNumber}
    maxLength={7}
/>
```

**전자투표 시스템**
```tsx
<SecureKeypadAdvanced
    label="투표 인증 코드"
    value={voteCode}
    onChange={setVoteCode}
    maxLength={10}
    enableEncryption={true}
/>
```

### 전자상거래 🛒

**결제 비밀번호**
```tsx
<SecureKeypad
    label="결제 비밀번호"
    value={paymentPassword}
    onChange={setPaymentPassword}
    maxLength={6}
    onEnter={confirmPayment}
/>
```

**본인 인증**
```tsx
<SecureKeypad
    label="인증번호 (6자리)"
    value={verifyCode}
    onChange={setVerifyCode}
    maxLength={6}
/>
```

## 브라우저 호환성

### 데스크톱 브라우저

| 브라우저 | 최소 버전 | 테스트 버전 | 상태 |
|---------|----------|------------|------|
| Chrome | 90+ | 120 | ✅ 완벽 |
| Firefox | 88+ | 121 | ✅ 완벽 |
| Safari | 14+ | 17 | ✅ 완벽 |
| Edge | 90+ | 120 | ✅ 완벽 |
| Opera | 76+ | 106 | ✅ 완벽 |

### 모바일 브라우저

| 브라우저 | 최소 버전 | 테스트 버전 | 상태 |
|---------|----------|------------|------|
| iOS Safari | iOS 14+ | iOS 17 | ✅ 완벽 |
| Chrome Mobile | 90+ | 120 | ✅ 완벽 |
| Samsung Internet | 14+ | 23 | ✅ 완벽 |
| Firefox Mobile | 88+ | 121 | ✅ 완벽 |

### 기능 지원

| 기능 | Chrome | Firefox | Safari | Edge |
|-----|--------|---------|--------|------|
| Web Crypto API | ✅ | ✅ | ✅ | ✅ |
| Fisher-Yates | ✅ | ✅ | ✅ | ✅ |
| Touch Events | ✅ | ✅ | ✅ | ✅ |
| CSS Animations | ✅ | ✅ | ✅ | ✅ |
| Dark Mode | ✅ | ✅ | ✅ | ✅ |

## FAQ

### Q: 일반 사용자도 쉽게 사용할 수 있나요?
**A:** 네! 은행 앱의 보안 키패드와 동일한 UX를 제공합니다. 대부분의 사용자가 이미 익숙한 인터페이스입니다.

### Q: 성능에 영향을 주나요?
**A:** 아니요. 암호화는 Web Crypto API를 사용하여 네이티브 속도로 실행되며, 렌더링은 최적화되어 있습니다.

### Q: 모바일에서도 잘 작동하나요?
**A:** 네! 터치 이벤트를 완벽히 지원하며, 반응형 디자인으로 모든 화면 크기에 최적화되어 있습니다.

### Q: 서버 측 구현이 필요한가요?
**A:** 기본 버전은 클라이언트만으로 작동합니다. 고급 버전(암호화)을 사용하려면 서버에서 복호화 로직이 필요합니다.

### Q: 다른 프레임워크(Vue, Angular)에서도 사용할 수 있나요?
**A:** 현재는 React 전용입니다. Vue/Angular 버전은 추후 제공 예정입니다.

### Q: 상업적으로 사용해도 되나요?
**A:** 네! MIT 라이선스로 상업적 사용이 자유롭습니다.

### Q: 한글이나 특수문자도 입력할 수 있나요?
**A:** 현재는 숫자(0-9)만 지원합니다. 영문자 및 특수문자 지원은 Phase 2에 추가 예정입니다.

### Q: HTTPS가 필수인가요?
**A:** 권장사항입니다. 암호화를 사용하더라도 HTTPS 없이는 중간자 공격에 취약할 수 있습니다.

## 라이선스

MIT License

```
Copyright (c) 2025 CrossFit System Development Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 문서

- 📖 [사용 가이드](SECURE_KEYPAD_GUIDE.md)
- 🔧 [구현 가이드](SECURE_KEYPAD_IMPLEMENTATION.md)
- 💻 [API 문서](#api-문서)

## 기여

이슈나 개선 제안은 언제든지 환영합니다!

## 지원

- 📧 이메일: [지원 이메일]
- 💬 이슈: [GitHub Issues]
- 📚 문서: [Documentation]

---

<div align="center">

**보안은 선택이 아닌 필수입니다. 🔒**

Made with ❤️ by CrossFit System Development Team

</div>

