/**
 * G4 — xAI 국외 이전 옵트인 (제28조의8).
 *
 * 기본값은 꺼짐. 동의 시각은 이 기기 localStorage 에만 둔다 (마이그레이션 없음).
 * 서버는 요청의 xai_transfer_consent / X-Xai-Transfer-Consent 가 참일 때만 xAI 를 호출한다.
 * 플래그만으로는 위조를 막지 못한다. 영속 서버 기록은 소유자 승인 뒤의 일이다.
 */

export const XAI_TRANSFER_POLICY_VERSION = '2026-10-28';
export const XAI_TRANSFER_PURPOSE = 'xai_transfer' as const;
export const XAI_TRANSFER_STORAGE_KEY = 'wodybody:xai-transfer-consent';
export const XAI_CONSENT_HEADER = 'X-Xai-Transfer-Consent';

export const XAI_CONSENT_REQUIRED_MESSAGE =
  'AI 기능은 국외 이전 동의 후에만 사용할 수 있어요.';

export interface XaiTransferConsentRecord {
  consentedAt: string;
  policyVersion: string;
  purpose: typeof XAI_TRANSFER_PURPOSE;
}

function isRecord(value: unknown): value is XaiTransferConsentRecord {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Partial<XaiTransferConsentRecord>;
  return (
    row.purpose === XAI_TRANSFER_PURPOSE &&
    row.policyVersion === XAI_TRANSFER_POLICY_VERSION &&
    typeof row.consentedAt === 'string' &&
    row.consentedAt.length > 0
  );
}

export function readXaiTransferConsent(): XaiTransferConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(XAI_TRANSFER_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasXaiTransferConsent(): boolean {
  return readXaiTransferConsent() != null;
}

export function saveXaiTransferConsent(now: Date = new Date()): XaiTransferConsentRecord {
  const existing = readXaiTransferConsent();
  if (existing) return existing;
  const record: XaiTransferConsentRecord = {
    consentedAt: now.toISOString(),
    policyVersion: XAI_TRANSFER_POLICY_VERSION,
    purpose: XAI_TRANSFER_PURPOSE,
  };
  try {
    window.localStorage.setItem(XAI_TRANSFER_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode */
  }
  return record;
}

export function clearXaiTransferConsent(): void {
  try {
    window.localStorage.removeItem(XAI_TRANSFER_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** 동의된 경우에만 서버가 받는 본문 플래그. 없으면 키 자체를 넣지 않는다. */
export function xaiTransferConsentFields(): { xai_transfer_consent: true } | Record<string, never> {
  return hasXaiTransferConsent() ? { xai_transfer_consent: true } : {};
}

export function xaiTransferConsentHeaders(): Record<string, string> {
  return hasXaiTransferConsent() ? { [XAI_CONSENT_HEADER]: 'true' } : {};
}
