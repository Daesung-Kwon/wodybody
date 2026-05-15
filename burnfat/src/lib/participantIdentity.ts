/**
 * Sprint 1 — "내 참가자 식별".
 *
 * 신뢰 기반 공개형 모델에서 *인증* 은 device_secret(쓰기 잠금) 이 담당한다.
 * 이 모듈은 인증이 아니라 *UX 편의를 위한 식별* 만 다룬다 —
 * "이 디바이스에서 마지막으로 이 챌린지에 등록·선택한 참가자가 누구인가".
 *
 * 챌린지당 1명을 localStorage 에 매핑한다. 키: `burnfat:identity:<challengeId>`.
 * 값이 실제 참가자와 불일치(삭제됨 등)할 수 있으므로, 호출 측은
 * 반환된 id 가 현재 참가자 목록에 존재하는지 반드시 검증해야 한다.
 */

const KEY_PREFIX = 'burnfat:identity:';

function keyFor(challengeId: string): string {
  return `${KEY_PREFIX}${challengeId}`;
}

/** 이 디바이스의 "나" 를 해당 챌린지에 대해 기억한다. */
export function rememberParticipant(challengeId: string, participantId: string): void {
  if (!challengeId || !participantId) return;
  try {
    localStorage.setItem(keyFor(challengeId), participantId);
  } catch {
    // localStorage 미지원/할당 초과는 무시 — 식별은 부가 기능이라 실패해도 앱은 동작.
  }
}

/** 기억된 참가자 id 를 반환. 없으면 null. */
export function getRememberedParticipantId(challengeId: string): string | null {
  if (!challengeId) return null;
  try {
    return localStorage.getItem(keyFor(challengeId));
  } catch {
    return null;
  }
}

/** 식별 해제 ("내가 아니에요"). */
export function forgetParticipant(challengeId: string): void {
  if (!challengeId) return;
  try {
    localStorage.removeItem(keyFor(challengeId));
  } catch {
    // 무시
  }
}
