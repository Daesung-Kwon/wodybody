import { describe, it, expect } from 'vitest';
import { computeGoalProgress } from './goalProgress';

describe('computeGoalProgress', () => {
  it('목표·시작값 없으면 hasGoal=false', () => {
    expect(computeGoalProgress(null, 25, null).hasGoal).toBe(false);
    expect(computeGoalProgress(30, 25, null).hasGoal).toBe(false);
    expect(computeGoalProgress(null, 25, 20).hasGoal).toBe(false);
  });

  it('시작 30 → 현재 25 → 목표 20 : 진행률 50%', () => {
    const g = computeGoalProgress(30, 25, 20);
    expect(g.hasGoal).toBe(true);
    expect(g.progressPct).toBe(50);
    expect(g.reached).toBe(false);
    expect(g.remainingToTarget).toBe(5);
    expect(g.deltaFromStart).toBe(-5);
  });

  it('목표 도달 — 현재 ≤ 목표 : 진행률 100, reached', () => {
    const g = computeGoalProgress(30, 20, 20);
    expect(g.progressPct).toBe(100);
    expect(g.reached).toBe(true);
    expect(g.remainingToTarget).toBe(0);
  });

  it('목표 초과 달성 — 현재 < 목표 : 100, remaining 음수', () => {
    const g = computeGoalProgress(30, 18, 20);
    expect(g.progressPct).toBe(100);
    expect(g.reached).toBe(true);
    expect(g.remainingToTarget).toBe(-2);
  });

  it('시작보다 후퇴 — 현재 > 시작 : 진행률 0', () => {
    const g = computeGoalProgress(30, 32, 20);
    expect(g.progressPct).toBe(0);
    expect(g.deltaFromStart).toBe(2);
  });

  it('현재값 없으면 시작 지점으로 간주 → 진행률 0', () => {
    const g = computeGoalProgress(30, null, 20);
    expect(g.hasGoal).toBe(true);
    expect(g.progressPct).toBe(0);
    expect(g.deltaFromStart).toBeNull();
  });

  it('목표가 시작값 이상(쉬운 목표) — 도달 시 100, 아니면 0', () => {
    expect(computeGoalProgress(25, 24, 25).progressPct).toBe(100); // 24 ≤ 25
    expect(computeGoalProgress(25, 26, 25).progressPct).toBe(0); // 26 > 25
  });

  it('진행률은 0~100 으로 clamp', () => {
    const g = computeGoalProgress(30, 29, 20);
    expect(g.progressPct).toBeGreaterThanOrEqual(0);
    expect(g.progressPct).toBeLessThanOrEqual(100);
  });
});
