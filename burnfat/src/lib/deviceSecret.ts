/**
 * 디바이스 시크릿 — 한 번 INSERT 한 클라이언트만 24시간 내 UPDATE 할 수 있게 만드는 가벼운 토큰.
 *
 * 흐름
 *   1. INSERT 시점에 32바이트 랜덤을 생성 → SHA-256 hex digest 를 서버에 저장
 *      (DB 컬럼: submissions.device_secret_hash, weekly_logs.device_secret_hash)
 *   2. plain 시크릿은 localStorage 에 저장.
 *      key: `burnfat:device:<table>:<row_id>` 형태
 *   3. UPDATE 시 plain 시크릿을 서버 RPC 로 전송 → 서버에서 SHA-256 재계산 후 일치 비교
 *
 * 보안 모델
 *   - 32바이트 high-entropy 토큰이라 솔트 없는 SHA-256 으로 충분 (사전공격 불가)
 *   - 다른 사용자/디바이스는 시크릿을 알 수 없어 UPDATE 차단
 *   - 24시간 윈도우는 서버측 RPC 에서 강제
 *
 * NOTE: 토큰은 동일 디바이스/브라우저 내에서만 유효합니다. 시크릿 모드 / 브라우저 변경 시
 *       이전 기록을 본인이 만들었더라도 수정할 수 없습니다 (의도된 동작).
 */

const STORAGE_PREFIX = 'burnfat:device:';

/** 32 바이트 랜덤 plain device_secret 생성 (64자 hex) */
export function generateDeviceSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** plain → SHA-256 hex 환산. 서버에 저장할 값. */
export async function hashDeviceSecret(plain: string): Promise<string> {
  const buf = new TextEncoder().encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

type Table = 'submissions' | 'weekly_logs';

const storageKey = (table: Table, rowId: string) => `${STORAGE_PREFIX}${table}:${rowId}`;

/** plain 시크릿을 localStorage 에 저장. 실패해도 throw 하지 않음(시크릿 모드 등). */
export function saveDeviceSecret(table: Table, rowId: string, plain: string): void {
  try {
    window.localStorage.setItem(storageKey(table, rowId), plain);
  } catch {
    // ignore — UPDATE 권한 손실로 이어지지만 INSERT 자체는 성공 처리
  }
}

/** 저장된 plain 시크릿 조회. 없으면 null. */
export function loadDeviceSecret(table: Table, rowId: string): string | null {
  try {
    return window.localStorage.getItem(storageKey(table, rowId));
  } catch {
    return null;
  }
}

/** 시크릿 폐기 (필요 시) */
export function clearDeviceSecret(table: Table, rowId: string): void {
  try {
    window.localStorage.removeItem(storageKey(table, rowId));
  } catch {
    // ignore
  }
}

/** INSERT 사이클: 새 시크릿 발급 → 해시 반환(서버 저장용) + 저장 함수 반환 */
export async function prepareDeviceSecret(table: Table): Promise<{
  plain: string;
  hash: string;
  persist: (rowId: string) => void;
}> {
  const plain = generateDeviceSecret();
  const hash = await hashDeviceSecret(plain);
  return {
    plain,
    hash,
    persist: (rowId: string) => saveDeviceSecret(table, rowId, plain),
  };
}
