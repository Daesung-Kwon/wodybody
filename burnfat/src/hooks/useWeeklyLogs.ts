import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WeeklyLog } from '../types';
import { loadDeviceSecret } from '../lib/deviceSecret';

export function useWeeklyLogs(participantId: string | null) {
  const [logs, setLogs] = useState<WeeklyLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!participantId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('weekly_logs')
      .select('*')
      .eq('participant_id', participantId)
      .order('week_no', { ascending: true });
    setLogs((data as WeeklyLog[]) || []);
    setLoading(false);
  }, [participantId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const insert = useCallback(
    async (row: Omit<WeeklyLog, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase.from('weekly_logs').insert(row).select().single();
      if (error) throw error;
      await fetch();
      return data as WeeklyLog;
    },
    [fetch]
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

export function useAllWeeklyLogsForChallenge(participantIds: string[]) {
  const [logsByParticipant, setLogsByParticipant] = useState<Record<string, WeeklyLog[]>>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (participantIds.length === 0) {
      setLogsByParticipant({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('weekly_logs')
      .select('*')
      .in('participant_id', participantIds)
      .order('week_no', { ascending: true });
    const byParticipant: Record<string, WeeklyLog[]> = {};
    for (const pId of participantIds) byParticipant[pId] = [];
    for (const row of data || []) {
      const pId = (row as WeeklyLog).participant_id;
      if (!byParticipant[pId]) byParticipant[pId] = [];
      byParticipant[pId].push(row as WeeklyLog);
    }
    setLogsByParticipant(byParticipant);
    setLoading(false);
  }, [participantIds.join(',')]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { logsByParticipant, loading, refetch: fetch };
}
