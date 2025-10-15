/**
 * 보안 키패드 암호화 유틸리티
 * 
 * 입력된 데이터를 안전하게 암호화하여 전송하는 기능 제공
 */

/**
 * 간단한 RSA 스타일 공개키 암호화 시뮬레이션
 * 실제 프로덕션에서는 Web Crypto API 사용 권장
 */
export interface EncryptionKeys {
    publicKey: string;
    privateKey: string;
}

/**
 * Base64 인코딩
 */
export const base64Encode = (str: string): string => {
    return btoa(unescape(encodeURIComponent(str)));
};

/**
 * Base64 디코딩
 */
export const base64Decode = (str: string): string => {
    return decodeURIComponent(escape(atob(str)));
};

/**
 * 간단한 XOR 암호화 (데모용)
 * 실제 환경에서는 AES-256 같은 강력한 알고리즘 사용 필요
 */
export const xorEncrypt = (text: string, key: string): string => {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return base64Encode(result);
};

/**
 * XOR 복호화
 */
export const xorDecrypt = (encryptedText: string, key: string): string => {
    const decoded = base64Decode(encryptedText);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }
    return result;
};

/**
 * 랜덤 암호화 키 생성
 */
export const generateEncryptionKey = (length: number = 32): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let key = '';
    const array = new Uint32Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
        key += chars[array[i] % chars.length];
    }
    return key;
};

/**
 * Web Crypto API를 사용한 AES-GCM 암호화 (권장)
 */
export const aesEncrypt = async (text: string, password: string): Promise<{ encrypted: string; iv: string }> => {
    try {
        // 비밀번호로부터 키 생성
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        // PBKDF2로 키 유도
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // IV(Initialization Vector) 생성
        const iv = crypto.getRandomValues(new Uint8Array(12));

        // 암호화
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encoder.encode(text)
        );

        // Base64로 인코딩하여 반환
        const encryptedArray = new Uint8Array(encrypted);
        const encryptedStr = Array.from(encryptedArray).map(b => String.fromCharCode(b)).join('');
        const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join('');
        const saltStr = Array.from(salt).map(b => String.fromCharCode(b)).join('');

        const encryptedBase64 = base64Encode(encryptedStr);
        const ivBase64 = base64Encode(ivStr);
        const saltBase64 = base64Encode(saltStr);

        return {
            encrypted: encryptedBase64,
            iv: `${ivBase64}:${saltBase64}` // IV와 salt를 함께 반환
        };
    } catch (error) {
        console.error('AES encryption error:', error);
        throw new Error('암호화 중 오류가 발생했습니다.');
    }
};

/**
 * Web Crypto API를 사용한 AES-GCM 복호화
 */
export const aesDecrypt = async (encryptedText: string, password: string, ivWithSalt: string): Promise<string> => {
    try {
        const [ivBase64, saltBase64] = ivWithSalt.split(':');

        // Base64 디코딩
        const encrypted = Uint8Array.from(base64Decode(encryptedText), c => c.charCodeAt(0));
        const iv = Uint8Array.from(base64Decode(ivBase64), c => c.charCodeAt(0));
        const salt = Uint8Array.from(base64Decode(saltBase64), c => c.charCodeAt(0));

        // 비밀번호로부터 키 생성
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveBits', 'deriveKey']
        );

        // PBKDF2로 키 유도
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['decrypt']
        );

        // 복호화
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );

        // 텍스트로 변환
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('AES decryption error:', error);
        throw new Error('복호화 중 오류가 발생했습니다.');
    }
};

/**
 * SHA-256 해시 생성
 */
export const sha256Hash = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
};

/**
 * 타임스탬프와 논스를 포함한 안전한 데이터 패킷 생성
 */
