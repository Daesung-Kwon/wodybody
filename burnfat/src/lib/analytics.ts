/**
 * Sprint 3 Phase C — 도구 독립적 분석 이벤트 래퍼.
 *
 * 현재 백엔드는 Plausible (index.html 의 script 태그가 window.plausible 을 제공).
 * 도구를 바꾸더라도 호출부(track)는 그대로 두고 이 파일만 교체하면 된다.
 *
 * 원칙:
 *  - `VITE_ANALYTICS_DOMAIN` 미설정 시 완전 no-op (개발·E2E 환경 보호).
 *  - PII(이메일/전화/닉네임 등) 자동 필터 — props 에서 제거 후 전송.
 *  - fire-and-forget — 실패해도 사용자 경험에 영향 0.
 */

type AnalyticsProps = Record<string, unknown>;

declare global {
  interface Window {
    plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
  }
}

/** PII 로 의심되는 키 이름 (대소문자 무시). */
const PII_KEY_RE =
  /(e[-_]?mail|phone|tel|mobile|nickname|nick|first[-_]?name|last[-_]?name|full[-_]?name|address|passwd|password|secret|token|device[-_]?secret)/i;
/** 값 자체가 이메일/전화번호 형태인지. */
const EMAIL_RE = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const PHONE_RE = /(?:\+?\d[\d\-\s().]{7,}\d)/;

function looksLikePii(key: string, value: unknown): boolean {
  if (PII_KEY_RE.test(key)) return true;
  if (typeof value === 'string' && (EMAIL_RE.test(value) || PHONE_RE.test(value))) return true;
  return false;
}

/**
 * props 에서 PII 로 의심되는 항목을 제거한 사본을 반환한다.
 * (테스트 가능하도록 export — 호출부는 track 만 쓰면 된다.)
 */
export function sanitizeProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const clean: AnalyticsProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (looksLikePii(key, value)) continue;
    clean[key] = value;
  }
  return clean;
}

/**
 * 분석 이벤트 1건 전송. 도구 미설정이면 no-op.
 * @param event 이벤트 이름 (예: 'challenge_created')
 * @param props 이벤트 속성 — PII 는 자동 제거된다.
 */
export function track(event: string, props?: AnalyticsProps): void {
  // 도메인 미설정(개발·E2E) → 전송하지 않음.
  if (!import.meta.env.VITE_ANALYTICS_DOMAIN) return;
  try {
    const clean = sanitizeProps(props);
    window.plausible?.(event, clean && Object.keys(clean).length > 0 ? { props: clean } : undefined);
  } catch {
    /* fire-and-forget — 분석 실패는 사용자에게 영향 0 */
  }
}
