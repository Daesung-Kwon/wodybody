import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { WeeklyLog } from '../../types';

// RLS lockdown: 훅은 테이블이 아니라 room-code RPC 만 호출한다.
vi.mock('../../lib/supabase', () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));

import { supabase } from '../../lib/supabase';
import { useWeeklyLogs, useAllWeeklyLogsForChallenge } from '../useWeeklyLogs';

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;
const rpcMock = supabase.rpc as unknown as ReturnType<typeof vi.fn>;

function makeLog(weekNo: number, participantId = 'p1'): WeeklyLog {
  return {
    id: `w${weekNo}-${participantId}`,
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

beforeEach(() => {
  fromMock.mockReset();
  rpcMock.mockReset();
});

describe('useWeeklyLogs', () => {
  it('code + participantId 가 있으면 get_room_weekly_logs RPC 로 fetch 한다', async () => {
    const rows = [makeLog(1), makeLog(2)];
    rpcMock.mockResolvedValue({ data: rows, error: null });

    const { result } = renderHook(() => useWeeklyLogs('abc234', 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].week_no).toBe(1);
    expect(rpcMock).toHaveBeenCalledWith('get_room_weekly_logs', {
      p_code: 'ABC234',
      p_participant_id: 'p1',
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('participantId 가 null 이면 fetch 없이 빈 배열', async () => {
    const { result } = renderHook(() => useWeeklyLogs('ABC234', null));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logs).toEqual([]);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('room code 가 없으면 fetch 하지 않는다', async () => {
    const { result } = renderHook(() => useWeeklyLogs(undefined, 'p1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('insert 는 create_weekly_log RPC 를 device_secret 해시와 함께 호출하고 새 행을 반환한다', async () => {
    const inserted = makeLog(3);
    rpcMock.mockImplementation((fn: string) =>
      Promise.resolve(
        fn === 'create_weekly_log' ? { data: inserted, error: null } : { data: [], error: null }
      )
    );

    const { result } = renderHook(() => useWeeklyLogs('ABC234', 'p1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returned: WeeklyLog | undefined;
    await act(async () => {
      returned = await result.current.insert({
        week_no: 3,
        recorded_at: '2026-05-25',
        age: null,
        gender: null,
        weight_kg: null,
        height_cm: null,
        body_fat_rate: 25,
        exercise_count: null,
        sleep_hours: null,
        diet_quality: null,
        note: null,
      });
    });

    const call = rpcMock.mock.calls.find(([fn]) => fn === 'create_weekly_log');
    expect(call).toBeDefined();
    const args = call![1] as Record<string, unknown>;
    expect(args.p_code).toBe('ABC234');
    expect(args.p_participant_id).toBe('p1');
    expect(args.p_device_secret_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(returned?.week_no).toBe(3);
    // plain device_secret 은 로컬에만 저장
    expect(localStorage.getItem(`burnfat:device:weekly_logs:${inserted.id}`)).toMatch(/^[0-9a-f]{64}$/);
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('useAllWeeklyLogsForChallenge', () => {
  it('방 전체 기록을 1회 RPC 로 받아 참가자별로 묶고, 기록 없는 참가자는 빈 배열', async () => {
    rpcMock.mockResolvedValue({
      data: [makeLog(2, 'p1'), makeLog(1, 'p1'), makeLog(1, 'p2')],
      error: null,
    });

    const { result } = renderHook(() => useAllWeeklyLogsForChallenge('abc234', ['p1', 'p2', 'p3']));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('get_room_weekly_logs', {
      p_code: 'ABC234',
      p_participant_id: null,
    });
    expect(result.current.logsByParticipant.p1.map((l) => l.week_no)).toEqual([1, 2]);
    expect(result.current.logsByParticipant.p2).toHaveLength(1);
    expect(result.current.logsByParticipant.p3).toEqual([]);
  });

  it('참가자가 없으면 RPC 를 호출하지 않는다', async () => {
    const { result } = renderHook(() => useAllWeeklyLogsForChallenge('ABC234', []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('RPC 오류 시 빈 기록으로 graceful degrade', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const { result } = renderHook(() => useAllWeeklyLogsForChallenge('ABC234', ['p1']));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.logsByParticipant).toEqual({ p1: [] });
  });
});
