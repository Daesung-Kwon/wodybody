"""CrossFit Open-style ranking for a single division.

AMRAP
    Sort by completed rounds, then reps into the next round (both descending).
    The same (rounds, reps) is a tie. Time is not a tie-break.

For Time (with cap = session duration)
    An athlete is a finisher only when finished_at_ms falls inside
    [started_at_ms, started_at_ms + duration]. Finishers sort by elapsed
    time ascending and all rank above every non-finisher.
    Non-finishers sort by work done, never by a late finish timestamp.
    When reps_per_round is set, work is total reps
    (rounds * reps_per_round + reps). Otherwise work is (rounds, reps)
    because a round size is unknown and a stray rep must not outrank
    a completed round.
    Equal elapsed times tie. Equal work ties. Ties use competition
    ranking (1, 1, 3).

Divisions are ranked separately. This module never rescales a score
from Rx to Scaled or the other way.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Sequence


DIVISIONS = ('rx', 'scaled')
WORKOUT_TYPES = ('amrap', 'for_time')


@dataclass(frozen=True)
class Athlete:
    user_id: int
    name: str
    division: str
    rounds: int
    reps: int
    finished_at_ms: Optional[int] = None


@dataclass(frozen=True)
class RankedAthlete:
    rank: int
    user_id: int
    name: str
    division: str
    rounds: int
    reps: int
    finished: bool
    elapsed_ms: Optional[int]
    total_reps: Optional[int]


def total_reps(rounds: int, reps: int, reps_per_round: Optional[int]) -> Optional[int]:
    if reps_per_round is None or reps_per_round <= 0:
        return None
    return rounds * reps_per_round + reps


def _competition_ranks(ordered: Sequence[Athlete], tie_key) -> list[tuple[int, Athlete]]:
    """1-based competition ranks. `tie_key` equal → same rank, next rank skips."""
    ranked: list[tuple[int, Athlete]] = []
    last_key = None
    last_rank = 0
    for index, athlete in enumerate(ordered, start=1):
        key = tie_key(athlete)
        if key != last_key:
            last_rank = index
            last_key = key
        ranked.append((last_rank, athlete))
    return ranked


def _as_ranked(
    pairs: Sequence[tuple[int, Athlete]],
    *,
    started_at_ms: Optional[int],
    finisher_ids: set[int],
    reps_per_round: Optional[int],
) -> list[RankedAthlete]:
    rows: list[RankedAthlete] = []
    for rank, athlete in pairs:
        finished = athlete.user_id in finisher_ids
        elapsed = None
        if finished and started_at_ms is not None and athlete.finished_at_ms is not None:
            elapsed = athlete.finished_at_ms - started_at_ms
        rows.append(RankedAthlete(
            rank=rank,
            user_id=athlete.user_id,
            name=athlete.name,
            division=athlete.division,
            rounds=athlete.rounds,
            reps=athlete.reps,
            finished=finished,
            elapsed_ms=elapsed,
            total_reps=total_reps(athlete.rounds, athlete.reps, reps_per_round),
        ))
    return rows


def _rank_amrap(athletes: Sequence[Athlete], reps_per_round: Optional[int]) -> list[RankedAthlete]:
    ordered = sorted(athletes, key=lambda a: (-a.rounds, -a.reps, a.user_id))
    pairs = _competition_ranks(ordered, lambda a: (a.rounds, a.reps))
    return _as_ranked(pairs, started_at_ms=None, finisher_ids=set(), reps_per_round=reps_per_round)


def _is_finisher(athlete: Athlete, started_at_ms: Optional[int], duration_ms: int) -> bool:
    if started_at_ms is None or athlete.finished_at_ms is None:
        return False
    elapsed = athlete.finished_at_ms - started_at_ms
    return 0 <= elapsed <= duration_ms


def _work_tie_key(athlete: Athlete, reps_per_round: Optional[int]):
    if reps_per_round is not None and reps_per_round > 0:
        return (athlete.rounds * reps_per_round + athlete.reps,)
    return (athlete.rounds, athlete.reps)


def _rank_for_time(
    athletes: Sequence[Athlete],
    started_at_ms: Optional[int],
    duration_sec: int,
    reps_per_round: Optional[int],
) -> list[RankedAthlete]:
    duration_ms = duration_sec * 1000
    finishers = [a for a in athletes if _is_finisher(a, started_at_ms, duration_ms)]
    rest = [a for a in athletes if not _is_finisher(a, started_at_ms, duration_ms)]

    def _elapsed(athlete: Athlete) -> int:
        assert started_at_ms is not None and athlete.finished_at_ms is not None
        return athlete.finished_at_ms - started_at_ms

    finishers.sort(key=lambda a: (_elapsed(a), a.user_id))
    rest.sort(key=lambda a: (*tuple(-part for part in _work_tie_key(a, reps_per_round)), a.user_id))
    ordered = finishers + rest
    finisher_ids = {a.user_id for a in finishers}

    def tie_key(athlete: Athlete):
        if athlete.user_id in finisher_ids:
            return ('time', _elapsed(athlete))
        return ('work', _work_tie_key(athlete, reps_per_round))

    pairs = _competition_ranks(ordered, tie_key)
    return _as_ranked(
        pairs,
        started_at_ms=started_at_ms,
        finisher_ids=finisher_ids,
        reps_per_round=reps_per_round,
    )


def rank_division(
    athletes: Sequence[Athlete],
    *,
    workout_type: str,
    started_at_ms: Optional[int],
    duration_sec: int,
    reps_per_round: Optional[int],
) -> list[RankedAthlete]:
    if workout_type not in WORKOUT_TYPES:
        raise ValueError(f'unknown workout_type: {workout_type}')
    if workout_type == 'amrap':
        return _rank_amrap(athletes, reps_per_round)
    return _rank_for_time(athletes, started_at_ms, duration_sec, reps_per_round)


def leaderboards(
    athletes: Sequence[Athlete],
    *,
    workout_type: str,
    started_at_ms: Optional[int],
    duration_sec: int,
    reps_per_round: Optional[int],
) -> dict[str, list[RankedAthlete]]:
    """Separate boards. An athlete is ranked only inside their own division."""
    boards: dict[str, list[RankedAthlete]] = {}
    for division in DIVISIONS:
        group = [a for a in athletes if a.division == division]
        boards[division] = rank_division(
            group,
            workout_type=workout_type,
            started_at_ms=started_at_ms,
            duration_sec=duration_sec,
            reps_per_round=reps_per_round,
        )
    return boards
