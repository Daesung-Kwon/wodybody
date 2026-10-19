"""Live session HTTP API and Socket.IO helpers.

Single-worker assumption
    Leaderboard batching uses an in-process dirty set and one background
    task on the app.py Socket.IO server. That is correct only while gunicorn
    runs with `-w 1` (see backend/start.sh, which this PoC does not change).
    There is no Redis message queue. A second worker would split rooms and
    drop broadcasts. Do not scale this module out without a Socket.IO queue.

Rooms
    Clients join `live_{session_id}` only after the connection's token-verified
    user id is the host or a participant. The payload user id is ignored.

Clock
    `started_at_ms` / tap timestamps are UTC epoch milliseconds.
"""

from __future__ import annotations

import os
from typing import Optional

from flask import Blueprint, current_app, jsonify, request
from flask_socketio import emit, join_room, leave_room
from sqlalchemy import update

from config.database import db
from models.live_session import LiveParticipant, LiveSession, LiveTapEvent
from models.user import Users
from services.live_scoring import Athlete, leaderboards
from utils.auth import get_current_user_id

bp = Blueprint('live', __name__, url_prefix='/api/live')

WORKOUT_TYPES = ('amrap', 'for_time')
DIVISIONS = ('rx', 'scaled')
TAP_KINDS = ('round', 'rep')
MIN_DURATION_SEC = 10
MAX_DURATION_SEC = 7200

# Process-local. Valid for one gunicorn worker only.
_dirty_session_ids: set[int] = set()
_tables_ready = False
_broadcaster_started = False


def server_time_ms() -> int:
    """UTC epoch milliseconds. Not Korea-naive local time."""
    from datetime import datetime, timezone
    return int(datetime.now(timezone.utc).timestamp() * 1000)


def ensure_live_tables() -> None:
    """Create PoC tables if missing. Idempotent. Not a production migration."""
    global _tables_ready
    if _tables_ready:
        return
    LiveSession.__table__.create(db.engine, checkfirst=True)
    LiveParticipant.__table__.create(db.engine, checkfirst=True)
    LiveTapEvent.__table__.create(db.engine, checkfirst=True)
    _tables_ready = True


@bp.before_request
def _before() -> None:
    ensure_live_tables()


def mark_dirty(session_id: int) -> None:
    _dirty_session_ids.add(int(session_id))


def _room(session_id: int) -> str:
    return f'live_{session_id}'


def _emit_room(session_id: int, event: str, payload: dict) -> None:
    from app import socketio
    socketio.emit(event, payload, room=_room(session_id))


def _session_or_404(session_id: int) -> Optional[LiveSession]:
    return db.session.get(LiveSession, session_id)


def _participant(session_id: int, user_id: int) -> Optional[LiveParticipant]:
    return LiveParticipant.query.filter_by(session_id=session_id, user_id=user_id).first()


def _can_view(session: LiveSession, user_id: int) -> bool:
    if session.host_user_id == user_id:
        return True
    return _participant(session.id, user_id) is not None


def _names_for(user_ids: list[int]) -> dict[int, str]:
    if not user_ids:
        return {}
    rows = Users.query.filter(Users.id.in_(user_ids)).all()
    return {row.id: row.name for row in rows}


def _ranked_to_dict(row) -> dict:
    return {
        'rank': row.rank,
        'user_id': row.user_id,
        'name': row.name,
        'division': row.division,
        'rounds': row.rounds,
        'reps': row.reps,
        'finished': row.finished,
        'elapsed_ms': row.elapsed_ms,
        'total_reps': row.total_reps,
    }


def build_leaderboard(session: LiveSession) -> dict:
    participants = LiveParticipant.query.filter_by(session_id=session.id).all()
    names = _names_for([p.user_id for p in participants])
    athletes = [
        Athlete(
            user_id=p.user_id,
            name=names.get(p.user_id, '참가자'),
            division=p.division,
            rounds=p.cumulative_rounds or 0,
            reps=p.cumulative_reps or 0,
            finished_at_ms=p.finished_at_ms,
        )
        for p in participants
        if p.division in DIVISIONS
    ]
    boards = leaderboards(
        athletes,
        workout_type=session.workout_type,
        started_at_ms=session.started_at_ms,
        duration_sec=session.duration_sec,
        reps_per_round=session.reps_per_round,
    )
    return {
        'rx': [_ranked_to_dict(row) for row in boards['rx']],
        'scaled': [_ranked_to_dict(row) for row in boards['scaled']],
    }


