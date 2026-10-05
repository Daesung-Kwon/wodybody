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
    if (import.meta.env.DEV) {
        console.error('VITE_API_URL is not set; API calls will fail outside localhost.');
    }
    return '';
}

export function isBurnFatHost(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'burnfat.wodybody.com' || host.startsWith('burnfat.');
}
