"""G4 — xAI 국외 이전 옵트인 검사.

기본값은 꺼짐. 요청 본문 ``xai_transfer_consent`` 또는 헤더
``X-Xai-Transfer-Consent: true`` 가 있을 때만 참이다.
요청 컨텍스트가 없으면(스케줄러 등) 항상 거짓이다.
DB 컬럼은 만들지 않는다. 이 플래그는 실수 호출을 막는 게이트이며,
클라이언트가 값을 바꿀 수 있으므로 영속 서버 동의 기록을 대체하지 않는다.
"""

from __future__ import annotations

_TRUE = {"1", "true", "yes"}


def _flag_true(value: object) -> bool:
    if value is True:
        return True
    if isinstance(value, str) and value.strip().lower() in _TRUE:
        return True
    return False


def request_has_xai_consent() -> bool:
    from flask import has_request_context, request

    if not has_request_context():
        return False
    header = (request.headers.get("X-Xai-Transfer-Consent") or "").strip().lower()
    if header in _TRUE:
        return True
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        return False
    return _flag_true(body.get("xai_transfer_consent"))
