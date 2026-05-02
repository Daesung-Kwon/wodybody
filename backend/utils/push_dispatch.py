"""APNs(HTTP/2) + FCM(HTTP v1) 디스패처.

이 모듈은 자격증명이 없으면 **WARN 로그 후 no-op**으로 동작한다(앱 크래시 금지).
실제 발송 코드는 외부 라이브러리 의존을 최소화하기 위해 표준 ``requests``만 사용한다.

필요 환경변수:

APNs:
- ``APNS_KEY_P8`` (PKCS#8 .p8 파일 본문 또는 base64). 비어 있으면 비활성.
- ``APNS_KEY_ID`` (10-char Key ID)
- ``APNS_TEAM_ID`` (10-char Team ID)
- ``APNS_BUNDLE_ID`` (e.g. com.wodybody.app)
- ``APNS_USE_SANDBOX`` ("true"면 api.sandbox.push.apple.com)

FCM v1:
- ``FCM_SERVICE_ACCOUNT_JSON`` (서비스 계정 JSON 본문)
- ``FCM_PROJECT_ID``
"""

from __future__ import annotations

import base64
import json
import logging
import os
import time
from typing import Any, Iterable

import requests


logger = logging.getLogger(__name__)


# --------------------------------------------------------------------
# 공용 페이로드 빌더
# --------------------------------------------------------------------


def build_payload(title: str, body: str, *, deeplink: str | None = None,
                  data_extra: dict[str, Any] | None = None) -> dict[str, Any]:
    data = dict(data_extra or {})
    if deeplink:
        data['deeplink'] = deeplink
    return {
        'title': title,
        'body': body,
        'data': data,
    }


# --------------------------------------------------------------------
# APNs (HTTP/2)
# --------------------------------------------------------------------


def _apns_jwt() -> str | None:
    """APNs용 JWT를 생성. PyJWT 미설치 시 None 반환."""
    try:
        import jwt  # type: ignore
    except Exception:
        logger.warning('PyJWT 미설치 — APNs JWT 생성 불가. requirements.txt에 PyJWT 추가 필요.')
        return None

    p8_raw = os.environ.get('APNS_KEY_P8') or ''
    key_id = os.environ.get('APNS_KEY_ID') or ''
    team_id = os.environ.get('APNS_TEAM_ID') or ''
    if not (p8_raw and key_id and team_id):
        return None

    # 본문 또는 base64 인지 휴리스틱 처리
    if 'BEGIN PRIVATE KEY' not in p8_raw:
        try:
            p8_raw = base64.b64decode(p8_raw).decode('utf-8')
        except Exception:
            logger.warning('APNS_KEY_P8 디코드 실패')
            return None

    now = int(time.time())
    payload = {'iss': team_id, 'iat': now}
    headers = {'alg': 'ES256', 'kid': key_id}
    try:
        return jwt.encode(payload, p8_raw, algorithm='ES256', headers=headers)
    except Exception as e:
        logger.warning('APNs JWT 인코딩 실패: %s', e)
        return None


def _apns_send(token: str, payload: dict[str, Any]) -> tuple[bool, str]:
    bundle_id = os.environ.get('APNS_BUNDLE_ID') or ''
    if not bundle_id:
        return False, 'APNS_BUNDLE_ID not set'

    jwt_token = _apns_jwt()
    if jwt_token is None:
        return False, 'apns credentials missing'

    sandbox = (os.environ.get('APNS_USE_SANDBOX') or 'false').lower() == 'true'
    host = 'api.sandbox.push.apple.com' if sandbox else 'api.push.apple.com'
    url = f'https://{host}/3/device/{token}'

    aps_payload = {
        'aps': {
            'alert': {
                'title': payload.get('title') or '',
                'body': payload.get('body') or '',
            },
            'sound': 'default',
            'badge': 1,
        },
        'wodybody': payload.get('data') or {},
    }
    headers = {
        'authorization': f'bearer {jwt_token}',
        'apns-topic': bundle_id,
        'apns-push-type': 'alert',
        'content-type': 'application/json',
    }
    try:
        # NOTE: requests는 HTTP/1.1만 지원 — APNs는 HTTP/2가 표준이지만 일부 게이트웨이가 1.1도 허용.
        # 운영에서는 hyper / httpx[h2]로 교체 권장. 여기선 의존성 최소화를 위해 requests로 시도.
        resp = requests.post(url, headers=headers, data=json.dumps(aps_payload), timeout=10)
        if resp.status_code == 200:
            return True, 'ok'
        return False, f'apns status={resp.status_code} body={resp.text[:200]}'
    except requests.RequestException as e:
        return False, f'apns request failed: {e}'


