import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { WeeklyLog } from '../types';

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

  const update = useCallback(
    async (id: string, updates: Partial<WeeklyLog>) => {
      const { error } = await supabase.from('weekly_logs').update(updates).eq('id', id);
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
