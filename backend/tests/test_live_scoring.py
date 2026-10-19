"""Open-style ranking. Divisions are never mixed."""

from services.live_scoring import Athlete, leaderboards, rank_division


def _athlete(user_id, division='rx', rounds=0, reps=0, finished_at_ms=None, name=None):
    return Athlete(
        user_id=user_id,
        name=name or f'A{user_id}',
        division=division,
        rounds=rounds,
        reps=reps,
        finished_at_ms=finished_at_ms,
    )


def test_amrap_orders_rounds_then_reps_and_ties():
    rows = rank_division(
        [
            _athlete(1, rounds=5, reps=10),
            _athlete(2, rounds=5, reps=10),
            _athlete(3, rounds=5, reps=9),
            _athlete(4, rounds=4, reps=20),
        ],
        workout_type='amrap',
        started_at_ms=0,
        duration_sec=600,
        reps_per_round=15,
    )
    assert [(r.user_id, r.rank, r.rounds, r.reps) for r in rows] == [
        (1, 1, 5, 10),
        (2, 1, 5, 10),
        (3, 3, 5, 9),
        (4, 4, 4, 20),
    ]
    assert all(r.finished is False for r in rows)
    assert rows[0].total_reps == 5 * 15 + 10


def test_for_time_cap_finishers_before_reps_and_ties():
    """Cap is 600s. A finish at the cap counts. One millisecond later does not."""
    started = 1_000_000
    duration = 600
    rows = rank_division(
        [
            # Finishers. A has almost no work but a faster time, so A still beats F.
            _athlete(1, rounds=0, reps=0, finished_at_ms=started + 480_000),
            _athlete(2, rounds=9, reps=0, finished_at_ms=started + 480_000),
            _athlete(3, rounds=8, reps=0, finished_at_ms=started + 590_000),
            _athlete(4, rounds=7, reps=0, finished_at_ms=started + 600_000),
            # After the cap: treated as a non-finisher even though finished_at is set.
            _athlete(5, rounds=8, reps=0, finished_at_ms=started + 600_001),
            _athlete(6, rounds=9, reps=0, finished_at_ms=None),
            _athlete(7, rounds=9, reps=0, finished_at_ms=None),
            _athlete(8, rounds=3, reps=5, finished_at_ms=None),
        ],
        workout_type='for_time',
        started_at_ms=started,
        duration_sec=duration,
        reps_per_round=10,
    )
    # total reps: 5 → 80, 6 and 7 → 90, 8 → 35. Finishers occupy ranks 1..4.
    assert [(r.user_id, r.rank, r.finished, r.elapsed_ms) for r in rows] == [
        (1, 1, True, 480_000),
        (2, 1, True, 480_000),
        (3, 3, True, 590_000),
        (4, 4, True, 600_000),
        (6, 5, False, None),
        (7, 5, False, None),
        (5, 7, False, None),
        (8, 8, False, None),
    ]
    assert rows[4].total_reps == 90
    assert rows[6].total_reps == 80
    assert rows[7].total_reps == 35


def test_for_time_without_round_size_ranks_non_finishers_by_rounds_then_reps():
    rows = rank_division(
        [
            _athlete(1, rounds=1, reps=9, finished_at_ms=None),
            _athlete(2, rounds=2, reps=0, finished_at_ms=None),
        ],
        workout_type='for_time',
        started_at_ms=0,
        duration_sec=60,
        reps_per_round=None,
    )
    assert [r.user_id for r in rows] == [2, 1]
    assert rows[0].total_reps is None


def test_divisions_are_separate_boards_with_no_conversion():
    boards = leaderboards(
        [
            _athlete(1, division='rx', rounds=1, reps=0),
            _athlete(2, division='scaled', rounds=99, reps=50),
            _athlete(3, division='rx', rounds=1, reps=0),
        ],
        workout_type='amrap',
        started_at_ms=None,
        duration_sec=600,
        reps_per_round=None,
    )
    assert [r.user_id for r in boards['rx']] == [1, 3]
    assert [r.rank for r in boards['rx']] == [1, 1]
    assert [r.user_id for r in boards['scaled']] == [2]
    assert boards['scaled'][0].rank == 1
    assert boards['scaled'][0].rounds == 99
    rx_ids = {r.user_id for r in boards['rx']}
    scaled_ids = {r.user_id for r in boards['scaled']}
    assert rx_ids.isdisjoint(scaled_ids)


def test_unknown_workout_type_is_rejected():
    try:
        rank_division([], workout_type='emom', started_at_ms=0, duration_sec=60, reps_per_round=None)
    except ValueError as exc:
        assert 'emom' in str(exc)
    else:
        raise AssertionError('expected ValueError')
