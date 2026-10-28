/** E2 페이크도어 가격. 월액은 A/B, 연액은 고정. 결제 연동 없음. */

export type PremiumPriceVariant = 'a' | 'b';

export const PREMIUM_MONTHLY_KRW: Record<PremiumPriceVariant, number> = {
  a: 4900,
  b: 9900,
};

export const PREMIUM_ANNUAL_KRW = 39000;

export function premiumVariantFromSearch(search: string): PremiumPriceVariant {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = (params.get('variant') || params.get('ab') || '').trim().toLowerCase();
  if (raw === 'b' || raw === '9900') return 'b';
  return 'a';
}

export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * 출시 알림 수집기. 기본은 꺼짐.
 * VITE_PREMIUM_WAITLIST_ENABLED 가 정확히 'true' 가 아니면 네트워크를 호출하지 않는다.
 * 플래그가 켜져 있어도 이 초안은 수신 URL 을 두지 않아 주소를 전송하지 않는다.
 */
export function premiumWaitlistEnabled(): boolean {
  return import.meta.env.VITE_PREMIUM_WAITLIST_ENABLED === 'true';
}

export type WaitlistResult =
  | { sent: false; reason: 'disabled' }
  | { sent: false; reason: 'no_endpoint' };

export async function submitPremiumWaitlist(_email: string): Promise<WaitlistResult> {
  if (!premiumWaitlistEnabled()) return { sent: false, reason: 'disabled' };
  return { sent: false, reason: 'no_endpoint' };
}
