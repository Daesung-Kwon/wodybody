import { useMemo } from 'react';
import type { ParticipantWithSubmissions } from '../types';
import type { WeeklyLog } from '../types';
import { getCurrentWeekNo } from '../lib/weekUtils';

export function useRecordStatus(
  participants: ParticipantWithSubmissions[],
  weeklyLogsByParticipant: Record<string, WeeklyLog[]>,
  startDate: string
) {
  return useMemo(() => {
    const currentWeek = getCurrentWeekNo(startDate);
    const completed = participants.filter((p) => {
      const logs = weeklyLogsByParticipant[p.id] || [];
      return logs.some((l) => l.week_no === currentWeek);
    });
    const notCompleted = participants.filter((p) => {
      const logs = weeklyLogsByParticipant[p.id] || [];
      return !logs.some((l) => l.week_no === currentWeek);
    });
    return {
      currentWeek,
      completedCount: completed.length,
      notCompletedCount: notCompleted.length,
      completed,
      notCompleted,
    };
  }, [participants, weeklyLogsByParticipant, startDate]);
}
