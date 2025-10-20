# ⌨️ QWERTY 보안 키패드 가이드

영문, 숫자, 특수문자를 모두 지원하는 완전한 보안 키패드 시스템입니다.

## 🎯 주요 특징

### 4가지 입력 모드

| 모드 | 문자 | 설명 |
|-----|------|------|
| **abc** | a-z | 소문자 알파벳 |
| **ABC** | A-Z | 대문자 알파벳 |
| **123** | 0-9, @#$%&* | 숫자 및 기본 특수문자 |
| **!@#** | !@#$%^&*()_-+= 등 | 모든 특수문자 |

### 보안 기능

✅ **무작위 배치**: 매번 키가 다른 위치에 배치  
✅ **키로거 방지**: 마우스/터치 클릭만 사용  
✅ **입력 마스킹**: ●●●● 형태로 표시  
✅ **스페이스바**: 공백 입력 지원  

---

## 🚀 사용 방법

### 기본 사용

```tsx
import SecureQwertyKeypad from './components/SecureQwertyKeypad';

function MyComponent() {
    const [password, setPassword] = useState('');

    return (
        <SecureQwertyKeypad
            label="비밀번호"
            value={password}
            onChange={setPassword}
            maxLength={50}
            showMasked={true}
        />
    );
}
```

### Props

| Prop | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `label` | `string` | `'보안 입력'` | 레이블 텍스트 |
| `value` | `string` | (필수) | 입력값 |
| `onChange` | `(value: string) => void` | (필수) | 변경 핸들러 |
| `maxLength` | `number` | `50` | 최대 길이 |
| `disabled` | `boolean` | `false` | 비활성화 |
| `onEnter` | `() => void` | - | 확인 버튼 콜백 |
| `autoFocus` | `boolean` | `false` | 자동 포커스 |
| `showMasked` | `boolean` | `true` | 마스킹 표시 여부 |

---

## 💻 백엔드 통합

### 1. 암호화 전송 (권장)

```tsx
import { SecureKeypadCrypto } from './utils/secureKeypadCrypto';

// 프론트엔드
const handleSubmit = async () => {
    // 보안 패킷 생성
    const packet = await SecureKeypadCrypto.createSecurePacket(
        password,
        ENCRYPTION_KEY
    );
    
    // 서버로 전송
    await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: email,
            secureData: JSON.stringify(packet)
        })
    });
};
```

### 2. Python 백엔드 복호화

```python
from backend.utils.secure_keypad_decrypt import decrypt_secure_packet

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data['email']
    secure_packet = data['secureData']
    
    # 복호화
    try:
        decrypted = decrypt_secure_packet(secure_packet, ENCRYPTION_KEY)
        password = decrypted['value']
    except ValueError as e:
        return jsonify({'error': 'Invalid secure data'}), 400
    
    # 인증 처리
    user = authenticate(email, password)
    # ...
```

### 3. Node.js 백엔드 복호화

```javascript
const { decryptSecurePacket } = require('./utils/secureKeypadDecrypt');

app.post('/api/login', async (req, res) => {
    const { email, secureData } = req.body;
    
    // 복호화
    try {
        const decrypted = decryptSecurePacket(secureData, ENCRYPTION_KEY);
        const password = decrypted.value;
    } catch (error) {
        return res.status(400).json({ error: 'Invalid secure data' });
    }
    
    // 인증 처리
    const user = await authenticate(email, password);
    // ...
});
```

---

## 📊 지원 문자 상세

### 소문자 모드 (abc)

```
q w e r t y u i o p
a s d f g h j k l
z x c v b n m
```

### 대문자 모드 (ABC)

```
Q W E R T Y U I O P
A S D F G H J K L
Z X C V B N M
```

### 숫자 모드 (123)

```
1 2 3 4 5 6 7 8 9 0
@ # $ % & * ( ) - +
= [ ] { } \ | ; : "
```

### 특수문자 모드 (!@#)

```
! @ # $ % ^ & * ( )
_ - + = [ ] { } \ |
; : " ' , . < > / ?
```

---

## 🎨 커스터마이징

### 스타일 변경

```tsx
<SecureQwertyKeypad
    value={value}
    onChange={setValue}
    // Material-UI sx prop로 스타일 변경 가능
/>
```

### 마스킹 비활성화

```tsx
<SecureQwertyKeypad
    value={value}
    onChange={setValue}
    showMasked={false}  // 입력값 그대로 표시
/>
```

### 최대 길이 설정

```tsx
<SecureQwertyKeypad
    value={value}
    onChange={setValue}
    maxLength={20}  // 20자 제한
/>
```

---

## 🔍 사용 예제

### 회원가입 폼

```tsx
function RegisterForm() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            
            <SecureQwertyKeypad
                label="비밀번호"
                value={password}
                onChange={setPassword}
                maxLength={50}
            />
            
            <SecureQwertyKeypad
                label="비밀번호 확인"
                value={confirmPassword}
                onChange={setConfirmPassword}
                maxLength={50}
            />
            
            <button type="submit">가입하기</button>
        </form>
    );
}
```

### 비밀번호 변경

```tsx
function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    return (
        <div>
            <SecureQwertyKeypad
                label="현재 비밀번호"
                value={currentPassword}
                onChange={setCurrentPassword}
            />
            
            <SecureQwertyKeypad
                label="새 비밀번호"
                value={newPassword}
                onChange={setNewPassword}
            />
            
            <button onClick={handleChange}>변경</button>
        </div>
    );
}
```

---

## 🎯 데모 페이지에서 체험

1. **http://localhost:3000/#keypad-demo** 접속
2. **"QWERTY 키패드"** 탭 선택
3. 4가지 모드 전환하며 체험

---

## 📝 백엔드 복호화 전체 가이드

상세한 백엔드 통합 가이드는 다음 문서 참조:
- 📙 [BACKEND_DECRYPTION_GUIDE.md](BACKEND_DECRYPTION_GUIDE.md)

---

## 🔐 보안 권장사항

### 1. HTTPS 필수

```
❌ http://example.com
✅ https://example.com
```

### 2. 암호화 키 관리

```python
# ❌ 하드코딩
ENCRYPTION_KEY = "my-secret-key"

# ✅ 환경변수
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
```

### 3. Rate Limiting

```python
@limiter.limit("5 per minute")
def login():
    # ...
```

---

## 💡 Tip

### 입력 완료 후 자동 제출

```tsx
<SecureQwertyKeypad
    value={password}
    onChange={setPassword}
    onEnter={() => {
        // Enter 동작
        handleSubmit();
    }}
/>
```

### 비밀번호 강도 체크 연동

```tsx
import { SecureKeypadCrypto } from './utils/secureKeypadCrypto';

const strength = SecureKeypadCrypto.checkPasswordStrength(password);
console.log(strength.strength); // 'weak', 'medium', 'strong'
```

---

**Made with ❤️ by CrossFit System Development Team**

