"""Bearer-first auth for web and Capacitor.

API identity comes from `Authorization: Bearer <access_token>` (itsdangerous).
A session `user_id` set by `/api/login` is accepted as a fallback so existing
web clients keep working, but nothing else may mint a session (no query
params, unsigned headers, or User-Agent shortcuts).
"""

from functools import wraps
from typing import Optional

from flask import jsonify, request, session


def get_current_user_id() -> Optional[int]:
    auth_header = request.headers.get("Authorization") or request.headers.get("authorization")
    if auth_header and isinstance(auth_header, str) and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
        if token:
            try:
                from utils.token import verify_access_token

                user_id = verify_access_token(token)
                if user_id:
                    return int(user_id)
            except (TypeError, ValueError):
                return None
            except Exception:
                pass

    raw = session.get("user_id")
    if raw is None:
        return None
    try:
        return int(raw)
    except (TypeError, ValueError):
        return None


# Back-compat alias used by existing route modules.
get_user_id_from_session_or_cookies = get_current_user_id


def require_auth(fn):
    @wraps(fn)
    def wrapped(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({"message": "Unauthorized", "error": "로그인이 필요합니다"}), 401
        return fn(*args, **kwargs)

    return wrapped
