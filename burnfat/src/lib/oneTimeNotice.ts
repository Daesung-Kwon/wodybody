/**
 * Sprint 1 — 일회성 안내 노출 가드.
 *
 * "이 챌린지에서 이 안내를 이미 봤는가" 를 localStorage 로 기록한다.
 * 토스트·배너 등 *1회만 노출* 하고 싶은 안내에 공용으로 쓴다.
 *
 * 키 예시: `backfill:<challengeId>`, `endingSoon:<challengeId>`.
 */

const PREFIX = 'burnfat:notice:';

/**
 * 해당 안내를 이미 봤으면 true.
 * localStorage 접근 실패 시에도 true 를 반환해 *반복 노출(스팸) 을 막는* 보수적 처리.
 */
export function hasSeenNotice(key: string): boolean {
  if (!key) return true;
  try {
    return localStorage.getItem(`${PREFIX}${key}`) != null;
  } catch {
    return true;
  }
}

export function markNoticeSeen(key: string): void {
  if (!key) return;
  try {
    localStorage.setItem(`${PREFIX}${key}`, new Date().toISOString());
  } catch {
    // 무시
  }
}
