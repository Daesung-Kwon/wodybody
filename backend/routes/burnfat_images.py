"""
BurnFat — server-side signed URLs for private `inbody` proof images.

Why this exists
  The inbody bucket is private. Until now the browser called
  `supabase.storage.from('inbody').createSignedUrl()` with the anon key, which needs a
  bucket-wide anon SELECT policy on storage.objects — so anyone holding the public anon
  key could list the bucket and sign a URL for ANY participant's image.

  Migration 20261006000003_inbody_storage_narrowing.sql removes that policy. Display URLs
  are signed here instead, with the service key the backend already has
  (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — no new secret), and only after checking the
  image belongs to a participant of the room whose code the caller presented. The room
  code is BurnFat's shared room secret (there is no user login).

Endpoint
  POST /api/burnfat/images/sign
    body: {"code": "ABC234", "paths": ["<participant_uuid>/start-123.jpg", ...]}
    200:  {"urls": {"<path>": "<signed url>", ...}, "expires_in": 3600}
          (paths that are malformed or not in the room are silently omitted)
    400 bad input, 404 unknown room code, 429 rate limited, 5xx Supabase errors.
"""

from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import quote

import requests
from flask import Blueprint, jsonify, request

from routes.burnfat_ai import _get_supabase_config, _rate_limited, _supabase_get

bp = Blueprint("burnfat_images", __name__, url_prefix="/api/burnfat/images")

logger = logging.getLogger(__name__)

BUCKET = "inbody"
SIGNED_URL_TTL_SECONDS = 60 * 60  # 1h — the UI re-requests on demand.
MAX_PATHS_PER_REQUEST = 50
SIGN_RATE_PER_MIN = 60

_CODE_RE = re.compile(r"^[A-Z0-9]{4,16}$")
_PATH_RE = re.compile(
    r"^(?P<pid>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/[A-Za-z0-9_.-]{1,128}$"
)


def _normalize_path(raw: Any) -> str | None:
    if not isinstance(raw, str):
        return None
    path = raw.strip().lstrip("/")
    if ".." in path or not _PATH_RE.match(path):
        return None
    return path


def _room_participant_ids(code: str) -> set[str] | None:
    """Participant ids of the room with this code, or None if the room does not exist."""
    rows = _supabase_get("/rest/v1/challenges", {"code": f"eq.{code}", "select": "id", "limit": "1"})
    if not rows:
        return None
    challenge_id = rows[0].get("id")
    participants = _supabase_get(
        "/rest/v1/participants",
        {"challenge_id": f"eq.{challenge_id}", "select": "id"},
    )
    return {str(p.get("id")) for p in participants if p.get("id")}


def _sign_paths(paths: list[str]) -> dict[str, str]:
    """Batch-sign with the Storage API using the service key. Returns {path: absolute url}."""
    url, key = _get_supabase_config()
    if not url or not key:
        raise RuntimeError("Supabase not configured")
    resp = requests.post(
        f"{url}/storage/v1/object/sign/{quote(BUCKET)}",
        json={"expiresIn": SIGNED_URL_TTL_SECONDS, "paths": paths},
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        timeout=10,
    )
    if not resp.ok:
        logger.error("Storage sign error: status=%s body=%s", resp.status_code, (resp.text or "")[:300])
    resp.raise_for_status()
    out: dict[str, str] = {}
    for item in resp.json() or []:
        signed = item.get("signedURL") or item.get("signedUrl")
        path = item.get("path")
        if not signed or not path or item.get("error"):
            continue
        # Storage returns a path relative to /storage/v1 (e.g. "/object/sign/inbody/..?token=..").
        out[path] = signed if signed.startswith("http") else f"{url}/storage/v1{signed}"
    return out


@bp.route("/sign", methods=["POST", "OPTIONS"])
def sign_images():
    if request.method == "OPTIONS":
        return ("", 204)

    client_key = request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()
    if _rate_limited(f"img-sign:{client_key}", limit=SIGN_RATE_PER_MIN):
        return jsonify({"error": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."}), 429

    body = request.get_json(silent=True) or {}
    code = str(body.get("code") or "").strip().upper()
    raw_paths = body.get("paths")
    if not _CODE_RE.match(code):
        return jsonify({"error": "code required"}), 400
    if not isinstance(raw_paths, list) or not raw_paths or len(raw_paths) > MAX_PATHS_PER_REQUEST:
        return jsonify({"error": f"paths must be a list of 1..{MAX_PATHS_PER_REQUEST}"}), 400

    try:
        member_ids = _room_participant_ids(code)
    except RuntimeError as e:
        logger.error("Supabase config error: %s", e)
        return jsonify({"error": "Supabase not configured"}), 500
    except requests.RequestException as e:
        logger.error("Supabase lookup failed: %s", e)
        return jsonify({"error": "lookup failed"}), 502
    if member_ids is None:
        return jsonify({"error": "challenge not found"}), 404

    allowed: list[str] = []
    for raw in raw_paths:
        path = _normalize_path(raw)
        if not path:
            continue
        match = _PATH_RE.match(path)
        if match and match.group("pid") in member_ids and path not in allowed:
            allowed.append(path)

    if not allowed:
        return jsonify({"urls": {}, "expires_in": SIGNED_URL_TTL_SECONDS}), 200

    try:
        urls = _sign_paths(allowed)
    except RuntimeError as e:
        logger.error("Supabase config error: %s", e)
        return jsonify({"error": "Supabase not configured"}), 500
    except requests.RequestException as e:
        logger.error("Storage sign failed: %s", e)
        return jsonify({"error": "sign failed"}), 502

    return jsonify({"urls": urls, "expires_in": SIGNED_URL_TTL_SECONDS}), 200
