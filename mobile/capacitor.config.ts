import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.wodybody.app',
    appName: 'WODYBODY',
    webDir: '../frontend/dist',
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
        contentInset: 'automatic',
        scheme: 'wodybody',
    },
    android: {
        allowMixedContent: false,
    },
};

export default config;
