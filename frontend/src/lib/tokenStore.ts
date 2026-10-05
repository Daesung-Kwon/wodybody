/**
 * Access-token storage used by both the web app and the Capacitor shell.
 * Native: @capacitor/preferences (Keychain / EncryptedSharedPreferences).
 * Web: localStorage.
 */
import { Capacitor } from '@capacitor/core';

const TOKEN_KEY = 'access_token';

let memory: string | null | undefined;

function isNative(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

export async function getAccessToken(): Promise<string | null> {
    if (memory !== undefined) return memory;
    if (isNative()) {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: TOKEN_KEY });
        memory = value ?? null;
        return memory;
    }
    if (typeof window === 'undefined') return null;
    memory = window.localStorage.getItem(TOKEN_KEY);
    return memory;
}

export async function setAccessToken(token: string | null): Promise<void> {
    memory = token;
    if (isNative()) {
        const { Preferences } = await import('@capacitor/preferences');
        if (token) await Preferences.set({ key: TOKEN_KEY, value: token });
        else await Preferences.remove({ key: TOKEN_KEY });
        return;
    }
    if (typeof window === 'undefined') return;
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
}

export function peekAccessToken(): string | null {
    return memory ?? null;
}
