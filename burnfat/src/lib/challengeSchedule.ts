/**
 * Sprint 1 — 챌린지 일정/D-Day 계산.
 *
 * 모든 함수는 순수 함수로, 테스트용 `today` 주입을 받는다.
 * 날짜는 `YYYY-MM-DD` (또는 ISO) 문자열. 비교는 UTC 자정 기준으로 통일한다.
 */

export type ChallengePhase = 'before' | 'active' | 'ended';

function toDateOnly(value: string): string {
  return (value || '').split('T')[0].slice(0, 10);
}

function todayIso(today?: Date): string {
  return (today ?? new Date()).toISOString().slice(0, 10);
}

/** 두 날짜(YYYY-MM-DD) 사이의 일수 차 (b - a). */
function diffDays(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/** 챌린지가 시작 전 / 진행 중 / 종료됨 중 어디인지. */
export function getChallengePhase(
  startDate: string,
  endDate: string,
  today?: Date
): ChallengePhase {
  const t = todayIso(today);
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (start && t < start) return 'before';
  if (end && t > end) return 'ended';
  return 'active';
}

/** 종료일까지 남은 일수. 종료 당일=0, 지난 뒤=음수. end_date 없으면 null. */
export function getDaysUntilEnd(endDate: string, today?: Date): number | null {
  const end = toDateOnly(endDate);
  if (!end) return null;
  return diffDays(todayIso(today), end);
}

/** 시작일까지 남은 일수. 시작 당일=0, 지난 뒤=음수. start_date 없으면 null. */
export function getDaysUntilStart(startDate: string, today?: Date): number | null {
  const start = toDateOnly(startDate);
  if (!start) return null;
  return diffDays(todayIso(today), start);
}

export interface DDayDisplay {
  /** 칩에 표시할 짧은 라벨. 예: "D-3", "D-DAY", "종료", "시작 D-2". */
  label: string;
  /** 스크린리더용 풀 텍스트. 예: "종료까지 3일 남음". */
  ariaLabel: string;
  /** 의미 색상 — 색 단독 정보 금지 원칙에 따라 항상 label/ariaLabel 과 병행. */
  tone: 'default' | 'info' | 'warning' | 'ended';
  /** 종료 임박(24h 이내, 진행 중) 여부 — 모달 노출 트리거. */
  endingSoon: boolean;
}

/**
 * 헤더 D-Day 칩 + 종료 임박 모달이 함께 쓰는 단일 표시 모델.
 */
export function getDDayDisplay(
  startDate: string,
  endDate: string,
  today?: Date
): DDayDisplay {
  const phase = getChallengePhase(startDate, endDate, today);

  if (phase === 'before') {
    const untilStart = getDaysUntilStart(startDate, today);
    const d = untilStart ?? 0;
    return {
      label: d === 0 ? '시작 D-DAY' : `시작 D-${d}`,
      ariaLabel: d === 0 ? '오늘 챌린지 시작' : `시작까지 ${d}일 남음`,
      tone: 'info',
      endingSoon: false,
    };
  }

  if (phase === 'ended') {
    return {
      label: '종료',
      ariaLabel: '종료된 챌린지',
      tone: 'ended',
      endingSoon: false,
    };
  }

  // active
  const untilEnd = getDaysUntilEnd(endDate, today);
  if (untilEnd == null) {
    return { label: '진행 중', ariaLabel: '진행 중인 챌린지', tone: 'default', endingSoon: false };
  }
  if (untilEnd === 0) {
    return {
      label: 'D-DAY',
      ariaLabel: '오늘 챌린지 종료',
      tone: 'warning',
      endingSoon: true,
    };
  }
  return {
    label: `D-${untilEnd}`,
    ariaLabel: `종료까지 ${untilEnd}일 남음`,
    tone: untilEnd <= 3 ? 'warning' : 'default',
    endingSoon: untilEnd <= 1,
  };
}
