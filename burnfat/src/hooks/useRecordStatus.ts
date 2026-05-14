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

    // Sprint 1.5: 누적 입력률 — 1주차부터 currentWeek 까지 입력된 셀 수 / 가능 셀 수.
    // 가능 셀 수 = 참가자 수 × currentWeek. 0 명이거나 currentWeek 가 0 이면 비율을 0 으로 계산.
    const totalPossibleCells = participants.length * currentWeek;
    const totalFilledCells = participants.reduce((sum, p) => {
      const logs = weeklyLogsByParticipant[p.id] || [];
      return sum + logs.filter((l) => l.week_no >= 1 && l.week_no <= currentWeek).length;
    }, 0);
    const cumulativeFillRate =
      totalPossibleCells > 0 ? Math.round((totalFilledCells / totalPossibleCells) * 100) : 0;

    return {
      currentWeek,
      completedCount: completed.length,
      notCompletedCount: notCompleted.length,
      completed,
      notCompleted,
      totalFilledCells,
      totalPossibleCells,
      cumulativeFillRate,
    };
  }, [participants, weeklyLogsByParticipant, startDate]);
}
