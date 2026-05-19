import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { WeeklyLog } from '../../types';

// supabase 클라이언트 mock — fetch / insert 체인을 테스트별로 주입.
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from '../../lib/supabase';
import { useWeeklyLogs } from '../useWeeklyLogs';

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

function makeLog(weekNo: number): WeeklyLog {
  return {
    id: `w${weekNo}`,
    participant_id: 'p1',
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

beforeEach(() => {
  fromMock.mockReset();
});

describe('useWeeklyLogs', () => {
  it('participantId 가 있으면 weekly_logs 를 fetch 해 logs 에 채운다', async () => {
    const rows = [makeLog(1), makeLog(2)];
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: rows }) }) }),
    });

    const { result } = renderHook(() => useWeeklyLogs('p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].week_no).toBe(1);
    expect(fromMock).toHaveBeenCalledWith('weekly_logs');
  });

  it('participantId 가 null 이면 fetch 없이 빈 배열', async () => {
    const { result } = renderHook(() => useWeeklyLogs(null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('insert 는 supabase.insert 를 호출하고 새 행을 반환한다', async () => {
    const inserted = makeLog(3);
    const insertFn = vi.fn(() => ({
      select: () => ({ single: () => Promise.resolve({ data: inserted, error: null }) }),
    }));
    fromMock.mockReturnValue({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }),
      insert: insertFn,
    });

    const { result } = renderHook(() => useWeeklyLogs('p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: WeeklyLog | undefined;
    await act(async () => {
      returned = await result.current.insert({
        participant_id: 'p1',
        week_no: 3,
      } as Omit<WeeklyLog, 'id' | 'created_at' | 'updated_at'>);
    });

    expect(insertFn).toHaveBeenCalledTimes(1);
    expect(returned?.week_no).toBe(3);
  });
});
