"""
보안 키패드 백엔드 복호화 유틸리티

프론트엔드에서 AES-256-GCM으로 암호화된 데이터를 복호화하는 모듈
"""

import json
import base64
import time
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
from cryptography.hazmat.backends import default_backend


def base64_decode(encoded_str: str) -> bytes:
    """Base64 문자열을 디코딩"""
    return base64.b64decode(encoded_str)


def derive_key_from_password(password: str, salt: bytes, iterations: int = 100000) -> bytes:
    """
    PBKDF2를 사용하여 비밀번호로부터 암호화 키 유도
    
    Args:
        password: 비밀번호
        salt: 솔트 (16 bytes)
        iterations: 반복 횟수 (기본 100,000)
        
    Returns:
        32 bytes 암호화 키
    """
    kdf = PBKDF2(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
        backend=default_backend()
    )
    key = kdf.derive(password.encode('utf-8'))
    return key


def decrypt_secure_packet(packet_json: str, encryption_key: str, max_age_seconds: int = 300) -> dict:
    """
    프론트엔드에서 전송된 보안 패킷을 복호화
    
    Args:
        packet_json: JSON 문자열 형태의 보안 패킷
        encryption_key: 암호화 키 (프론트엔드와 동일한 키)
        max_age_seconds: 최대 허용 시간 (초, 기본 5분)
        
    Returns:
        복호화된 데이터 딕셔너리
        
    Raises:
        ValueError: 패킷 검증 실패 시
    """
    try:
        # JSON 파싱
        packet = json.loads(packet_json)
        
        # 필수 필드 확인
        required_fields = ['encrypted', 'iv', 'timestamp', 'nonce']
        for field in required_fields:
            if field not in packet:
                raise ValueError(f"Missing required field: {field}")
        
        # 타임스탬프 검증 (재전송 공격 방지)
        current_time = int(time.time() * 1000)
        packet_time = packet['timestamp']
        age = current_time - packet_time
        
        if age > max_age_seconds * 1000:
            raise ValueError(f"Packet expired. Age: {age}ms, Max: {max_age_seconds * 1000}ms")
        
        if age < -60000:  # 1분 이상 미래
            raise ValueError("Packet timestamp is in the future")
        
        # IV와 Salt 분리
        iv_with_salt = packet['iv']
        iv_base64, salt_base64 = iv_with_salt.split(':')
        
        # Base64 디코딩
        encrypted_bytes = base64.b64decode(packet['encrypted'])
        iv_bytes = base64.b64decode(iv_base64)
        salt_bytes = base64.b64decode(salt_base64)
        
        # 키 유도
        key = derive_key_from_password(encryption_key, salt_bytes)
        
        # AES-GCM 복호화
        aesgcm = AESGCM(key)
        decrypted_bytes = aesgcm.decrypt(iv_bytes, encrypted_bytes, None)
        
        # JSON 파싱
        decrypted_str = decrypted_bytes.decode('utf-8')
        decrypted_data = json.loads(decrypted_str)
        
        # Nonce 검증 (무결성 확인)
        if decrypted_data.get('nonce') != packet['nonce']:
            raise ValueError("Nonce mismatch - data integrity check failed")
        
        # 타임스탬프 재검증
        if decrypted_data.get('timestamp') != packet['timestamp']:
            raise ValueError("Timestamp mismatch - data integrity check failed")
        
        return {
            'success': True,
            'value': decrypted_data.get('value'),
            'timestamp': packet['timestamp'],
            'age_ms': age
        }
        
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {str(e)}")
    except Exception as e:
        raise ValueError(f"Decryption failed: {str(e)}")


def decrypt_simple_xor(encrypted_base64: str, key: str) -> str:
    """
    간단한 XOR 복호화 (데모/테스트용)
    
    Args:
        encrypted_base64: Base64로 인코딩된 암호문
        key: 암호화 키
        
    Returns:
        복호화된 평문
    """
    try:
        # Base64 디코딩
        encrypted = base64.b64decode(encrypted_base64)
        
        # XOR 복호화
        result = ''
        for i, byte in enumerate(encrypted):
            key_byte = ord(key[i % len(key)])
            result += chr(byte ^ key_byte)
        
        return result
        
    except Exception as e:
        raise ValueError(f"XOR decryption failed: {str(e)}")


# ============================================
# Flask 라우트 예제
# ============================================

def example_flask_route():
    """
    Flask에서 사용하는 예제 코드
    """
    from flask import request, jsonify
    
    # 공유 암호화 키 (환경변수나 시크릿 관리 시스템에서 가져와야 함)
    ENCRYPTION_KEY = "your-secure-encryption-key-here"
    
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
                decrypted = decrypt_secure_packet(secure_packet, ENCRYPTION_KEY)
                password = decrypted['value']
                
                print(f"[Security] Packet age: {decrypted['age_ms']}ms")
                
            except ValueError as e:
                print(f"[Security] Decryption failed: {str(e)}")
                return jsonify({'error': 'Invalid secure data'}), 400
            
            # 사용자 인증 (기존 로직)
            user = authenticate_user(email, password)
            if not user:
                return jsonify({'error': '이메일 또는 비밀번호가 올바르지 않습니다'}), 401
            
            # JWT 토큰 생성
            token = generate_jwt_token(user)
            
            return jsonify({
                'message': '로그인 성공',
                'token': token,
                'user_id': user.id,
                'name': user.name
            }), 200
            
        except Exception as e:
            print(f"[Error] Login failed: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500


# ============================================
# 사용 예제
# ============================================

if __name__ == '__main__':
    # 예제 1: 보안 패킷 복호화
    print("=" * 50)
    print("예제 1: 보안 패킷 복호화")
    print("=" * 50)
    
    # 프론트엔드에서 전송된 패킷 (실제로는 request.body에서 받음)
    sample_packet = '''{
        "encrypted": "base64_encrypted_data_here",
        "iv": "base64_iv_here:base64_salt_here",
        "timestamp": 1697234567890,
        "nonce": "random_nonce_16"
    }'''
    
    encryption_key = "shared-secret-key-between-frontend-and-backend"
    
    try:
        result = decrypt_secure_packet(sample_packet, encryption_key)
        print(f"✅ 복호화 성공!")
        print(f"   - 값: {result['value']}")
        print(f"   - 패킷 나이: {result['age_ms']}ms")
    except ValueError as e:
        print(f"❌ 복호화 실패: {str(e)}")
    
    print()
    
    # 예제 2: 간단한 XOR 복호화
    print("=" * 50)
    print("예제 2: XOR 복호화 (데모용)")
    print("=" * 50)
    
    xor_encrypted = "base64_xor_encrypted_here"
    xor_key = "simple-key"
    
    try:
        decrypted = decrypt_simple_xor(xor_encrypted, xor_key)
        print(f"✅ 복호화 성공: {decrypted}")
    except ValueError as e:
        print(f"❌ 복호화 실패: {str(e)}")

