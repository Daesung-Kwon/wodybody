/**
 * 보안 키패드를 위한 암호화 유틸리티
 * AES-256-GCM 알고리즘 사용
 */

// Base64 인코딩
function base64Encode(str: string): string {
    return btoa(str);
}

// Base64 디코딩
function base64Decode(str: string): string {
    return atob(str);
}

/**
 * 비밀번호 기반 키 유도 함수 (PBKDF2)
 */
async function deriveKey(password: string, salt: BufferSource, iterations: number = 100000): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const importedKey = await window.crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        { name: 'PBKDF2' },
        false,
        ['deriveBits', 'deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations,
            hash: 'SHA-256',
        },
        importedKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * AES-256-GCM으로 데이터 암호화
 */
export async function encryptData(plaintext: string, password: string): Promise<string> {
    try {
        // Salt 생성 (16 bytes)
        const salt = window.crypto.getRandomValues(new Uint8Array(16));

        // IV(Initialization Vector) 생성 (12 bytes for GCM)
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        // 키 유도
        const key = await deriveKey(password, salt);

        // 데이터 암호화
        const encoder = new TextEncoder();
        const data = encoder.encode(plaintext);

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv,
            },
            key,
            data
        );

        // 결과를 Base64로 인코딩
        const encryptedArray = new Uint8Array(encrypted);
        const encryptedStr = Array.from(encryptedArray).map(b => String.fromCharCode(b)).join('');
        const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join('');
        const saltStr = Array.from(salt).map(b => String.fromCharCode(b)).join('');

        const encryptedBase64 = base64Encode(encryptedStr);
        const ivBase64 = base64Encode(ivStr);
        const saltBase64 = base64Encode(saltStr);

        // JSON 형태로 반환
        return JSON.stringify({
            encrypted: encryptedBase64,
            iv: ivBase64,
            salt: saltBase64,
            timestamp: Date.now(),
        });
    } catch (error) {
        console.error('암호화 오류:', error);
        throw new Error('암호화에 실패했습니다.');
    }
}

/**
 * AES-256-GCM으로 데이터 복호화
 */
export async function decryptData(encryptedPacket: string, password: string): Promise<string> {
    try {
        const packet = JSON.parse(encryptedPacket);

        // Base64 디코딩
        const encryptedStr = base64Decode(packet.encrypted);
        const ivStr = base64Decode(packet.iv);
        const saltStr = base64Decode(packet.salt);

        const encrypted = new Uint8Array(encryptedStr.split('').map(c => c.charCodeAt(0)));
        const iv = new Uint8Array(ivStr.split('').map(c => c.charCodeAt(0)));
        const salt = new Uint8Array(saltStr.split('').map(c => c.charCodeAt(0)));

        // 키 유도
        const key = await deriveKey(password, salt);

        // 데이터 복호화
        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv,
            },
            key,
            encrypted
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
    } catch (error) {
        console.error('복호화 오류:', error);
        throw new Error('복호화에 실패했습니다.');
    }
}

/**
 * 비밀번호 강도 측정
 */
export function measurePasswordStrength(password: string): {
    score: number;
    label: string;
    color: string;
} {
    let score = 0;

    // 길이
    if (password.length >= 6) score += 1;
    if (password.length >= 8) score += 1;
    if (password.length >= 10) score += 1;

    // 숫자 포함
    if (/\d/.test(password)) score += 1;

    // 연속된 숫자 패턴 체크 (약점)
    if (/(\d)\1{2,}/.test(password)) score -= 1; // 같은 숫자 3개 이상
    if (/0123|1234|2345|3456|4567|5678|6789/.test(password)) score -= 1; // 연속된 숫자
    if (/9876|8765|7654|6543|5432|4321|3210/.test(password)) score -= 1; // 역순 연속 숫자

    // 점수 범위 제한
    score = Math.max(0, Math.min(5, score));

    // 레이블 및 색상
    const levels = [
        { label: '매우 약함', color: '#f44336' },
        { label: '약함', color: '#ff9800' },
        { label: '보통', color: '#ffc107' },
        { label: '좋음', color: '#8bc34a' },
        { label: '강함', color: '#4caf50' },
        { label: '매우 강함', color: '#2e7d32' },
    ];

    const level = levels[score];

    return {
        score,
        label: level.label,
        color: level.color,
    };
}
