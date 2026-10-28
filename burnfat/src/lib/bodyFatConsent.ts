/**
 * G3 — 체지방(제23조 민감정보) 별도 동의.
 *
 * 스키마에 동의 시각 컬럼이 없고, 이 변경은 마이그레이션을 적용하지 않는다.
 * 동의 시각은 이 기기의 localStorage 에만 남긴다. 기록에는 체지방 숫자를 넣지 않는다.
 *
 * 서버 RPC 는 여전히 동의 행을 검사하지 않는다. 클라이언트 게이트가 저장을 막고,
 * 서버 강제는 소유자 승인 마이그레이션 뒤의 일이다.
 */

export const BODY_FAT_CONSENT_POLICY_VERSION = '2026-10-28';
export const BODY_FAT_CONSENT_PURPOSE = 'body_fat' as const;

export const BODY_FAT_BLOCK_MESSAGE =
  '체지방 입력은 선택입니다. 동의 후에만 저장됩니다.';

export const BODY_FAT_CONSENT_CHECKBOX_LABEL =
  '위 내용으로 체지방 정보를 수집·저장하는 데 동의합니다.';

export interface BodyFatConsentRecord {
  consentedAt: string;
  policyVersion: string;
  purpose: typeof BODY_FAT_CONSENT_PURPOSE;
  participantId: string;
}

const storageKey = (participantId: string) => `burnfat:body-fat-consent:${participantId}`;

function isRecord(value: unknown, participantId: string): value is BodyFatConsentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Partial<BodyFatConsentRecord>;
  return (
    row.purpose === BODY_FAT_CONSENT_PURPOSE &&
    row.policyVersion === BODY_FAT_CONSENT_POLICY_VERSION &&
    row.participantId === participantId &&
    typeof row.consentedAt === 'string' &&
    row.consentedAt.length > 0
  );
}

export function readBodyFatConsent(participantId: string): BodyFatConsentRecord | null {
  if (!participantId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(participantId));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed, participantId) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasBodyFatConsent(participantId: string): boolean {
  return readBodyFatConsent(participantId) != null;
}

/** 동의 시각을 저장한다. 이미 같은 버전의 기록이 있으면 처음 시각을 유지한다. */
export function saveBodyFatConsent(
  participantId: string,
  now: Date = new Date()
): BodyFatConsentRecord {
  const existing = readBodyFatConsent(participantId);
  if (existing) return existing;
  const record: BodyFatConsentRecord = {
    consentedAt: now.toISOString(),
    policyVersion: BODY_FAT_CONSENT_POLICY_VERSION,
    purpose: BODY_FAT_CONSENT_PURPOSE,
    participantId,
  };
  try {
    window.localStorage.setItem(storageKey(participantId), JSON.stringify(record));
  } catch {
    /* private mode — 이번 제출의 체크는 통과해도 다음 방문에 다시 묻는다 */
  }
  return record;
}

/**
 * 체지방 값이 있으면 체크(동의) 없이 저장 경로로 가지 않는다.
 * 값이 없으면 다른 필드는 저장할 수 있다.
 */
export function gateBodyFatWrite(
  bodyFatProvided: boolean,
  consentChecked: boolean
): { ok: true } | { ok: false; message: string } {
  if (!bodyFatProvided) return { ok: true };
  if (!consentChecked) return { ok: false, message: BODY_FAT_BLOCK_MESSAGE };
  return { ok: true };
}
