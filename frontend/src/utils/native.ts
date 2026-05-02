/**
 * Capacitor 네이티브 셸 통합 헬퍼.
 *
 * 핵심 원칙:
 *   - 모든 ``@capacitor/*`` import는 **동적 import**로 처리해 CRA(웹) 빌드에서
 *     모듈이 설치되지 않아도 빌드가 깨지지 않도록 한다.
 *   - 모든 함수는 `Capacitor.isNativePlatform()` 가드 뒤에서만 동작한다.
 *   - 토큰 등록 결과는 호출자(예: MuiPreferencesPage)에서 백엔드로 전송한다.
 */

export type NativePlatform = 'ios' | 'android' | 'web';

export interface PushRegistrationResult {
    platform: NativePlatform;
    token: string;
    appVersion?: string;
}

let _isNative: boolean | null = null;

async function _getCapacitor(): Promise<any | null> {
    try {
        const mod = await import(/* webpackIgnore: true */ '@capacitor/core' as any);
        return mod;
    } catch {
        return null;
    }
}

export async function isNativePlatform(): Promise<boolean> {
    if (_isNative !== null) return _isNative;
    const cap = await _getCapacitor();
    if (!cap || !cap.Capacitor) {
        _isNative = false;
        return false;
    }
    _isNative = !!cap.Capacitor.isNativePlatform?.();
    return _isNative;
}

export async function getPlatform(): Promise<NativePlatform> {
    const cap = await _getCapacitor();
    const p: string | undefined = cap?.Capacitor?.getPlatform?.();
    if (p === 'ios' || p === 'android') return p;
    return 'web';
}

/**
 * 푸시 알림 등록을 보장하고 토큰을 반환한다.
 * 웹 또는 모듈 미설치 시 null.
 */
export async function ensureNativePushRegistered(): Promise<PushRegistrationResult | null> {
    if (!(await isNativePlatform())) return null;
    let PushNotifications: any;
    let App: any;
    try {
        PushNotifications = (await import(/* webpackIgnore: true */ '@capacitor/push-notifications' as any)).PushNotifications;
        try {
            App = (await import(/* webpackIgnore: true */ '@capacitor/app' as any)).App;
        } catch {
            App = null;
        }
    } catch (e) {
        console.warn('[native] @capacitor/push-notifications not installed', e);
        return null;
    }

    try {
        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === 'granted';
        if (!granted) {
            const req = await PushNotifications.requestPermissions();
            granted = req.receive === 'granted';
        }
        if (!granted) {
            console.warn('[native] push permission denied');
            return null;
        }
        await PushNotifications.register();

        return await new Promise<PushRegistrationResult | null>((resolve) => {
            const cleanup: Array<() => void> = [];
            const timeout = setTimeout(() => {
                cleanup.forEach(fn => fn());
                resolve(null);
            }, 8000);

            PushNotifications.addListener('registration', async (token: { value: string }) => {
                clearTimeout(timeout);
                cleanup.forEach(fn => fn());
                const platform = await getPlatform();
                let appVersion: string | undefined;
                try {
                    if (App) {
                        const info = await App.getInfo();
                        appVersion = info?.version;
                    }
                } catch {}
                resolve({
                    platform: platform === 'web' ? 'web' : platform,
                    token: token.value,
                    appVersion,
                });
            }).then((handle: any) => cleanup.push(() => handle?.remove?.()));

            PushNotifications.addListener('registrationError', (err: any) => {
                console.warn('[native] registrationError', err);
                clearTimeout(timeout);
                cleanup.forEach(fn => fn());
                resolve(null);
            }).then((handle: any) => cleanup.push(() => handle?.remove?.()));
        });
    } catch (e) {
        console.warn('[native] ensureNativePushRegistered failed', e);
        return null;
    }
}

/**
 * 딥링크 핸들러 — wodybody://today 등이 들어오면 페이지 라우팅 콜백 호출.
 * App.tsx의 useEffect 내부에서 1회 등록.
 */
export async function attachDeepLinkHandler(
    onPage: (page: 'today' | 'history' | 'library' | 'preferences') => void
): Promise<() => void> {
    if (!(await isNativePlatform())) return () => {};
    try {
        const { App } = await import(/* webpackIgnore: true */ '@capacitor/app' as any);
        const handle = await App.addListener('appUrlOpen', (event: { url: string }) => {
            try {
                const u = new URL(event.url);
                const host = u.host || u.pathname.replace(/^\//, '');
                if (host === 'today' || host === 'history' || host === 'library' || host === 'preferences') {
                    onPage(host);
                }
            } catch {}
        });
        return () => handle?.remove?.();
    } catch (e) {
        console.warn('[native] attachDeepLinkHandler skipped', e);
        return () => {};
    }
}

/**
 * 상태바·스플래시·키보드 초기 설정.
 */
export async function initNativeShell(): Promise<void> {
    if (!(await isNativePlatform())) return;

    try {
        const { StatusBar, Style } = await import(/* webpackIgnore: true */ '@capacitor/status-bar' as any);
        await StatusBar.setStyle({ style: Style.Light });
    } catch {}

    try {
        const { SplashScreen } = await import(/* webpackIgnore: true */ '@capacitor/splash-screen' as any);
        setTimeout(() => SplashScreen.hide().catch(() => {}), 500);
    } catch {}

    try {
        const { Keyboard } = await import(/* webpackIgnore: true */ '@capacitor/keyboard' as any);
        await Keyboard.setAccessoryBarVisible({ isVisible: false });
    } catch {}
}

/**
 * 푸시 도착 시 인앱 알림 또는 페이지 이동.
 * 호출자가 onTap 콜백을 등록하면 사용자가 푸시를 탭했을 때 page로 이동.
 */
export async function attachPushNotificationTapHandler(
    onTap: (data: Record<string, any>) => void
): Promise<() => void> {
    if (!(await isNativePlatform())) return () => {};
    try {
        const { PushNotifications } = await import(/* webpackIgnore: true */ '@capacitor/push-notifications' as any);
        const handle = await PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action: { notification: { data?: Record<string, any> } }) => {
                onTap(action?.notification?.data || {});
            }
        );
        return () => handle?.remove?.();
    } catch (e) {
        console.warn('[native] attachPushNotificationTapHandler skipped', e);
        return () => {};
    }
}
