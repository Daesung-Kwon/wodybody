import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { setGlobalRedirectToLogin } from './utils/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import MuiLoginPage from './components/MuiLoginPage';
import MuiRegisterPage from './components/MuiRegisterPage';
import MuiPasswordResetPage from './components/MuiPasswordResetPage';
import MuiNavigation from './components/MuiNavigation';
import MuiTodayPage from './components/MuiTodayPage';
import MuiPreferencesPage from './components/MuiPreferencesPage';
import MuiPersonalRecordsPage from './components/MuiPersonalRecordsPage';
import MuiStepBasedCreateProgramPage from './components/MuiStepBasedCreateProgramPage';
import MuiNotificationsPage from './components/MuiNotificationsPage';
import MuiWebSocketDebugger from './components/MuiWebSocketDebugger';
import {
    initNativeShell,
    attachDeepLinkHandler,
    attachPushNotificationTapHandler,
} from './utils/native';

// 개발 환경 전용 컴포넌트
const DemoPage = process.env.NODE_ENV === 'development'
    ? React.lazy(() => import('./components/DemoPage'))
    : null;

const AppContent: React.FC = () => {
    const { user, logout } = useAuth();
    const [page, setPage] = useState<Page>('login');
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (user) {
            setPage('today');
        } else {
            const hash = window.location.hash.substring(1);
            if (hash === 'demo' && process.env.NODE_ENV === 'development') {
                setPage('demo');
            } else {
                setPage('login');
            }
        }
    }, [user]);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash === 'demo' && !user && process.env.NODE_ENV === 'development') {
                setPage('demo');
            } else if (hash === '' && !user) {
                setPage('login');
            }
        };
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [user]);

    const redirectToLogin = (): void => {
        setPage('login');
    };

    useEffect(() => {
        setGlobalRedirectToLogin(redirectToLogin);
    }, []);

    // 네이티브 셸 초기화 (웹에서는 자동 no-op).
    useEffect(() => {
        initNativeShell().catch(() => {});
        let detachDeep: undefined | (() => void);
        let detachTap: undefined | (() => void);
        attachDeepLinkHandler((p) => setPage(p as Page))
            .then((fn) => { detachDeep = fn; })
            .catch(() => {});
        attachPushNotificationTapHandler((data) => {
            const target = data?.deeplink || data?.target;
            if (typeof target === 'string') {
                if (target.includes('today')) setPage('today');
                else if (target.includes('history')) setPage('history');
                else if (target.includes('library')) setPage('library');
                else if (target.includes('preferences')) setPage('preferences');
            } else {
                setPage('today');
            }
        })
            .then((fn) => { detachTap = fn; })
            .catch(() => {});
        return () => {
            detachDeep?.();
            detachTap?.();
        };
    }, []);

    return (
        <NotificationProvider userId={user?.id}>
            <AppWithNotifications
                user={user}
                page={page}
                setPage={setPage}
                logout={logout}
                showNotifications={showNotifications}
                setShowNotifications={setShowNotifications}
            />
        </NotificationProvider>
    );
};

const AppWithNotifications: React.FC<{
    user: any;
    page: Page;
    setPage: (page: Page) => void;
    logout: () => void;
    showNotifications: boolean;
    setShowNotifications: (show: boolean) => void;
}> = ({ user, page, setPage, logout, showNotifications, setShowNotifications }) => {
    const { unreadCount } = useNotifications();

    return (
        <div>
            {user ? (
                <>
                    <MuiNavigation
                        user={user}
                        currentPage={page}
                        onPageChange={(p: string) => setPage(p as Page)}
                        onLogout={logout}
                        onNotifications={() => setShowNotifications(true)}
                        unreadCount={unreadCount}
                    />

                    {showNotifications ? (
                        <MuiNotificationsPage onBack={() => setShowNotifications(false)} />
                    ) : (
                        <>
                            {page === 'today' && (
                                <MuiTodayPage goPreferences={() => setPage('preferences')} />
                            )}
                            {page === 'history' && <MuiPersonalRecordsPage />}
                            {page === 'library' && (
                                <MuiStepBasedCreateProgramPage
                                    goMy={() => setPage('library')}
                                    goPrograms={() => setPage('today')}
                                />
                            )}
                            {page === 'preferences' && (
                                <MuiPreferencesPage goBack={() => setPage('today')} />
                            )}
                            {page === 'create' && (
                                <MuiStepBasedCreateProgramPage
                                    goMy={() => setPage('library')}
                                    goPrograms={() => setPage('today')}
                                />
                            )}
                        </>
                    )}
                </>
            ) : (
                page === 'demo' && process.env.NODE_ENV === 'development' && DemoPage ? (
                    <React.Suspense fallback={<div>로딩 중...</div>}>
                        <DemoPage />
                    </React.Suspense>
                ) : page === 'login' ? (
                    <MuiLoginPage
                        setUser={() => { }}
                        goRegister={() => setPage('register')}
                        goPrograms={() => setPage('today')}
                        goPasswordReset={() => setPage('passwordReset')}
                    />
                ) : page === 'register' ? (
                    <MuiRegisterPage goLogin={() => setPage('login')} />
                ) : page === 'passwordReset' ? (
                    <MuiPasswordResetPage goLogin={() => setPage('login')} />
                ) : null
            )}
            <MuiWebSocketDebugger />
        </div>
    );
};

const App: React.FC = () => {
    const redirectToLogin = (): void => {
        // 페이지 상태는 AppContent에서 관리.
    };

    return (
        <AuthProvider onRedirectToLogin={redirectToLogin}>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
