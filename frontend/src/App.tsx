import React, { useCallback, useEffect } from 'react';
import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
    useLocation,
    useNavigate,
} from 'react-router-dom';
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
import { isBurnFatHost } from './lib/env';
import MuiAboutPage from './components/MuiAboutPage';

const BurnFatApp = React.lazy(() => import('./pages/BurnFatApp'));
import {
    initNativeShell,
    attachDeepLinkHandler,
    attachPushNotificationTapHandler,
} from './utils/native';

const DemoPage = import.meta.env.DEV
    ? React.lazy(() => import('./components/DemoPage'))
    : null;

const MuiWebSocketDebugger = import.meta.env.DEV
    ? React.lazy(() => import('./components/MuiWebSocketDebugger'))
    : null;

const RequireAuth: React.FC = () => {
    const { user, ready } = useAuth();
    const location = useLocation();
    if (!ready) return null;
    if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
    return <Outlet />;
};

const GuestOnly: React.FC = () => {
    const { user, ready } = useAuth();
    if (!ready) return null;
    if (user) return <Navigate to="/today" replace />;
    return <Outlet />;
};

const AppShellLayout: React.FC = () => {
    const { user, logout } = useAuth();
    const { unreadCount } = useNotifications();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        initNativeShell().catch(() => undefined);
        let detachDeep: undefined | (() => void);
        let detachTap: undefined | (() => void);
        attachDeepLinkHandler((path) => navigate(path))
            .then((fn) => { detachDeep = fn; })
            .catch(() => undefined);
        attachPushNotificationTapHandler((data) => {
            const target = data?.deeplink || data?.target;
            if (typeof target === 'string') {
                if (target.includes('burnfat')) navigate(target.startsWith('/') ? target : `/${target}`);
                else if (target.includes('today')) navigate('/today');
                else if (target.includes('history')) navigate('/history');
                else if (target.includes('library')) navigate('/library');
                else if (target.includes('preferences')) navigate('/preferences');
                else navigate('/today');
            } else {
                navigate('/today');
            }
        })
            .then((fn) => { detachTap = fn; })
            .catch(() => undefined);
        return () => {
            detachDeep?.();
            detachTap?.();
        };
    }, [navigate]);

    const page = location.pathname.replace(/^\//, '').split('/')[0] || 'today';

    return (
        <>
            <MuiNavigation
                user={user!}
                currentPage={page}
                onPageChange={(p: string) => navigate(`/${p}`)}
                onLogout={() => { void logout(); }}
                onNotifications={() => navigate('/notifications')}
                unreadCount={unreadCount}
            />
            <Outlet />
            {MuiWebSocketDebugger ? (
                <React.Suspense fallback={null}>
                    <MuiWebSocketDebugger />
                </React.Suspense>
            ) : null}
        </>
    );
};

const AppShell: React.FC = () => {
    const { user } = useAuth();
    return (
        <NotificationProvider userId={user?.id}>
            <AppShellLayout />
        </NotificationProvider>
    );
};

const AppRoutes: React.FC = () => {
    const navigate = useNavigate();

    return (
        <Routes>
            <Route element={<GuestOnly />}>
                <Route
                    path="/login"
                    element={(
                        <MuiLoginPage
                            setUser={() => undefined}
                            goRegister={() => navigate('/register')}
                            goPrograms={() => navigate('/today')}
                            goPasswordReset={() => navigate('/reset-password')}
                        />
                    )}
                />
                <Route path="/register" element={<MuiRegisterPage goLogin={() => navigate('/login')} />} />
                <Route path="/reset-password" element={<MuiPasswordResetPage goLogin={() => navigate('/login')} />} />
                {DemoPage ? (
                    <Route
                        path="/demo"
                        element={(
                            <React.Suspense fallback={<div>로딩 중...</div>}>
                                <DemoPage />
                            </React.Suspense>
                        )}
                    />
                ) : null}
            </Route>

            <Route element={<RequireAuth />}>
                <Route element={<AppShell />}>
                    <Route path="/today" element={<MuiTodayPage goPreferences={() => navigate('/preferences')} />} />
                    <Route path="/history" element={<MuiPersonalRecordsPage />} />
                    <Route
                        path="/library"
                        element={(
                            <MuiStepBasedCreateProgramPage
                                goMy={() => navigate('/library')}
                                goPrograms={() => navigate('/today')}
                            />
                        )}
                    />
                    <Route
                        path="/create"
                        element={(
                            <MuiStepBasedCreateProgramPage
                                goMy={() => navigate('/library')}
                                goPrograms={() => navigate('/today')}
                            />
                        )}
                    />
                    <Route path="/preferences" element={<MuiPreferencesPage goBack={() => navigate('/today')} />} />
                    <Route path="/notifications" element={<MuiNotificationsPage onBack={() => navigate(-1)} />} />
                    <Route path="/about" element={<MuiAboutPage />} />
                </Route>
            </Route>

            <Route
                path="/burnfat/*"
                element={(
                    <React.Suspense fallback={null}>
                        <BurnFatApp />
                    </React.Suspense>
                )}
            />
            <Route path="/" element={<Navigate to="/today" replace />} />
            <Route path="*" element={<Navigate to="/today" replace />} />
        </Routes>
    );
};

const AppInner: React.FC = () => {
    const navigate = useNavigate();
    const redirectToLogin = useCallback(() => {
        navigate('/login', { replace: true });
    }, [navigate]);

    return (
        <AuthProvider onRedirectToLogin={redirectToLogin}>
            <AppRoutes />
        </AuthProvider>
    );
};

const App: React.FC = () => (
    <BrowserRouter>
        {isBurnFatHost() ? (
            <React.Suspense fallback={null}>
                <BurnFatApp />
            </React.Suspense>
        ) : (
            <AppInner />
        )}
    </BrowserRouter>
);

export default App;