def build_view(session: LiveSession, user_id: int) -> dict:
    me_row = _participant(session.id, user_id)
    return {
        'session': {
            'id': session.id,
            'host_user_id': session.host_user_id,
            'title': session.title,
            'workout_type': session.workout_type,
            'duration_sec': session.duration_sec,
            'reps_per_round': session.reps_per_round,
            'started_at_ms': session.started_at_ms,
            'ended_at_ms': session.ended_at_ms,
            'status': session.status,
            'server_time_ms': server_time_ms(),
        },
        'me': {
            'user_id': user_id,
            'is_host': session.host_user_id == user_id,
            'is_participant': me_row is not None,
            'division': me_row.division if me_row else None,
            'cumulative_rounds': me_row.cumulative_rounds if me_row else 0,
            'cumulative_reps': me_row.cumulative_reps if me_row else 0,
            'finished_at_ms': me_row.finished_at_ms if me_row else None,
        },
        'leaderboard': build_leaderboard(session),
    }


def leaderboard_payload(session: LiveSession) -> dict:
    return {
        'session_id': session.id,
        'server_time_ms': server_time_ms(),
        'leaderboard': build_leaderboard(session),
    }


def room_state_payload(session: LiveSession) -> dict:
    """Broadcast shape. No per-user `me` — that would leak the caller's identity into the room."""
    view = build_view(session, session.host_user_id)
    return {
        'session': view['session'],
        'leaderboard': view['leaderboard'],
    }


def flush_dirty_leaderboards() -> int:
    """Emit one snapshot per dirty session. Returns the number of rooms flushed.

    Called about once a second by the background task. Safe to call from tests.
    """
    if not _dirty_session_ids:
        return 0
    session_ids = list(_dirty_session_ids)
    for session_id in session_ids:
        _dirty_session_ids.discard(session_id)
    sent = 0
    for session_id in session_ids:
        session = db.session.get(LiveSession, session_id)
        if session is None:
            continue
        _emit_room(session_id, 'live_leaderboard', leaderboard_payload(session))
        sent += 1
    return sent


def start_leaderboard_broadcaster() -> None:
    """One greenlet. No-op if already started. Do not call under multiple workers."""
    global _broadcaster_started
    if _broadcaster_started or os.environ.get('FLASK_ENV') == 'testing':
        return
    from app import app as flask_app
    from app import socketio

    def _loop() -> None:
        while True:
            socketio.sleep(1.0)
            try:
                with flask_app.app_context():
                    ensure_live_tables()
                    flush_dirty_leaderboards()
            except Exception:
                flask_app.logger.exception('live leaderboard flush failed')

    socketio.start_background_task(_loop)
    _broadcaster_started = True
    flask_app.logger.info('live leaderboard broadcaster started (single worker)')


def _parse_client_ts(data: dict) -> Optional[int]:
    raw = data.get('client_ts_ms')
    if raw is None or raw == '':
        return None
    try:
        value = int(raw)
    except (TypeError, ValueError):
        return None
    if value < 0 or value > 9_000_000_000_000_000:
        return None
    return value


def _window_open(session: LiveSession, now_ms: int) -> bool:
    if session.status != 'live' or session.started_at_ms is None:
        return False
    return now_ms <= session.started_at_ms + session.duration_sec * 1000


@bp.route('/time', methods=['GET'])
def get_server_time():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    return jsonify({'server_time_ms': server_time_ms()}), 200


