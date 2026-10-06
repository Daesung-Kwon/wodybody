/** Production API host used when VITE_API_URL is unset (CRA-era default). */
export const DEFAULT_PRODUCTION_API_URL = 'https://wodybody-production.up.railway.app';

export function apiBaseUrl(): string {
    const fromEnv = String(
        import.meta.env.VITE_API_URL || import.meta.env.REACT_APP_API_URL || ''
    ).trim().replace(/\/$/, '');
    if (fromEnv) return fromEnv;
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return 'http://localhost:5001';
        }
    }
    // VITE_API_URL comes from Vercel project envs (vercel.json no longer carries a
    // top-level `env`; it never injected into Vite builds anyway). Keep Railway as a
    // safe production fallback matching CRA behavior.
    return DEFAULT_PRODUCTION_API_URL;
}

export function isBurnFatHost(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'burnfat.wodybody.com' || host.startsWith('burnfat.');
}
