import { describe, it, expect } from 'vitest';
import { CHALLENGE_TEMPLATES, templateEndDate } from './challengeTemplates';

describe('CHALLENGE_TEMPLATES', () => {
  it('4/8/12주 프리셋 3종 — 참가비 5만/10만/20만', () => {
    expect(CHALLENGE_TEMPLATES).toHaveLength(3);
    expect(CHALLENGE_TEMPLATES.map((t) => t.weeks)).toEqual([4, 8, 12]);
    expect(CHALLENGE_TEMPLATES.map((t) => t.stakeAmount)).toEqual([50000, 100000, 200000]);
  });

  it('id 는 고유', () => {
    const ids = CHALLENGE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('templateEndDate', () => {
  it('4주 = 시작일 + 28일', () => {
    expect(templateEndDate('2026-05-04', 4)).toBe('2026-06-01');
  });

  it('8주 = 시작일 + 56일', () => {
    expect(templateEndDate('2026-05-04', 8)).toBe('2026-06-29');
  });

  it('12주 = 시작일 + 84일', () => {
    expect(templateEndDate('2026-01-01', 12)).toBe('2026-03-26');
  });

  it('월·연 경계를 넘어도 정확', () => {
    expect(templateEndDate('2026-12-20', 4)).toBe('2027-01-17');
  });

  it('잘못된 날짜 문자열은 그대로 반환', () => {
    expect(templateEndDate('', 4)).toBe('');
    expect(templateEndDate('not-a-date', 4)).toBe('not-a-date');
  });
});
