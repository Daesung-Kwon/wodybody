"""Live session HTTP and Socket.IO access rules."""

from app import app, socketio
from config.database import db
from models.live_session import LiveTapEvent
from models.user import Users
from routes.live import _dirty_session_ids, flush_dirty_leaderboards
from utils.token import generate_access_token


def _auth(user_id):
    with app.app_context():
        token = generate_access_token(user_id)
    return {'Authorization': f'Bearer {token}'}, token


def _make_user(email, name):
    with app.app_context():
        user = Users(email=email, name=name)
        user.set_password('secret123')
        db.session.add(user)
        db.session.commit()
        return user.id


def _create(client, headers, **extra):
    body = {
        'title': 'Open test',
        'workout_type': 'amrap',
        'duration_sec': 600,
        'reps_per_round': 10,
        'division': 'rx',
    }
    body.update(extra)
    return client.post('/api/live/sessions', json=body, headers=headers)


def test_time_requires_auth_and_returns_epoch_ms(client, user_id):
    assert client.get('/api/live/time').status_code == 401
    headers, _token = _auth(user_id)
    resp = client.get('/api/live/time', headers=headers)
    assert resp.status_code == 200
    assert resp.get_json()['server_time_ms'] > 1_700_000_000_000


def test_host_only_start_end_and_round_tap_log(client, user_id):
    host_headers, _host_token = _auth(user_id)
    other_id = _make_user('other@example.com', 'Other')
    other_headers, _other_token = _auth(other_id)

    created = _create(client, host_headers)
    assert created.status_code == 201
    session_id = created.get_json()['session']['id']
    assert created.get_json()['session']['started_at_ms'] is None
    assert created.get_json()['me']['is_host'] is True

    assert client.post(f'/api/live/sessions/{session_id}/start', headers=other_headers).status_code == 403
    assert client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'round', 'client_ts_ms': 111},
        headers=host_headers,
    ).status_code == 409

    started = client.post(f'/api/live/sessions/{session_id}/start', headers=host_headers)
    assert started.status_code == 200
    started_at = started.get_json()['session']['started_at_ms']
    assert started.get_json()['session']['status'] == 'live'
    assert started_at > 0

    stranger = client.post(f'/api/live/sessions/{session_id}/join', json={'division': 'elite'}, headers=other_headers)
    assert stranger.status_code == 400
    joined = client.post(f'/api/live/sessions/{session_id}/join', json={'division': 'scaled'}, headers=other_headers)
    assert joined.status_code == 200
    assert joined.get_json()['me']['division'] == 'scaled'

    first = client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'round', 'client_ts_ms': 1_700_000_000_000},
        headers=host_headers,
    )
    assert first.status_code == 200
    assert first.get_json()['me']['cumulative_rounds'] == 1
    second = client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'client_ts_ms': 1_700_000_000_100},
        headers=host_headers,
    )
    assert second.status_code == 200
    assert second.get_json()['me']['cumulative_rounds'] == 2

    rep = client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'rep', 'client_ts_ms': 1_700_000_000_200},
        headers=other_headers,
    )
    assert rep.status_code == 200
    board = rep.get_json()['leaderboard']
    assert [row['user_id'] for row in board['rx']] == [user_id]
    assert board['rx'][0]['rounds'] == 2
    assert [row['user_id'] for row in board['scaled']] == [other_id]
    assert board['scaled'][0]['reps'] == 1
    assert board['scaled'][0]['rounds'] == 0

    with app.app_context():
        events = LiveTapEvent.query.filter_by(session_id=session_id, user_id=user_id).order_by(LiveTapEvent.id).all()
        assert [e.cumulative_rounds for e in events] == [1, 2]
        assert events[0].client_ts_ms == 1_700_000_000_000
        assert events[0].server_ts_ms >= started_at
        assert events[1].kind == 'round'

    assert client.post(f'/api/live/sessions/{session_id}/end', headers=other_headers).status_code == 403
    ended = client.post(f'/api/live/sessions/{session_id}/end', headers=host_headers)
    assert ended.status_code == 200
    assert ended.get_json()['session']['status'] == 'ended'
    assert client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'round'},
        headers=host_headers,
    ).status_code == 409


def test_for_time_finish_sets_server_timestamp(client, user_id):
    headers, _token = _auth(user_id)
    created = _create(client, headers, workout_type='for_time', division='rx')
    session_id = created.get_json()['session']['id']
    assert client.post(f'/api/live/sessions/{session_id}/finish', headers=headers).status_code == 409
    client.post(f'/api/live/sessions/{session_id}/start', headers=headers)
    done = client.post(f'/api/live/sessions/{session_id}/finish', headers=headers)
    assert done.status_code == 200
    finished_at = done.get_json()['me']['finished_at_ms']
    started_at = done.get_json()['session']['started_at_ms']
    assert finished_at >= started_at
    assert done.get_json()['leaderboard']['rx'][0]['finished'] is True
    again = client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'round'},
        headers=headers,
    )
    assert again.status_code == 409


def test_socket_join_uses_token_user_and_flush_is_split(client, user_id):
    host_headers, host_token = _auth(user_id)
    other_id = _make_user('stranger@example.com', 'Stranger')
    _other_headers, other_token = _auth(other_id)
    created = _create(client, host_headers)
    session_id = created.get_json()['session']['id']
    client.post(f'/api/live/sessions/{session_id}/start', headers=host_headers)
    _dirty_session_ids.clear()
    client.post(
        f'/api/live/sessions/{session_id}/tap',
        json={'kind': 'round', 'client_ts_ms': 5},
        headers=host_headers,
    )

    host_sock = socketio.test_client(app, flask_test_client=client, auth={'token': host_token})
    assert host_sock.is_connected()
    host_sock.emit('live_join', {'session_id': session_id, 'user_id': other_id})
    host_received = host_sock.get_received()
    assert any(event['name'] == 'live_state' for event in host_received)
    state = next(event for event in host_received if event['name'] == 'live_state')
    assert state['args'][0]['me']['is_host'] is True
    assert state['args'][0]['me']['cumulative_rounds'] == 1

    stranger = socketio.test_client(app, flask_test_client=client, auth={'token': other_token})
    assert stranger.is_connected()
    stranger.emit('live_join', {'session_id': session_id, 'user_id': user_id})
    stranger_received = stranger.get_received()
    assert any(event['name'] == 'live_error' for event in stranger_received)
    assert not any(event['name'] == 'live_state' for event in stranger_received)

    flushed = flush_dirty_leaderboards()
    assert flushed == 1
    host_after = host_sock.get_received()
    boards = [event for event in host_after if event['name'] == 'live_leaderboard']
    assert boards
    payload = boards[-1]['args'][0]
    assert [row['user_id'] for row in payload['leaderboard']['rx']] == [user_id]
    assert payload['leaderboard']['scaled'] == []
    stranger_after = stranger.get_received()
    assert not any(event['name'] == 'live_leaderboard' for event in stranger_after)

    ack = host_sock.emit('live_time_sync', {}, callback=True)
    assert ack['server_time_ms'] > 1_700_000_000_000

    host_sock.disconnect()
    stranger.disconnect()
