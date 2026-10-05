/**
 * BurnFat URLs work in two embeddings:
 * - standalone (burnfat.wodybody.com, or this package's own Vite) → /c/:code
 * - unified WODYBODY app / Capacitor → /burnfat/c/:code
 */
let standalone = false;

export function setBurnFatStandalone(value: boolean): void {
  standalone = value;
}

export function isBurnFatStandalone(): boolean {
  if (standalone) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'burnfat.wodybody.com' || host.startsWith('burnfat.');
}

export function bfPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (isBurnFatStandalone()) return normalized;
  if (normalized === '/') return '/burnfat';
  return `/burnfat${normalized}`;
}

export function bfPublicChallengeUrl(code: string): string {
  if (typeof window !== 'undefined' && isBurnFatStandalone()) {
    return `${window.location.origin}/c/${code}`;
  }
  return `https://burnfat.wodybody.com/c/${code}`;
}
