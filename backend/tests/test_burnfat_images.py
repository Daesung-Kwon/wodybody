"""BurnFat server-side image signing (/api/burnfat/images/sign)."""

from unittest.mock import MagicMock, patch

import pytest

from routes import burnfat_ai, burnfat_images

P_A = "aaaaaaaa-1111-0000-0000-000000000001"
P_B = "bbbbbbbb-1111-0000-0000-000000000001"


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://proj.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-key")
    burnfat_ai._advice_hits.clear()
    yield
    burnfat_ai._advice_hits.clear()


def _fake_get(path, params):
    if path == "/rest/v1/challenges":
        return [{"id": "room-a"}] if params["code"] == "eq.ROOMA1" else []
    if path == "/rest/v1/participants":
        assert params["challenge_id"] == "eq.room-a"
        return [{"id": P_A}]
    raise AssertionError(path)


def _sign_response(paths):
    resp = MagicMock()
    resp.ok = True
    resp.json.return_value = [
        {"path": p, "signedURL": f"/object/sign/inbody/{p}?token=t", "error": None} for p in paths
    ]
    resp.raise_for_status.return_value = None
    return resp


def test_signs_only_paths_of_room_members(client):
    with patch.object(burnfat_images, "_supabase_get", side_effect=_fake_get), patch.object(
        burnfat_images.requests, "post", side_effect=lambda url, json, headers, timeout: _sign_response(json["paths"])
    ) as post:
        resp = client.post(
            "/api/burnfat/images/sign",
            json={
                "code": "rooma1",
                "paths": [
                    f"{P_A}/start-1.jpg",
                    f"/{P_A}/end-2.jpg",  # leading slash tolerated
                    f"{P_B}/start-1.jpg",  # other room -> omitted
                    f"{P_A}/../{P_B}/start-1.jpg",  # traversal -> omitted
                    "not-a-path",
                ],
            },
        )
    assert resp.status_code == 200
    data = resp.get_json()
    assert set(data["urls"]) == {f"{P_A}/start-1.jpg", f"{P_A}/end-2.jpg"}
    assert data["urls"][f"{P_A}/start-1.jpg"].startswith(
        "https://proj.supabase.co/storage/v1/object/sign/inbody/"
    )
    assert data["expires_in"] == 3600
    sent = post.call_args.kwargs
    assert sent["headers"]["apikey"] == "service-key"
    assert sent["json"]["paths"] == [f"{P_A}/start-1.jpg", f"{P_A}/end-2.jpg"]


def test_unknown_room_is_404_and_signs_nothing(client):
    with patch.object(burnfat_images, "_supabase_get", side_effect=_fake_get), patch.object(
        burnfat_images.requests, "post"
    ) as post:
        resp = client.post("/api/burnfat/images/sign", json={"code": "NOPE99", "paths": [f"{P_A}/start-1.jpg"]})
    assert resp.status_code == 404
    post.assert_not_called()


def test_no_allowed_paths_returns_empty_without_signing(client):
    with patch.object(burnfat_images, "_supabase_get", side_effect=_fake_get), patch.object(
        burnfat_images.requests, "post"
    ) as post:
        resp = client.post("/api/burnfat/images/sign", json={"code": "ROOMA1", "paths": [f"{P_B}/start-1.jpg"]})
    assert resp.status_code == 200
    assert resp.get_json()["urls"] == {}
    post.assert_not_called()


@pytest.mark.parametrize(
    "body",
    [
        {},
        {"code": "", "paths": ["x"]},
        {"code": "ROOM A!", "paths": [f"{P_A}/a.jpg"]},
        {"code": "ROOMA1"},
        {"code": "ROOMA1", "paths": []},
        {"code": "ROOMA1", "paths": "nope"},
        {"code": "ROOMA1", "paths": [f"{P_A}/a.jpg"] * 51},
    ],
)
def test_bad_input_is_400(client, body):
    with patch.object(burnfat_images, "_supabase_get") as get:
        resp = client.post("/api/burnfat/images/sign", json=body)
    assert resp.status_code == 400
    get.assert_not_called()


def test_rate_limited(client):
    with patch.object(burnfat_images, "_supabase_get", side_effect=_fake_get), patch.object(
        burnfat_images.requests, "post", side_effect=lambda url, json, headers, timeout: _sign_response(json["paths"])
    ):
        codes = [
            client.post("/api/burnfat/images/sign", json={"code": "ROOMA1", "paths": [f"{P_A}/a.jpg"]}).status_code
            for _ in range(burnfat_images.SIGN_RATE_PER_MIN + 1)
        ]
    assert codes[:-1] == [200] * burnfat_images.SIGN_RATE_PER_MIN
    assert codes[-1] == 429
