import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecordStatus } from '../useRecordStatus';
import type { ParticipantWithSubmissions, WeeklyLog } from '../../types';

// getCurrentWeekNo 가 new Date() 에 의존하므로 "오늘" 을 고정한다.
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-01T00:00:00Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

function participant(id: string, nickname: string): ParticipantWithSubmissions {
  return {
    id,
    challenge_id: 'c1',
    nickname,
    age: null,
    gender: null,
    height_cm: null,
    target_body_fat: null,
    created_at: '2026-05-01',
    submissions: [],
  };
}

function log(participantId: string, weekNo: number): WeeklyLog {
  return {
    id: `${participantId}-w${weekNo}`,
    participant_id: participantId,
    week_no: weekNo,
    recorded_at: '2026-05-25',
    age: null,
    gender: null,
    weight_kg: null,
    height_cm: null,
    body_fat_rate: null,
    exercise_count: null,
    sleep_hours: null,
    diet_quality: null,
    note: null,
    created_at: '2026-05-25',
    updated_at: '2026-05-25',
  };
}

describe('useRecordStatus', () => {
  it('참가자가 없으면 모든 카운트가 0, fillRate 0', () => {
    const { result } = renderHook(() =>
      useRecordStatus([], {}, '2026-05-25')
    );
    expect(result.current.completedCount).toBe(0);
    expect(result.current.notCompletedCount).toBe(0);
    expect(result.current.cumulativeFillRate).toBe(0);
    expect(result.current.totalPossibleCells).toBe(0);
  });

  it('시작일 7일 전이면 currentWeek 는 2', () => {
    const { result } = renderHook(() =>
      useRecordStatus([participant('p1', 'A')], {}, '2026-05-25')
    );
    expect(result.current.currentWeek).toBe(2);
  });

  it('시작 당일이면 currentWeek 는 1', () => {
    const { result } = renderHook(() =>
      useRecordStatus([participant('p1', 'A')], {}, '2026-06-01')
    );
    expect(result.current.currentWeek).toBe(1);
  });

  it('현재 주차 로그 유무로 completed / notCompleted 를 분류한다', () => {
    const parts = [participant('p1', 'A'), participant('p2', 'B')];
    const logs = { p1: [log('p1', 2)], p2: [log('p2', 1)] };
    const { result } = renderHook(() =>
      useRecordStatus(parts, logs, '2026-05-25')
    );
    // currentWeek = 2 → p1 만 완료
    expect(result.current.completedCount).toBe(1);
    expect(result.current.notCompletedCount).toBe(1);
    expect(result.current.notCompleted.map((p) => p.nickname)).toEqual(['B']);
  });

  it('누적 입력률 = 입력 셀 / (참가자수 × currentWeek)', () => {
    const parts = [participant('p1', 'A'), participant('p2', 'B')];
    // currentWeek = 2, totalPossible = 2 × 2 = 4
    // p1: week1,2 입력(2) / p2: week1 입력(1) → filled 3 → 75%
    const logs = {
      p1: [log('p1', 1), log('p1', 2)],
      p2: [log('p2', 1)],
    };
    const { result } = renderHook(() =>
      useRecordStatus(parts, logs, '2026-05-25')
    );
    expect(result.current.totalPossibleCells).toBe(4);
    expect(result.current.totalFilledCells).toBe(3);
    expect(result.current.cumulativeFillRate).toBe(75);
  });

  it('currentWeek 초과 주차 로그는 누적 셀 계산에서 제외된다', () => {
    const parts = [participant('p1', 'A')];
    // currentWeek = 2 인데 week3 로그가 있어도 filled 에 포함 안 됨
    const logs = { p1: [log('p1', 1), log('p1', 3)] };
    const { result } = renderHook(() =>
      useRecordStatus(parts, logs, '2026-05-25')
    );
    expect(result.current.totalFilledCells).toBe(1);
  });

  it('전원이 현재 주차를 입력하면 notCompleted 가 비어 있다', () => {
    const parts = [participant('p1', 'A'), participant('p2', 'B')];
    const logs = { p1: [log('p1', 2)], p2: [log('p2', 2)] };
    const { result } = renderHook(() =>
      useRecordStatus(parts, logs, '2026-05-25')
    );
    expect(result.current.completedCount).toBe(2);
    expect(result.current.notCompleted).toEqual([]);
  });
});
