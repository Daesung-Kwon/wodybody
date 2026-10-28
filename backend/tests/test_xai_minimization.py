"""G4 — xAI 페이로드에서 민감·식별 값을 빼고, 동의 없이는 호출 플래그가 꺼져 있는지."""

from routes.burnfat_ai import _build_user_content
from routes.recommendations import minimize_wod_context
from routes.xai_consent import request_has_xai_consent


def test_burnfat_prompt_omits_nickname_body_fat_weight_and_notes():
    text = _build_user_content(
        {
            "nickname": "홍길동",
            "age": 33,
            "gender": "M",
            "target_body_fat": 18.5,
        },
        [
            {
                "week_no": 1,
                "body_fat_rate": 22.4,
                "weight_kg": 71.2,
                "exercise_count": 3,
                "sleep_hours": 7,
                "diet_quality": "normal",
                "note": "회식에서 이름을 적음",
            }
        ],
        "2026-10-01",
        "2026-10-28",
        user_context="이메일 secret@example.com 과 체지방 22.4",
        advice_style="현실적으로",
        advice_goal="이번 주 전략",
    )
    for forbidden in ("홍길동", "22.4", "18.5", "71.2", "회식", "secret@example.com", "33세", "남성"):
        assert forbidden not in text
    assert "운동 3회" in text
    assert "수면 7h" in text
    assert "식단 정상" in text
    assert "이번 주 전략" in text


def test_wod_context_keeps_difficulty_equipment_records_only():
    minimized = minimize_wod_context(
        {
            "today": "2026-10-28",
            "preferences": {
                "goals": ["홍길동 감량"],
                "equipment": ["barbell"],
                "available_minutes": 20,
                "difficulty": "intermediate",
                "nickname": "홍길동",
            },
            "recent_assignments": [
                {
                    "date": "2026-10-27",
                    "program_id": 4,
                    "completed": True,
                    "skipped": False,
                    "user_feedback": "내 이름은 홍길동",
                    "intensity_hint": "moderate",
                }
            ],
            "recent_assignments_summary": {"completed_count_7d": 1, "skipped_count_7d": 0},
            "recent_records_summary": {
                "count_30d": 1,
                "avg_completion_minutes": 18.0,
                "last_5_records": [
                    {"date": "2026-10-27", "program_id": 4, "completion_minutes": 18.0, "notes": "사진"}
                ],
            },
            "available_programs": [
                {
                    "id": 9,
                    "title": "홍길동 WOD",
                    "difficulty": "intermediate",
                    "expected_minutes": 20,
                    "exercises": [{"name": "홍길동 스쿼트"}],
                }
            ],
        }
    )
    blob = str(minimized)
    assert "홍길동" not in blob
    assert "사진" not in blob
    assert minimized["preferences"]["difficulty"] == "intermediate"
    assert minimized["preferences"]["equipment"] == ["barbell"]
    assert "goals" not in minimized["preferences"]
    assert minimized["recent_assignments"][0]["user_feedback"] is None
    assert minimized["recent_assignments"][0]["completed"] is True
    assert minimized["available_programs"] == [
        {"id": 9, "difficulty": "intermediate", "expected_minutes": 20}
    ]
    assert "title" not in minimized["available_programs"][0]


def test_xai_consent_defaults_off_outside_a_request():
    assert request_has_xai_consent() is False
