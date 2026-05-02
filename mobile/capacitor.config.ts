import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.wodybody.app',
    appName: 'WODYBODY',
    // CRA 빌드 결과물을 그대로 사용한다. mobile/에서는 frontend의 빌드 산출물을 참조.
    webDir: '../frontend/build',
    // 푸시/딥링크 통합을 위한 기본값
    server: {
        // 운영에서는 실 도메인을 hostname에 지정하거나 androidScheme/iosScheme 조합 사용.
        // 개발 시 frontend dev server 직접 연결을 원하면 url을 주석 해제.
        // url: 'http://localhost:3000',
        // cleartext: true,
        androidScheme: 'https',
        iosScheme: 'https',
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 1500,
            backgroundColor: '#1976d2',
            androidSplashResourceName: 'splash',
            androidScaleType: 'CENTER_CROP',
            showSpinner: false,
        },
        PushNotifications: {
            presentationOptions: ['badge', 'sound', 'alert'],
        },
        Keyboard: {
            resize: 'native',
        },
    },
    ios: {
        // 사용자 토큰을 안전 저장소(Keychain)에 보관하기 위한 옵션은 별도 설정.
        contentInset: 'automatic',
    },
    android: {
        allowMixedContent: false,
    },
};

export default config;
