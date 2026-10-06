import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PRODUCTION_API_URL, apiBaseUrl } from './env';

describe('apiBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('prefers VITE_API_URL and strips trailing slash', () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
    expect(apiBaseUrl()).toBe('https://api.example.com');
  });

  it('falls back to Railway URL outside localhost when unset', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('REACT_APP_API_URL', '');
    vi.stubGlobal('window', {
      location: { hostname: 'www.wodybody.com' },
    });
    expect(apiBaseUrl()).toBe(DEFAULT_PRODUCTION_API_URL);
  });

  it('uses localhost backend on local hostnames', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubEnv('REACT_APP_API_URL', '');
    vi.stubGlobal('window', {
      location: { hostname: 'localhost' },
    });
    expect(apiBaseUrl()).toBe('http://localhost:5001');
  });
});
