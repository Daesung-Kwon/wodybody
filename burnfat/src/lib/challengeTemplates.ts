/**
 * Sprint 2 — 챌린지 생성 템플릿(프리셋).
 *
 * 재참여 사용자의 생성 마찰을 줄이기 위해 기간·참가비 조합을 프리셋으로 제공한다.
 * 순수 데이터 + 순수 함수.
 */

export interface ChallengeTemplate {
  id: string;
  label: string;
  /** 챌린지 기간(주). 종료일 계산에 사용. */
  weeks: number;
  /** 1인 참가비(원). */
  stakeAmount: number;
  /** 카드에 표시할 한 줄 설명. */
  description: string;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: '4w',
    label: '4주 챌린지',
    weeks: 4,
    stakeAmount: 50000,
    description: '짧고 굵게 — 한 달 집중 감량',
  },
  {
    id: '8w',
    label: '8주 챌린지',
    weeks: 8,
    stakeAmount: 100000,
    description: '두 달 — 눈에 띄는 변화',
  },
  {
    id: '12w',
    label: '12주 챌린지',
    weeks: 12,
    stakeAmount: 200000,
    description: '시즌 단위 — 습관까지 정착',
  },
];

/**
 * 시작일 + 주(week) 수 → 종료일(YYYY-MM-DD).
 * UTC 기준으로 계산해 타임존에 무관하게 결정적.
 */
export function templateEndDate(startDate: string, weeks: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate);
  if (!m) return startDate;
  const baseMs = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const end = new Date(baseMs + weeks * 7 * 24 * 60 * 60 * 1000);
  const y = end.getUTCFullYear();
  const mo = String(end.getUTCMonth() + 1).padStart(2, '0');
  const da = String(end.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}
