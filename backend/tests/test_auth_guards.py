"""Regression: auth bypasses must not mint a session."""

from app import app
from utils.token import generate_access_token


def test_user_id_query_does_not_authenticate(client):
    resp = client.get('/api/user/programs?user_id=1')
    assert resp.status_code == 401
    with client.session_transaction() as sess:
        assert 'user_id' not in sess


def test_debug_test_login_absent_outside_development(client):
    resp = client.post('/api/debug/test-login', json={'user_id': 1})
    assert resp.status_code == 404


def test_safari_user_agent_does_not_impersonate(client):
    resp = client.get(
        '/api/users/records',
        headers={'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'},
    )
    assert resp.status_code == 401
    with client.session_transaction() as sess:
        assert 'user_id' not in sess


def test_unsigned_safari_header_does_not_authenticate(client):
    import base64

    token = base64.b64encode(b'tester@example.com').decode('ascii') + '_x_y'
    resp = client.get(
        '/api/user/profile',
        headers={'X-Safari-Auth-Token': token},
    )
    assert resp.status_code == 401


def test_forged_safari_cookie_does_not_authenticate(client):
    client.set_cookie('safari_auth', 'x_1_y')
    resp = client.get('/api/user/profile')
    assert resp.status_code == 401


def test_valid_bearer_profile(client, user_id):
    with app.app_context():
        token = generate_access_token(user_id)
    resp = client.get(
        '/api/user/profile',
        headers={'Authorization': f'Bearer {token}'},
    )
    assert resp.status_code == 200
    body = resp.get_json()
    assert body['email'] == 'tester@example.com'
    assert body['id'] == user_id


def test_invalid_bearer_rejected(client):
    resp = client.get(
        '/api/user/profile',
        headers={'Authorization': 'Bearer not-a-real-token'},
    )
    assert resp.status_code == 401


def test_login_issues_access_token(client):
    resp = client.post('/api/login', json={
        'email': 'tester@example.com',
        'password': 'secret123',
    })
    assert resp.status_code == 200
    body = resp.get_json()
    assert body.get('access_token')
    profile = client.get(
        '/api/user/profile',
        headers={'Authorization': f"Bearer {body['access_token']}"},
    )
    assert profile.status_code == 200
