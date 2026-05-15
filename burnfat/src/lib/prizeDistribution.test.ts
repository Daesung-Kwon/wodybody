import { describe, it, expect } from 'vitest';
import { computePrizeDistribution, formatKrw } from './prizeDistribution';

describe('computePrizeDistribution', () => {
  it('참가비 5만원 × 5명 → 풀 25만, 1등 +20만, 나머지 -5만', () => {
    const d = computePrizeDistribution(50000, 5);
    expect(d.pot).toBe(250000);
    expect(d.winnerNet).toBe(200000);
    expect(d.loserNet).toBe(-50000);
    expect(d.hasPrize).toBe(true);
  });

  it('참가자 1명이면 분배 의미 없음 (hasPrize=false)', () => {
    const d = computePrizeDistribution(50000, 1);
    expect(d.pot).toBe(50000);
    expect(d.hasPrize).toBe(false);
  });

  it('참가비 0원이면 hasPrize=false', () => {
    const d = computePrizeDistribution(0, 5);
    expect(d.pot).toBe(0);
    expect(d.hasPrize).toBe(false);
  });

  it('음수/소수 입력은 정규화', () => {
    const d = computePrizeDistribution(-100, 3.9);
    expect(d.stakeAmount).toBe(0);
    expect(d.participantCount).toBe(3);
  });
});

describe('formatKrw', () => {
  it('천 단위 구분 + 원 접미', () => {
    expect(formatKrw(250000)).toBe('250,000원');
    expect(formatKrw(0)).toBe('0원');
  });

  it('음수는 - 접두', () => {
    expect(formatKrw(-50000)).toBe('-50,000원');
  });
});