@bp.route('/sessions', methods=['POST'])
def create_session():
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    data = request.get_json(silent=True) or {}
    workout_type = data.get('workout_type')
    if workout_type not in WORKOUT_TYPES:
        return jsonify({'message': '운동 유형은 amrap 또는 for_time 이어야 합니다'}), 400
    try:
        duration_sec = int(data.get('duration_sec'))
    except (TypeError, ValueError):
        return jsonify({'message': 'duration_sec가 필요합니다'}), 400
    if duration_sec < MIN_DURATION_SEC or duration_sec > MAX_DURATION_SEC:
        return jsonify({'message': f'지속 시간은 {MIN_DURATION_SEC}–{MAX_DURATION_SEC}초입니다'}), 400

    reps_per_round = data.get('reps_per_round')
    if reps_per_round in (None, ''):
        reps_per_round = None
    else:
        try:
            reps_per_round = int(reps_per_round)
        except (TypeError, ValueError):
            return jsonify({'message': 'reps_per_round는 정수여야 합니다'}), 400
        if reps_per_round <= 0 or reps_per_round > 500:
            return jsonify({'message': 'reps_per_round는 1–500입니다'}), 400

    title = (data.get('title') or 'Live WOD').strip() or 'Live WOD'
    if len(title) > 200:
        return jsonify({'message': '제목은 200자 이하입니다'}), 400

    division = data.get('division')
    if division is not None and division not in DIVISIONS:
        return jsonify({'message': '디비전은 rx 또는 scaled 입니다'}), 400

    session = LiveSession(
        host_user_id=user_id,
        title=title[:200],
        workout_type=workout_type,
        duration_sec=duration_sec,
        reps_per_round=reps_per_round,
        status='lobby',
    )
    db.session.add(session)
    db.session.flush()
    if division in DIVISIONS:
        db.session.add(LiveParticipant(
            session_id=session.id,
            user_id=user_id,
            division=division,
            cumulative_rounds=0,
            cumulative_reps=0,
        ))
    db.session.commit()
    current_app.logger.info('live session created id=%s host=%s', session.id, user_id)
    return jsonify(build_view(session, user_id)), 201


