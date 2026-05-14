import { describe, it, expect } from 'vitest';
import {
  computeNextRecordableWeek,
  getCtaLabel,
  isCtaActionable,
} from './useNextRecordableWeek';

const START = '2026-05-04'; // 월요일
const END = '2026-06-01'; // 4주 챌린지 (28일)

describe('computeNextRecordableWeek', () => {
  it('시작일 이전이면 before_start, suggestedWeekNo 는 null', () => {
    const result = computeNextRecordableWeek({
      logs: [],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-01'),
    });
    expect(result.status).toBe('before_start');
    expect(result.suggestedWeekNo).toBeNull();
    expect(result.missingWeeks).toEqual([]);
    expect(result.totalWeeks).toBe(4);
  });

  it('종료일 이후면 after_end, suggestedWeekNo 는 null 이고 missingWeeks 는 전체 빠진 주차', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 1 }, { week_no: 3 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-06-10'),
    });
    expect(result.status).toBe('after_end');
    expect(result.suggestedWeekNo).toBeNull();
    expect(result.missingWeeks).toEqual([2, 4]);
    expect(isCtaActionable(result)).toBe(false);
  });

  it('1주차 진행 중 + 기록 없음 → ready (suggested = 1)', () => {
    const result = computeNextRecordableWeek({
      logs: [],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-05'),
    });
    expect(result.status).toBe('ready');
    expect(result.currentWeek).toBe(1);
    expect(result.suggestedWeekNo).toBe(1);
    expect(result.missingWeeks).toEqual([1]);
    expect(getCtaLabel(result)).toBe('1주차 기록 입력');
  });

  it('2주차 진행 중 + 1주차만 기록됨 → ready (suggested = 2, 현재 주차 우선)', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 1 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-12'),
    });
    expect(result.status).toBe('ready');
    expect(result.currentWeek).toBe(2);
    expect(result.suggestedWeekNo).toBe(2);
    expect(result.missingWeeks).toEqual([2]);
  });

  it('2주차 진행 중 + 2주차 기록됨, 1주차 미입력 → caught_up (suggested = 과거 1)', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 2 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-12'),
    });
    expect(result.status).toBe('caught_up');
    expect(result.currentWeek).toBe(2);
    expect(result.suggestedWeekNo).toBe(1);
    expect(result.missingWeeks).toEqual([1]);
    expect(getCtaLabel(result)).toBe('지난 1주차 채우기');
  });

  it('3주차 진행 중 + 3주차 기록됨, 1·2주차 미입력 → caught_up, 라벨은 다건 표기', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 3 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-19'),
    });
    expect(result.status).toBe('caught_up');
    expect(result.currentWeek).toBe(3);
    expect(result.suggestedWeekNo).toBe(1);
    expect(result.missingWeeks).toEqual([1, 2]);
    expect(getCtaLabel(result)).toBe('지난 2개 주차 채우기');
    expect(isCtaActionable(result)).toBe(true);
  });

  it('2주차 진행 중 + 1·2주차 모두 기록됨 → already_done_this_week (suggested = null)', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 1 }, { week_no: 2 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-12'),
    });
    expect(result.status).toBe('already_done_this_week');
    expect(result.suggestedWeekNo).toBeNull();
    expect(result.missingWeeks).toEqual([]);
    expect(isCtaActionable(result)).toBe(false);
  });

  it('시작일 당일은 1주차 진행 중으로 간주', () => {
    const result = computeNextRecordableWeek({
      logs: [],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date(START),
    });
    expect(result.status).toBe('ready');
    expect(result.currentWeek).toBe(1);
  });

  it('종료일 당일은 마지막 주차 입력 가능', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 1 }, { week_no: 2 }, { week_no: 3 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date(END),
    });
    expect(['ready', 'caught_up']).toContain(result.status);
    expect(result.status).toBe('ready');
    expect(result.suggestedWeekNo).toBe(4);
    expect(result.totalWeeks).toBe(4);
  });

  it('순서가 뒤섞인 logs 입력에도 정상 계산', () => {
    const result = computeNextRecordableWeek({
      logs: [{ week_no: 3 }, { week_no: 1 }],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-19'),
    });
    expect(result.status).toBe('caught_up');
    expect(result.suggestedWeekNo).toBe(2);
    expect(result.missingWeeks).toEqual([2]);
  });

  it('currentWeek 가 totalWeeks 를 넘지 않도록 clamp 됨', () => {
    // 종료일 마지막 날 직전: end - 1day ≈ week 4
    const result = computeNextRecordableWeek({
      logs: [],
      challengeStartDate: START,
      challengeEndDate: END,
      today: new Date('2026-05-31'),
    });
    expect(result.currentWeek).toBeLessThanOrEqual(result.totalWeeks);
  });
});

describe('isCtaActionable', () => {
  it('ready 와 caught_up 만 액션 가능, 나머지는 비활성', () => {
    const mk = (status: 'before_start' | 'after_end' | 'ready' | 'caught_up' | 'already_done_this_week') => ({
      status,
      suggestedWeekNo: 1,
      missingWeeks: [],
      currentWeek: 1,
      totalWeeks: 4,
    });
    expect(isCtaActionable(mk('ready'))).toBe(true);
    expect(isCtaActionable(mk('caught_up'))).toBe(true);
    expect(isCtaActionable(mk('before_start'))).toBe(false);
    expect(isCtaActionable(mk('after_end'))).toBe(false);
    expect(isCtaActionable(mk('already_done_this_week'))).toBe(false);
  });
});
