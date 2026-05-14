import { useMemo } from 'react';
import type { WeeklyLog } from '../types';
import { getTotalWeeks, getWeekNoForDate } from '../lib/weekUtils';

/**
 * 다음 주간 기록 입력 상태(state machine).
 *
 * | status                    | 의미                                                              | suggestedWeekNo         |
 * |---------------------------|-------------------------------------------------------------------|-------------------------|
 * | `before_start`            | 챌린지 시작일 이전                                                | null                    |
 * | `after_end`               | 챌린지 종료일 이후                                                | null                    |
 * | `ready`                   | 챌린지 진행 중 + 이번 주 기록 미작성                              | currentWeek             |
 * | `caught_up`               | 이번 주 기록 완료 + 과거 미입력 주차가 남아 있음 (백필 권유)      | missingWeeks[0] (과거)  |
 * | `already_done_this_week`  | 이번 주 기록 완료 + 과거도 모두 완료                              | null                    |
 *
 * `missingWeeks` 는 *1주차부터 currentWeek 까지* 중 logs 에 없는 주차의 오름차순 배열.
 * `caught_up` 일 때는 *currentWeek 가 done* 이므로 missingWeeks 는 모두 과거 주차.
 */
export type NextRecordableWeekStatus =
  | 'before_start'
  | 'after_end'
  | 'ready'
  | 'caught_up'
  | 'already_done_this_week';

export interface NextRecordableWeekResult {
  status: NextRecordableWeekStatus;
  /** 폼 진입 시 기본 선택할 주차. 입력 불가 상태(`before_start`/`after_end`/`already_done_this_week`) 면 null. */
  suggestedWeekNo: number | null;
  /** 1..currentWeek 범위에서 입력되지 않은 주차의 오름차순 목록. */
  missingWeeks: number[];
  /** 챌린지 시작일 기준 오늘이 속한 주차 (1-base, 시작 전이면 1, 종료 후면 totalWeeks). */
  currentWeek: number;
  /** 챌린지 기간으로부터 계산한 총 주차 수. */
  totalWeeks: number;
}

export interface ComputeNextRecordableWeekInput {
  logs: Pick<WeeklyLog, 'week_no'>[];
  challengeStartDate: string;
  challengeEndDate: string;
  /** 테스트용 today 주입. 미지정 시 new Date(). */
  today?: Date;
}

/**
 * 순수 함수 — React 없이 테스트 가능. hook 본체는 이 함수를 useMemo 로 감쌀 뿐이다.
 */
export function computeNextRecordableWeek({
  logs,
  challengeStartDate,
  challengeEndDate,
  today,
}: ComputeNextRecordableWeekInput): NextRecordableWeekResult {
  const totalWeeks = getTotalWeeks(challengeStartDate, challengeEndDate);
  const todayIso = (today ?? new Date()).toISOString().slice(0, 10);
  const startDateOnly = challengeStartDate.slice(0, 10);
  const endDateOnly = challengeEndDate.slice(0, 10);

  const done = new Set(logs.map((l) => l.week_no));

  if (todayIso < startDateOnly) {
    return {
      status: 'before_start',
      suggestedWeekNo: null,
      missingWeeks: [],
      currentWeek: 1,
      totalWeeks,
    };
  }

  if (todayIso > endDateOnly) {
    // 종료 후에는 1..totalWeeks 전체 중 빠진 주차를 노출 (참고용).
    const missing: number[] = [];
    for (let w = 1; w <= totalWeeks; w += 1) {
      if (!done.has(w)) missing.push(w);
    }
    return {
      status: 'after_end',
      suggestedWeekNo: null,
      missingWeeks: missing,
      currentWeek: totalWeeks,
      totalWeeks,
    };
  }

  const rawCurrent = getWeekNoForDate(startDateOnly, todayIso);
  const currentWeek = Math.min(rawCurrent, totalWeeks);

  const missing: number[] = [];
  for (let w = 1; w <= currentWeek; w += 1) {
    if (!done.has(w)) missing.push(w);
  }

  const currentDone = done.has(currentWeek);

  if (!currentDone) {
    return {
      status: 'ready',
      suggestedWeekNo: currentWeek,
      missingWeeks: missing,
      currentWeek,
      totalWeeks,
    };
  }

  // currentDone === true 이므로 missing 에 currentWeek 는 없고, 남은 것은 모두 과거 주차.
  if (missing.length > 0) {
    return {
      status: 'caught_up',
      suggestedWeekNo: missing[0],
      missingWeeks: missing,
      currentWeek,
      totalWeeks,
    };
  }

  return {
    status: 'already_done_this_week',
    suggestedWeekNo: null,
    missingWeeks: [],
    currentWeek,
    totalWeeks,
  };
}

export function useNextRecordableWeek(
  logs: Pick<WeeklyLog, 'week_no'>[],
  challengeStartDate: string,
  challengeEndDate: string
): NextRecordableWeekResult {
  const weekKey = logs
    .map((l) => l.week_no)
    .sort((a, b) => a - b)
    .join(',');
  return useMemo(
    () =>
      computeNextRecordableWeek({
        logs,
        challengeStartDate,
        challengeEndDate,
      }),
    // logs 배열 자체가 매 렌더마다 새 참조여도 week_no 집합이 같으면 재계산 불요.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekKey, challengeStartDate, challengeEndDate]
  );
}

/**
 * `ready` 상태일 때 사용자에게 보여줄 한국어 라벨.
 * UI 가 일관되게 같은 카피를 쓰도록 한 곳에서 관리한다.
 */
export function getCtaLabel(result: NextRecordableWeekResult): string {
  switch (result.status) {
    case 'ready':
      return `${result.suggestedWeekNo}주차 기록 입력`;
    case 'caught_up':
      return result.missingWeeks.length === 1
        ? `지난 ${result.missingWeeks[0]}주차 채우기`
        : `지난 ${result.missingWeeks.length}개 주차 채우기`;
    case 'already_done_this_week':
      return '다음 주에 입력 가능';
    case 'before_start':
      return '시작일 이후 입력 가능';
    case 'after_end':
      return '기록 기간 종료';
  }
}

export function isCtaActionable(result: NextRecordableWeekResult): boolean {
  return result.status === 'ready' || result.status === 'caught_up';
}