# --------------------------------------------------------------------
# FCM v1
# --------------------------------------------------------------------


def _fcm_access_token() -> tuple[str | None, str | None]:
    """서비스 계정 JSON으로 OAuth2 토큰 획득. (token, project_id)."""
    sa_json = os.environ.get('FCM_SERVICE_ACCOUNT_JSON') or ''
    if not sa_json:
        return None, None
    try:
        data = json.loads(sa_json)
    except Exception:
        try:
            data = json.loads(base64.b64decode(sa_json).decode('utf-8'))
        except Exception:
            logger.warning('FCM_SERVICE_ACCOUNT_JSON 파싱 실패')
            return None, None

    project_id = data.get('project_id') or os.environ.get('FCM_PROJECT_ID')
    if not project_id:
        return None, None

    try:
        # google-auth가 있을 때만 사용. 없으면 비활성.
        from google.oauth2 import service_account  # type: ignore
        from google.auth.transport.requests import Request  # type: ignore
    except Exception:
        logger.warning('google-auth 미설치 — FCM 발송 불가. requirements.txt에 google-auth 추가 필요.')
        return None, project_id

    try:
        creds = service_account.Credentials.from_service_account_info(
            data, scopes=['https://www.googleapis.com/auth/firebase.messaging']
        )
        creds.refresh(Request())
        return creds.token, project_id
    except Exception as e:
        logger.warning('FCM 액세스 토큰 획득 실패: %s', e)
        return None, project_id


def _fcm_send(token: str, payload: dict[str, Any]) -> tuple[bool, str]:
    access_token, project_id = _fcm_access_token()
    if not access_token or not project_id:
        return False, 'fcm credentials missing'

    url = f'https://fcm.googleapis.com/v1/projects/{project_id}/messages:send'
    msg = {
        'message': {
            'token': token,
            'notification': {
                'title': payload.get('title') or '',
                'body': payload.get('body') or '',
            },
            'data': {k: str(v) for k, v in (payload.get('data') or {}).items()},
        }
    }
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json; UTF-8',
    }
    try:
        resp = requests.post(url, headers=headers, data=json.dumps(msg), timeout=10)
        if resp.status_code == 200:
            return True, 'ok'
        return False, f'fcm status={resp.status_code} body={resp.text[:200]}'
    except requests.RequestException as e:
        return False, f'fcm request failed: {e}'


# --------------------------------------------------------------------
# 디스패치
# --------------------------------------------------------------------


def is_configured() -> dict[str, bool]:
    return {
        'apns': bool(
            os.environ.get('APNS_KEY_P8')
            and os.environ.get('APNS_KEY_ID')
            and os.environ.get('APNS_TEAM_ID')
            and os.environ.get('APNS_BUNDLE_ID')
        ),
        'fcm': bool(os.environ.get('FCM_SERVICE_ACCOUNT_JSON')),
    }


def send_to_tokens(tokens: Iterable[Any], title: str, body: str,
                   *, deeplink: str | None = None,
                   data_extra: dict[str, Any] | None = None) -> dict[str, int]:
    """tokens: list[PushTokens] | list[dict{platform, token}]. 자격증명이 없으면 no-op + WARN."""
    payload = build_payload(title, body, deeplink=deeplink, data_extra=data_extra)
    config = is_configured()

    counts = {'ios_sent': 0, 'ios_failed': 0, 'android_sent': 0, 'android_failed': 0, 'skipped': 0}
    for t in tokens:
        platform = getattr(t, 'platform', None) or (t.get('platform') if isinstance(t, dict) else None)
        token = getattr(t, 'token', None) or (t.get('token') if isinstance(t, dict) else None)
        if not platform or not token:
            counts['skipped'] += 1
            continue

        platform = platform.lower()
        if platform == 'ios':
            if not config['apns']:
                counts['skipped'] += 1
                continue
            ok, msg = _apns_send(token, payload)
            if ok:
                counts['ios_sent'] += 1
            else:
                counts['ios_failed'] += 1
                logger.warning('APNs send failed: %s', msg)
        elif platform == 'android':
            if not config['fcm']:
                counts['skipped'] += 1
                continue
            ok, msg = _fcm_send(token, payload)
            if ok:
                counts['android_sent'] += 1
            else:
                counts['android_failed'] += 1
                logger.warning('FCM send failed: %s', msg)
        else:
            counts['skipped'] += 1
    return counts
