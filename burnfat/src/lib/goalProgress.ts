/**
 * Sprint 2 — 목표 체지방률 진행률 계산.
 *
 * 시작 체지방(시작 인증) → 현재 체지방(최신 주간 기록) → 목표 체지방(참가자 설정)
 * 의 3점으로 "목표를 향해 얼마나 왔는가" 를 0~100% 로 환산한다. 순수 함수.
 */

export interface GoalProgress {
  /** 목표·시작값이 모두 있어 진행률 표시가 가능한지. */
  hasGoal: boolean;
  startBodyFat: number | null;
  currentBodyFat: number | null;
  targetBodyFat: number | null;
  /** 목표를 향한 진행률 0~100. 시작보다 후퇴 시 0, 목표 달성·초과 시 100. */
  progressPct: number;
  /** 목표 도달(현재 ≤ 목표) 여부. */
  reached: boolean;
  /** 목표까지 남은 %p. 양수=더 감량 필요, 음수=초과 달성. 값 없으면 null. */
  remainingToTarget: number | null;
  /** 시작 대비 변화 %p. 음수=감소(좋음). 값 없으면 null. */
  deltaFromStart: number | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeGoalProgress(
  startBodyFat: number | null | undefined,
  currentBodyFat: number | null | undefined,
  targetBodyFat: number | null | undefined
): GoalProgress {
  const start = startBodyFat ?? null;
  const current = currentBodyFat ?? null;
  const target = targetBodyFat ?? null;
  const hasGoal = start != null && target != null;

  const deltaFromStart =
    start != null && current != null ? round1(current - start) : null;
  const remainingToTarget =
    current != null && target != null ? round1(current - target) : null;

  let progressPct = 0;
  let reached = false;

  if (hasGoal) {
    // current 가 없으면 아직 시작 지점 → 진행률 0.
    const effectiveCurrent = current ?? start;
    reached = effectiveCurrent != null && target != null && effectiveCurrent <= target;
    const denom = (start as number) - (target as number); // 기대 총 감량 폭
    if (denom <= 0) {
      // 목표가 시작값과 같거나 더 높음(이미 쉬운 목표) → 도달했으면 100, 아니면 0.
      progressPct = reached ? 100 : 0;
    } else if (effectiveCurrent != null) {
      const raw = (((start as number) - effectiveCurrent) / denom) * 100;
      progressPct = Math.max(0, Math.min(100, Math.round(raw)));
    }
  }

  return {
    hasGoal,
    startBodyFat: start,
    currentBodyFat: current,
    targetBodyFat: target,
    progressPct,
    reached,
    remainingToTarget,
    deltaFromStart,
  };
}