@bp.route('/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id: int):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    if not _can_view(session, user_id):
        return jsonify({'message': '이 세션의 호스트이거나 참가자여야 합니다'}), 403
    return jsonify(build_view(session, user_id)), 200


@bp.route('/sessions/<int:session_id>/join', methods=['POST'])
def join_session(session_id: int):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    if session.status == 'ended':
        return jsonify({'message': '이미 종료된 세션입니다'}), 409
    data = request.get_json(silent=True) or {}
    division = data.get('division')
    if division not in DIVISIONS:
        return jsonify({'message': '디비전은 rx 또는 scaled 입니다'}), 400
    existing = _participant(session_id, user_id)
    if existing is None:
        db.session.add(LiveParticipant(
            session_id=session_id,
            user_id=user_id,
            division=division,
            cumulative_rounds=0,
            cumulative_reps=0,
        ))
    elif existing.division != division:
        if session.status != 'lobby':
            return jsonify({'message': '디비전은 시작 전에만 바꿀 수 있습니다'}), 409
        existing.division = division
    db.session.commit()
    mark_dirty(session_id)
    return jsonify(build_view(session, user_id)), 200


@bp.route('/sessions/<int:session_id>/start', methods=['POST'])
def start_session(session_id: int):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    if session.host_user_id != user_id:
        return jsonify({'message': '호스트만 시작할 수 있습니다'}), 403
    if session.status != 'lobby':
        return jsonify({'message': '이미 시작된 세션입니다'}), 409
    now = server_time_ms()
    session.started_at_ms = now
    session.status = 'live'
    db.session.commit()
    view = build_view(session, user_id)
    _emit_room(session_id, 'live_session', room_state_payload(session))
    mark_dirty(session_id)
    current_app.logger.info('live session started id=%s at=%s', session_id, now)
    return jsonify(view), 200


@bp.route('/sessions/<int:session_id>/end', methods=['POST'])
def end_session(session_id: int):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    if session.host_user_id != user_id:
        return jsonify({'message': '호스트만 종료할 수 있습니다'}), 403
    if session.status == 'ended':
        return jsonify(build_view(session, user_id)), 200
    if session.status != 'live':
        return jsonify({'message': '시작 전에 종료할 수 없습니다'}), 409
    now = server_time_ms()
    session.ended_at_ms = now
    session.status = 'ended'
    db.session.commit()
    view = build_view(session, user_id)
    _emit_room(session_id, 'live_session', room_state_payload(session))
    _emit_room(session_id, 'live_leaderboard', leaderboard_payload(session))
    _dirty_session_ids.discard(session_id)
    current_app.logger.info('live session ended id=%s at=%s', session_id, now)
    return jsonify(view), 200


@bp.route('/sessions/<int:session_id>/tap', methods=['POST'])
def tap(session_id: int):
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    participant = _participant(session_id, user_id)
    if participant is None:
        return jsonify({'message': '참가자만 점수를 입력할 수 있습니다'}), 403
    now = server_time_ms()
    if not _window_open(session, now):
        return jsonify({'message': '진행 중인 세션에서만 입력할 수 있습니다'}), 409
    if session.workout_type == 'for_time' and participant.finished_at_ms is not None:
        return jsonify({'message': '완료한 뒤에는 점수를 더할 수 없습니다'}), 409

    data = request.get_json(silent=True) or {}
    kind = data.get('kind') or 'round'
    if kind not in TAP_KINDS:
        return jsonify({'message': 'kind는 round 또는 rep 입니다'}), 400
    client_ts = _parse_client_ts(data)

    column = LiveParticipant.cumulative_rounds if kind == 'round' else LiveParticipant.cumulative_reps
    db.session.execute(
        update(LiveParticipant)
        .where(LiveParticipant.id == participant.id)
        .values({column: column + 1})
    )
    db.session.flush()
    db.session.refresh(participant)
    db.session.add(LiveTapEvent(
        session_id=session_id,
        user_id=user_id,
        kind=kind,
        cumulative_rounds=participant.cumulative_rounds,
        cumulative_reps=participant.cumulative_reps,
        server_ts_ms=now,
        client_ts_ms=client_ts,
    ))
    db.session.commit()
    mark_dirty(session_id)
    return jsonify(build_view(session, user_id)), 200


@bp.route('/sessions/<int:session_id>/finish', methods=['POST'])
def finish(session_id: int):
    """For Time only. Records the server timestamp if it is inside the cap."""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'message': '로그인이 필요합니다'}), 401
    session = _session_or_404(session_id)
    if session is None:
        return jsonify({'message': '세션을 찾을 수 없습니다'}), 404
    if session.workout_type != 'for_time':
        return jsonify({'message': 'For Time 세션에서만 완료할 수 있습니다'}), 409
    participant = _participant(session_id, user_id)
    if participant is None:
        return jsonify({'message': '참가자만 완료할 수 있습니다'}), 403
    now = server_time_ms()
    if not _window_open(session, now):
        return jsonify({'message': '제한 시간 안에만 완료할 수 있습니다'}), 409
    if participant.finished_at_ms is None:
        participant.finished_at_ms = now
        db.session.commit()
        mark_dirty(session_id)
    return jsonify(build_view(session, user_id)), 200


def on_live_join(user_id: Optional[int], data: dict) -> None:
    """Socket handler. `user_id` comes from the verified connect token, not the payload."""
    ensure_live_tables()
    if not user_id:
        emit('live_error', {'message': '로그인이 필요합니다'})
        return
    if not isinstance(data, dict):
        emit('live_error', {'message': '세션이 필요합니다'})
        return
    try:
        session_id = int(data.get('session_id'))
    except (TypeError, ValueError):
        emit('live_error', {'message': '세션이 필요합니다'})
        return
    session = _session_or_404(session_id)
    if session is None or not _can_view(session, user_id):
        emit('live_error', {'message': '이 세션에 들어갈 수 없습니다'})
        return
    join_room(_room(session_id))
    emit('live_state', build_view(session, user_id))


def on_live_leave(user_id: Optional[int], data: dict) -> None:
    if not user_id or not isinstance(data, dict):
        return
    try:
        session_id = int(data.get('session_id'))
    except (TypeError, ValueError):
        return
    leave_room(_room(session_id))


def on_live_time_sync(user_id: Optional[int]) -> dict:
    """Ack payload so the client can take an NTP sample over the socket."""
    if not user_id:
        return {'message': '로그인이 필요합니다'}
    return {'server_time_ms': server_time_ms()}