export const createSecurePacket = async (
    value: string,
    encryptionKey: string
): Promise<{
    encrypted: string;
    iv: string;
    timestamp: number;
    nonce: string;
}> => {
    const timestamp = Date.now();
    const nonce = generateEncryptionKey(16);

    // 값, 타임스탬프, 논스를 결합
    const dataToEncrypt = JSON.stringify({
        value,
        timestamp,
        nonce
    });

    // AES-GCM으로 암호화
    const { encrypted, iv } = await aesEncrypt(dataToEncrypt, encryptionKey);

    return {
        encrypted,
        iv,
        timestamp,
        nonce
    };
};

/**
 * 보안 패킷 검증 및 복호화
 */
export const verifySecurePacket = async (
    packet: {
        encrypted: string;
        iv: string;
        timestamp: number;
        nonce: string;
    },
    encryptionKey: string,
    maxAgeMs: number = 5 * 60 * 1000 // 5분
): Promise<string> => {
    // 타임스탬프 검증 (재전송 공격 방지)
    const now = Date.now();
    if (now - packet.timestamp > maxAgeMs) {
        throw new Error('패킷이 만료되었습니다.');
    }

    // 복호화
    const decryptedJson = await aesDecrypt(packet.encrypted, encryptionKey, packet.iv);
    const decryptedData = JSON.parse(decryptedJson);

    // 논스 검증
    if (decryptedData.nonce !== packet.nonce) {
        throw new Error('논스 검증에 실패했습니다.');
    }

    // 타임스탬프 재검증
    if (decryptedData.timestamp !== packet.timestamp) {
        throw new Error('타임스탬프 검증에 실패했습니다.');
    }

    return decryptedData.value;
};

/**
 * 안전한 비교 함수 (타이밍 공격 방지)
 */
export const secureCompare = (a: string, b: string): boolean => {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
};

/**
 * HMAC 생성 (메시지 무결성 검증)
 */
export const createHMAC = async (message: string, key: string): Promise<string> => {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = Array.from(new Uint8Array(signature));
    const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return signatureHex;
};

/**
 * HMAC 검증
 */
export const verifyHMAC = async (message: string, key: string, expectedHmac: string): Promise<boolean> => {
    const actualHmac = await createHMAC(message, key);
    return secureCompare(actualHmac, expectedHmac);
};

/**
 * 세션 토큰 생성 (암호학적으로 안전한 난수)
 */
export const generateSessionToken = (length: number = 32): string => {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * 비밀번호 강도 검사
 */
export const checkPasswordStrength = (password: string): {
    score: number; // 0-4
    feedback: string;
    strength: 'very-weak' | 'weak' | 'medium' | 'strong' | 'very-strong';
} => {
    let score = 0;
    const feedback: string[] = [];

    // 길이 체크
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    else feedback.push('12자 이상 사용하세요');

    // 대소문자 혼용
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
        score++;
    } else {
        feedback.push('대소문자를 혼용하세요');
    }

    // 숫자 포함
    if (/\d/.test(password)) {
        score++;
    } else {
        feedback.push('숫자를 포함하세요');
    }

    // 특수문자 포함
    // eslint-disable-next-line no-useless-escape
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        score++;
    } else {
        feedback.push('특수문자를 포함하세요');
    }

    const strengthMap = {
        0: 'very-weak',
        1: 'weak',
        2: 'medium',
        3: 'strong',
        4: 'very-strong'
    } as const;

    return {
        score,
        feedback: feedback.join(', ') || '안전한 비밀번호입니다',
        strength: strengthMap[score as keyof typeof strengthMap]
    };
};

/**
 * 사용 예시 객체
 */
export const SecureKeypadCrypto = {
    // 기본 암호화
    encrypt: xorEncrypt,
    decrypt: xorDecrypt,

    // 고급 암호화 (권장)
    aesEncrypt,
    aesDecrypt,

    // 해시
    hash: sha256Hash,

    // 보안 패킷
    createSecurePacket,
    verifySecurePacket,

    // 유틸리티
    generateKey: generateEncryptionKey,
    generateToken: generateSessionToken,
    checkPasswordStrength,

    // HMAC
    createHMAC,
    verifyHMAC,
    secureCompare
};

export default SecureKeypadCrypto;

