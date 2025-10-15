# 🔐 백엔드 복호화 가이드

프론트엔드 보안 키패드에서 암호화된 데이터를 백엔드에서 복호화하는 완벽한 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [암호화 플로우](#암호화-플로우)
3. [필수 라이브러리](#필수-라이브러리)
4. [Python (Flask) 구현](#python-flask-구현)
5. [Node.js (Express) 구현](#nodejs-express-구현)
6. [보안 고려사항](#보안-고려사항)
7. [문제 해결](#문제-해결)

---

## 개요

### 프론트엔드 → 백엔드 데이터 전송

```
사용자 입력 (평문)
    ↓
[프론트엔드]
    ├─ AES-256-GCM 암호화
    ├─ PBKDF2 키 유도 (100,000회)
    ├─ 타임스탬프 추가
    └─ Nonce 생성
    ↓
암호화된 패킷 (JSON)
    ↓
HTTPS 전송
    ↓
[백엔드]
    ├─ 타임스탬프 검증
    ├─ AES-256-GCM 복호화
    ├─ Nonce 검증
    └─ 데이터 추출
    ↓
평문 데이터
```

### 보안 패킷 구조

```json
{
    "encrypted": "base64_encoded_ciphertext",
    "iv": "base64_iv:base64_salt",
    "timestamp": 1697234567890,
    "nonce": "random_16_chars"
}
```

---

## 암호화 플로우

### 1. 프론트엔드 (JavaScript/TypeScript)

```typescript
// SecureKeypadCrypto.createSecurePacket()

const value = "user_password";
const encryptionKey = "shared-secret-key";

// 1. 타임스탬프와 논스 생성
const timestamp = Date.now();
const nonce = generateRandomString(16);

// 2. 데이터 패키징
const dataToEncrypt = JSON.stringify({
    value,
    timestamp,
    nonce
});

// 3. AES-256-GCM 암호화
const { encrypted, iv } = await aesEncrypt(dataToEncrypt, encryptionKey);

// 4. 패킷 생성
const packet = {
    encrypted,
    iv,  // "iv_base64:salt_base64"
    timestamp,
    nonce
};

// 5. 서버로 전송
await fetch('/api/login', {
    method: 'POST',
    body: JSON.stringify({
        email: 'user@example.com',
        secureData: JSON.stringify(packet)
    })
});
```

### 2. 백엔드 (Python)

```python
# 복호화 및 검증

packet = json.loads(request.body['secureData'])

# 1. 타임스탬프 검증
if time.time() * 1000 - packet['timestamp'] > 300000:  # 5분
    raise ValueError("Packet expired")

# 2. 복호화
decrypted_data = decrypt(packet['encrypted'], encryption_key, packet['iv'])

# 3. Nonce 검증
if decrypted_data['nonce'] != packet['nonce']:
    raise ValueError("Invalid nonce")

# 4. 평문 추출
password = decrypted_data['value']
```

---

## 필수 라이브러리

### Python

```bash
pip install cryptography
```

### Node.js

```bash
npm install crypto
```

---

## Python (Flask) 구현

### 1. 복호화 유틸리티 설치

파일 위치: `backend/utils/secure_keypad_decrypt.py`

이미 생성된 파일을 사용하거나 다음 내용을 확인:

```python
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import json
import time

def decrypt_secure_packet(packet_json: str, encryption_key: str, max_age_seconds: int = 300) -> dict:
    """보안 패킷 복호화"""
    # ... (위에서 생성한 파일 참조)
```

### 2. Flask 라우트 통합

```python
from flask import Flask, request, jsonify
from backend.utils.secure_keypad_decrypt import decrypt_secure_packet
import os

app = Flask(__name__)

# 환경변수에서 암호화 키 가져오기
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY', 'your-default-key-change-in-production')

@app.route('/api/auth/secure-login', methods=['POST'])
def secure_login():
    """보안 키패드를 통한 로그인"""
    try:
        data = request.get_json()
        
        # 이메일
        email = data.get('email')
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        # 보안 패킷
        secure_packet = data.get('secureData')
        if not secure_packet:
            return jsonify({'error': 'Secure data is required'}), 400
        
        # 복호화
        try:
            decrypted = decrypt_secure_packet(
                secure_packet, 
                ENCRYPTION_KEY,
                max_age_seconds=300  # 5분
            )
            password = decrypted['value']
            
            print(f"[Security] Decryption successful. Packet age: {decrypted['age_ms']}ms")
            
        except ValueError as e:
            print(f"[Security] Decryption failed: {str(e)}")
            return jsonify({'error': 'Invalid or expired secure data'}), 400
        
        # 기존 인증 로직 (bcrypt 해시 비교 등)
        user = User.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다'}), 401
        
        # JWT 토큰 생성
        from flask_jwt_extended import create_access_token
        token = create_access_token(identity=user.id)
        
        return jsonify({
            'message': '로그인 성공',
            'access_token': token,
            'user_id': user.id,
            'name': user.name
        }), 200
        
    except Exception as e:
        print(f"[Error] Login failed: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@app.route('/api/auth/verify-secure-data', methods=['POST'])
def verify_secure_data():
    """보안 데이터 검증 전용 엔드포인트 (테스트용)"""
    try:
        data = request.get_json()
        secure_packet = data.get('secureData')
        
        if not secure_packet:
            return jsonify({'error': 'Secure data is required'}), 400
        
        # 복호화 시도
        decrypted = decrypt_secure_packet(secure_packet, ENCRYPTION_KEY)
        
        return jsonify({
            'success': True,
            'decrypted_value': decrypted['value'],
            'packet_age_ms': decrypted['age_ms'],
            'timestamp': decrypted['timestamp']
        }), 200
        
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400


if __name__ == '__main__':
    app.run(debug=True)
```

### 3. 환경 변수 설정

`.env` 파일:

```bash
# 암호화 키 (프론트엔드와 동일해야 함)
ENCRYPTION_KEY=your-super-secret-encryption-key-min-32-chars

# 또는 무작위 생성
# python -c "import secrets; print(secrets.token_urlsafe(32))"
```

---

## Node.js (Express) 구현

### 1. 복호화 유틸리티

```javascript
// backend/utils/secureKeypadDecrypt.js

const crypto = require('crypto');

/**
 * PBKDF2를 사용한 키 유도
 */
function deriveKey(password, salt, iterations = 100000) {
    return crypto.pbkdf2Sync(
        password,
        salt,
        iterations,
        32,  // 256 bits
        'sha256'
    );
}

/**
 * 보안 패킷 복호화
 */
function decryptSecurePacket(packetJson, encryptionKey, maxAgeSeconds = 300) {
    try {
        // JSON 파싱
        const packet = JSON.parse(packetJson);
        
        // 필수 필드 확인
        const requiredFields = ['encrypted', 'iv', 'timestamp', 'nonce'];
        for (const field of requiredFields) {
            if (!packet[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        
        // 타임스탬프 검증
        const currentTime = Date.now();
        const age = currentTime - packet.timestamp;
        
        if (age > maxAgeSeconds * 1000) {
            throw new Error(`Packet expired. Age: ${age}ms`);
        }
        
        if (age < -60000) {  // 1분 이상 미래
            throw new Error('Packet timestamp is in the future');
        }
        
        // IV와 Salt 분리
        const [ivBase64, saltBase64] = packet.iv.split(':');
        
        // Base64 디코딩
        const encrypted = Buffer.from(packet.encrypted, 'base64');
        const iv = Buffer.from(ivBase64, 'base64');
        const salt = Buffer.from(saltBase64, 'base64');
        
        // 키 유도
        const key = deriveKey(encryptionKey, salt);
        
        // AES-256-GCM 복호화
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        
        // 인증 태그 추출 (마지막 16 bytes)
        const authTag = encrypted.slice(-16);
        const ciphertext = encrypted.slice(0, -16);
        
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(ciphertext, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        // JSON 파싱
        const decryptedData = JSON.parse(decrypted);
        
        // Nonce 검증
        if (decryptedData.nonce !== packet.nonce) {
            throw new Error('Nonce mismatch');
        }
        
        // 타임스탬프 재검증
        if (decryptedData.timestamp !== packet.timestamp) {
            throw new Error('Timestamp mismatch');
        }
        
        return {
            success: true,
            value: decryptedData.value,
            timestamp: packet.timestamp,
            ageMs: age
        };
        
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

module.exports = {
    decryptSecurePacket
};
```

### 2. Express 라우트

```javascript
// backend/routes/auth.js

const express = require('express');
const router = express.Router();
const { decryptSecurePacket } = require('../utils/secureKeypadDecrypt');

// 환경변수에서 암호화 키 가져오기
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-me';

/**
 * 보안 키패드 로그인
 */
router.post('/secure-login', async (req, res) => {
    try {
        const { email, secureData } = req.body;
        
        // 입력 검증
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        if (!secureData) {
            return res.status(400).json({ error: 'Secure data is required' });
        }
        
        // 복호화
        let password;
        try {
            const decrypted = decryptSecurePacket(secureData, ENCRYPTION_KEY, 300);
            password = decrypted.value;
            
            console.log(`[Security] Decryption successful. Packet age: ${decrypted.ageMs}ms`);
            
        } catch (error) {
            console.error(`[Security] Decryption failed: ${error.message}`);
            return res.status(400).json({ error: 'Invalid or expired secure data' });
        }
        
        // 사용자 인증 (bcrypt 등)
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
        }
        
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다' });
        }
        
        // JWT 토큰 생성
        const token = generateJwtToken(user);
        
        res.json({
            message: '로그인 성공',
            token,
            user_id: user.id,
            name: user.name
        });
        
    } catch (error) {
        console.error(`[Error] Login failed: ${error.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * 보안 데이터 검증 (테스트용)
 */
router.post('/verify-secure-data', (req, res) => {
    try {
        const { secureData } = req.body;
        
        if (!secureData) {
            return res.status(400).json({ error: 'Secure data is required' });
        }
        
        const decrypted = decryptSecurePacket(secureData, ENCRYPTION_KEY);
        
        res.json({
            success: true,
            decrypted_value: decrypted.value,
            packet_age_ms: decrypted.ageMs,
            timestamp: decrypted.timestamp
        });
        
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
```

---

## 보안 고려사항

### 1. 암호화 키 관리

```python
# ❌ 나쁜 예
ENCRYPTION_KEY = "hardcoded-key-123"

# ✅ 좋은 예
import os
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

if not ENCRYPTION_KEY:
    raise ValueError("ENCRYPTION_KEY environment variable not set")

# 최소 길이 확인
if len(ENCRYPTION_KEY) < 32:
    raise ValueError("ENCRYPTION_KEY must be at least 32 characters")
```

### 2. HTTPS 필수

```nginx
# Nginx 설정
server {
    listen 443 ssl http2;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location /api/ {
        proxy_pass http://backend:5000;
    }
}
```

### 3. Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

@app.route('/api/auth/secure-login', methods=['POST'])
@limiter.limit("5 per minute")  # 1분에 5회 제한
def secure_login():
    # ...
```

### 4. 로깅 주의

```python
# ❌ 나쁜 예 - 민감한 정보 로깅
print(f"Password: {password}")
print(f"Decrypted data: {decrypted_data}")

# ✅ 좋은 예 - 메타데이터만 로깅
print(f"[Security] Decryption successful. Packet age: {age}ms")
print(f"[Auth] Login attempt for email: {email}")
```

### 5. 에러 메시지

```python
# ❌ 나쁜 예 - 구체적인 에러 노출
return jsonify({'error': 'Nonce mismatch - integrity check failed'}), 400

# ✅ 좋은 예 - 일반적인 메시지
return jsonify({'error': 'Invalid secure data'}), 400
```

---

## 문제 해결

### Q1: "Packet expired" 에러

**원인:** 서버와 클라이언트의 시간 차이

**해결:**
```python
# 허용 시간 늘리기 (10분)
decrypt_secure_packet(packet, key, max_age_seconds=600)

# 또는 서버 시간 동기화 (NTP)
sudo ntpdate -s time.nist.gov
```

### Q2: "Nonce mismatch" 에러

**원인:** 데이터 변조 또는 복호화 실패

**해결:**
```python
# 1. 암호화 키가 동일한지 확인
print(f"Frontend key: {frontend_key}")
print(f"Backend key: {backend_key}")

# 2. 패킷 무결성 확인
print(f"Original nonce: {packet['nonce']}")
print(f"Decrypted nonce: {decrypted_data['nonce']}")
```

### Q3: "Invalid JSON" 에러

**원인:** 패킷 형식 오류

**해결:**
```python
# 디버깅
print(f"Received packet: {secure_packet}")
print(f"Packet type: {type(secure_packet)}")

# 이중 JSON 파싱 확인
if isinstance(secure_packet, str):
    packet = json.loads(secure_packet)
```

### Q4: 복호화 성공했지만 값이 이상함

**원인:** 인코딩 문제

**해결:**
```python
# UTF-8 인코딩 명시
decrypted_str = decrypted_bytes.decode('utf-8')

# Base64 패딩 확인
encrypted += '=' * (4 - len(encrypted) % 4)
```

---

## 테스트 예제

### Python 단위 테스트

```python
import unittest
from backend.utils.secure_keypad_decrypt import decrypt_secure_packet

class TestSecureKeypadDecrypt(unittest.TestCase):
    
    def setUp(self):
        self.encryption_key = "test-key-for-unit-testing"
    
    def test_valid_packet(self):
        """유효한 패킷 복호화 테스트"""
        # 프론트엔드에서 생성한 실제 패킷 사용
        packet = '''{
            "encrypted": "...",
            "iv": "...",
            "timestamp": 1697234567890,
            "nonce": "..."
        }'''
        
        result = decrypt_secure_packet(packet, self.encryption_key)
        
        self.assertTrue(result['success'])
        self.assertIsNotNone(result['value'])
    
    def test_expired_packet(self):
        """만료된 패킷 테스트"""
        old_packet = '''{
            "encrypted": "...",
            "iv": "...",
            "timestamp": 1000000000000,
            "nonce": "..."
        }'''
        
        with self.assertRaises(ValueError):
            decrypt_secure_packet(old_packet, self.encryption_key, max_age_seconds=1)
    
    def test_invalid_nonce(self):
        """잘못된 논스 테스트"""
        # 논스가 다른 패킷
        invalid_packet = '''...'''
        
        with self.assertRaises(ValueError):
            decrypt_secure_packet(invalid_packet, self.encryption_key)

if __name__ == '__main__':
    unittest.main()
```

---

## 프로덕션 체크리스트

- [ ] 환경변수에서 암호화 키 로드
- [ ] HTTPS 강제 사용
- [ ] Rate limiting 적용
- [ ] 로깅 설정 (민감 정보 제외)
- [ ] 에러 메시지 일반화
- [ ] 시간 동기화 (NTP)
- [ ] 키 로테이션 계획
- [ ] 모니터링 및 알림 설정
- [ ] 백업 및 복구 계획
- [ ] 보안 감사 로그

---

## 참고 자료

- **AES-GCM**: [NIST SP 800-38D](https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf)
- **PBKDF2**: [RFC 2898](https://tools.ietf.org/html/rfc2898)
- **Cryptography 라이브러리**: [cryptography.io](https://cryptography.io/)

---

**Made with ❤️ by CrossFit System Development Team**

