from datetime import timedelta, datetime
from typing import Optional

from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from flask import current_app


def _get_serializer() -> URLSafeTimedSerializer:
    secret_key = current_app.config.get('SECRET_KEY')
    return URLSafeTimedSerializer(secret_key, salt='auth-token')


def generate_access_token(user_id: int, expires: timedelta = timedelta(hours=24)) -> str:
    # itsdangerous timed serializer encodes issue time and enforces max_age on loads
    s = _get_serializer()
    payload = {
        'sub': int(user_id),
        'iat': int(datetime.utcnow().timestamp()),
    }
    return s.dumps(payload)


def verify_access_token(token: str, max_age: int = 60 * 60 * 24) -> Optional[int]:
    s = _get_serializer()
    try:
        data = s.loads(token, max_age=max_age)
        user_id = int(data.get('sub'))
        return user_id
    except SignatureExpired:
        current_app.logger.info('access token expired')
        return None
    except BadSignature:
        current_app.logger.info('access token invalid signature')
        return None
    except Exception as e:
        current_app.logger.warning(f'access token verify error: {e}')
        return None


