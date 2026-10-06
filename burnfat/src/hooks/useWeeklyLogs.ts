import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WeeklyLog } from '../types';
import { loadDeviceSecret, prepareDeviceSecret } from '../lib/deviceSecret';
import { createWeeklyLog, fetchRoomWeeklyLogs, type NewWeeklyLog } from '../lib/roomApi';

/**
 * 한 참가자의 주간 기록.
 * RLS lockdown(2026-10): 읽기/생성은 room code 가 필요한 RPC(get_room_weekly_logs /
 * create_weekly_log) 경유. 수정은 기존 device-secret RPC(update_weekly_log) 그대로.
 */
export function useWeeklyLogs(challengeCode: string | null | undefined, participantId: string | null) {
  const [logs, setLogs] = useState<WeeklyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!participantId || !challengeCode) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setLogs(await fetchRoomWeeklyLogs(challengeCode, participantId));
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, [challengeCode, participantId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const insert = useCallback(
    async (row: NewWeeklyLog) => {
      if (!challengeCode || !participantId) throw new Error('대결 코드 또는 참가자가 없습니다.');
      const secret = await prepareDeviceSecret('weekly_logs');
      const created = await createWeeklyLog(challengeCode, participantId, row, secret.hash);
      if (created?.id) secret.persist(created.id);
      await fetch();
      return created;
    },
    [challengeCode, participantId, fetch]
  );

  // Sprint 0.2: RLS UPDATE 정책이 제거되었으므로 update_weekly_log RPC 사용.
  //   - 같은 디바이스(localStorage 시크릿) + 24h 윈도우 안일 때만 성공.
  const update = useCallback(
    async (id: string, updates: Partial<WeeklyLog>) => {
      const deviceSecret = loadDeviceSecret('weekly_logs', id);
      if (!deviceSecret) {
        throw new Error('이 기록은 다른 디바이스에서 입력되어 이 기기에서 수정할 수 없습니다.');
      }
      // device_secret_hash / created_at / updated_at 같은 컬럼은 패치에서 제거
      const { id: _id, created_at: _c, updated_at: _u, device_secret_hash: _d, ...patch } =
        updates as Partial<WeeklyLog> & { id?: string };
      void _id; void _c; void _u; void _d;

      const { error } = await supabase.rpc('update_weekly_log', {
        p_id: id,
        p_device_secret: deviceSecret,
        p_patch: patch,
      });
      if (error) throw error;
      await fetch();
    },
    [fetch]
  );

  return { logs, loading, refetch: fetch, insert, update };
}

/**
 * 방 전체 주간 기록 — get_room_weekly_logs 1회 호출.
 * participantIds 는 (1) 빈 배열 시 호출 생략 (2) 참가자별 빈 배열 시드 (3) 참가자 변경 시
 * refetch 트리거 용도로 유지한다.
 */
export function useAllWeeklyLogsForChallenge(
  challengeCode: string | null | undefined,
  participantIds: string[]
) {
  const [logsByParticipant, setLogsByParticipant] = useState<Record<string, WeeklyLog[]>>({});
  const [loading, setLoading] = useState(true);
  const idsKey = participantIds.join(',');

  const fetch = useCallback(async () => {
    if (!challengeCode || participantIds.length === 0) {
      setLogsByParticipant({});
      setLoading(false);
      return;
    }
    setLoading(true);
    let data: WeeklyLog[] = [];
    try {
      data = await fetchRoomWeeklyLogs(challengeCode);
    } catch {
      data = [];
    }
    const byParticipant: Record<string, WeeklyLog[]> = {};
    for (const pId of participantIds) byParticipant[pId] = [];
    for (const row of [...data].sort((a, b) => a.week_no - b.week_no)) {
      if (!byParticipant[row.participant_id]) byParticipant[row.participant_id] = [];
      byParticipant[row.participant_id].push(row);
    }
    setLogsByParticipant(byParticipant);
    setLoading(false);
  }, [challengeCode, idsKey]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { logsByParticipant, loading, refetch: fetch };
}
