/**
 * Capacitor native shell helpers.
 *
 * Plugins are real dependencies of the web bundle so they load inside the
 * WebView. On the browser Capacitor.isNativePlatform() is false and every
 * function is a no-op.
 */
import { Capacitor } from '@capacitor/core';

export type NativePlatform = 'ios' | 'android' | 'web';

export interface PushRegistrationResult {
    platform: NativePlatform;
    token: string;
    appVersion?: string;
}

export function isNativePlatform(): boolean {
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

export function getPlatform(): NativePlatform {
    const p = Capacitor.getPlatform();
    if (p === 'ios' || p === 'android') return p;
    return 'web';
}

export async function ensureNativePushRegistered(): Promise<PushRegistrationResult | null> {
    if (!isNativePlatform()) return null;
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === 'granted';
        if (!granted) {
            const req = await PushNotifications.requestPermissions();
            granted = req.receive === 'granted';
        }
        if (!granted) return null;
        await PushNotifications.register();

        return await new Promise<PushRegistrationResult | null>((resolve) => {
            const timeout = setTimeout(() => resolve(null), 8000);
            PushNotifications.addListener('registration', async (token: { value: string }) => {
                clearTimeout(timeout);
                let appVersion: string | undefined;
                try {
                    const { App } = await import('@capacitor/app');
                    const info = await App.getInfo();
                    appVersion = info?.version;
                } catch {
                    /* optional */
                }
                resolve({
                    platform: getPlatform(),
                    token: token.value,
                    appVersion,
                });
            });
            PushNotifications.addListener('registrationError', () => {
                clearTimeout(timeout);
                resolve(null);
            });
        });
    } catch (e) {
        console.warn('[native] ensureNativePushRegistered failed', e);
        return null;
    }
}

export async function attachDeepLinkHandler(
    onPath: (path: string) => void
): Promise<() => void> {
    if (!isNativePlatform()) return () => undefined;
    try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('appUrlOpen', (event: { url: string }) => {
            try {
                const u = new URL(event.url);
                const host = u.host || u.pathname.replace(/^\//, '');
                const rest = u.pathname.replace(/^\//, '');
                if (host === 'today' || host === 'history' || host === 'library' || host === 'preferences') {
                    onPath(`/${host}`);
                    return;
                }
                if (host === 'burnfat' || rest.startsWith('burnfat') || host === 'c') {
                    const code = u.pathname.split('/').filter(Boolean).pop();
                    if (host === 'c' && code) onPath(`/burnfat/c/${code}`);
                    else onPath(`/burnfat${u.pathname}${u.search}`);
                    return;
                }
                if (u.protocol === 'wodybody:' && u.pathname) {
                    onPath(u.pathname.startsWith('/') ? u.pathname : `/${u.pathname}`);
                }
            } catch {
                /* ignore malformed urls */
            }
        });
        return () => { handle.remove(); };
    } catch (e) {
        console.warn('[native] attachDeepLinkHandler skipped', e);
        return () => undefined;
    }
}

export async function initNativeShell(): Promise<void> {
    if (!isNativePlatform()) return;

    try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Light });
    } catch { /* optional plugin */ }

    try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        setTimeout(() => { SplashScreen.hide().catch(() => undefined); }, 500);
    } catch { /* optional plugin */ }

    try {
        const { Keyboard } = await import('@capacitor/keyboard');
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch { /* optional plugin */ }
}

export async function attachPushNotificationTapHandler(
    onTap: (data: Record<string, unknown>) => void
): Promise<() => void> {
    if (!isNativePlatform()) return () => undefined;
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        const handle = await PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action: { notification: { data?: Record<string, unknown> } }) => {
                onTap(action?.notification?.data || {});
            }
        );
        return () => { handle.remove(); };
    } catch (e) {
        console.warn('[native] attachPushNotificationTapHandler skipped', e);
        return () => undefined;
    }
}
