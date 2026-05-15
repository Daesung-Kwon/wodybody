/**
 * Sprint 1 — 상금 분배 계산.
 *
 * BurnFat 은 *지인 내기* 모델이다. 각 참가자가 `stakeAmount` 원을 걸고,
 * 전체 상금 풀(`pot`) 은 `stakeAmount × 참가자 수`.
 *
 * 분배 규칙은 대결방마다 합의로 달라질 수 있으나, 제품이 명시 규칙을 정하기 전까지는
 * 가장 흔한 *승자독식(1등 전액 획득)* 을 기본 가정으로 보여 준다. 공유 카드에는
 * 이것이 "예상" 정산임을 캡션으로 함께 명시한다.
 */

export const PRIZE_RULE_LABEL = '1등 전액 획득 (승자독식)';

export interface PrizeDistribution {
  /** 전체 상금 풀 = stakeAmount × participantCount. */
  pot: number;
  participantCount: number;
  stakeAmount: number;
  /** 1등 순이익 = pot − 본인 참가비. */
  winnerNet: number;
  /** 2등 이하 순손실 = −본인 참가비 (참가자 2명 이상일 때). */
  loserNet: number;
  /** 분배 금액이 의미 있는지 (참가비>0 && 참가자 2명 이상). */
  hasPrize: boolean;
}

export function computePrizeDistribution(
  stakeAmount: number,
  participantCount: number
): PrizeDistribution {
  const stake = Math.max(0, Math.round(stakeAmount || 0));
  const count = Math.max(0, Math.floor(participantCount || 0));
  const pot = stake * count;
  return {
    pot,
    participantCount: count,
    stakeAmount: stake,
    winnerNet: pot - stake,
    loserNet: -stake,
    hasPrize: stake > 0 && count >= 2,
  };
}

/** 원화 표기 — 음수는 "-" 접두. 예: 250000 → "250,000원", -50000 → "-50,000원". */
export function formatKrw(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const sign = amount < 0 ? '-' : '';
  return `${sign}${abs.toLocaleString('ko-KR')}원`;
}
