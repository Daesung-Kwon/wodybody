"""Development-only debug routes. Never registered in production."""

from flask import Blueprint, jsonify, request, session

bp = Blueprint("debug", __name__, url_prefix="/api")


@bp.route("/debug/test-login", methods=["POST"])
def debug_test_login():
    data = request.get_json(silent=True) or {}
    test_user_id = data.get("user_id", 1)
    session["user_id"] = test_user_id
    session.permanent = True
    return jsonify({
        "message": "Test login successful",
        "user_id": test_user_id,
        "session": dict(session),
    }), 200


@bp.route("/debug/session", methods=["GET"])
def debug_session():
    from utils.auth import get_current_user_id

    return jsonify({
        "session": dict(session),
        "cookies": dict(request.cookies),
        "headers": {
            k: v for k, v in request.headers.items()
            if k.startswith("X-") or k in ["User-Agent", "Authorization"]
        },
        "user_id": get_current_user_id(),
    }), 200


@bp.route("/safari-auth", methods=["GET"])
def safari_auth():
    from utils.auth import get_current_user_id

    return jsonify({
        "user_id": get_current_user_id(),
        "session": dict(session),
        "cookies": dict(request.cookies),
        "user_agent": request.headers.get("User-Agent"),
    }), 200


@bp.route("/test", methods=["GET"])
def test():
    from datetime import datetime

    return jsonify({"message": "Test successful", "timestamp": datetime.utcnow().isoformat()}), 200


@bp.route("/test-params", methods=["GET"])
def test_params():
    return jsonify({
        "user_id": request.args.get("user_id"),
        "query_string": request.query_string.decode("utf-8"),
        "all_args": dict(request.args),
    }), 200


@bp.route("/test-headers", methods=["GET"])
def test_headers():
    return jsonify({
        "headers": dict(request.headers),
        "safari_headers": {k: v for k, v in request.headers.items() if "safari" in k.lower()},
    }), 200
