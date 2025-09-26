import React, { useState, useEffect } from 'react';
import './App.css';
import { Page } from './types';
import { setGlobalRedirectToLogin } from './utils/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
// import LoginPage from './components/LoginPage';
// import RegisterPage from './components/RegisterPage';
import MuiLoginPage from './components/MuiLoginPage';
import MuiRegisterPage from './components/MuiRegisterPage';
import MuiNavigation from './components/MuiNavigation';
import ProgramsPage from './components/ProgramsPage';
import MuiProgramsPage from './components/MuiProgramsPage';
import MyProgramsPage from './components/MyProgramsPage';
import PersonalRecordsPage from './components/PersonalRecordsPage';
import StepBasedCreateProgramPage from './components/StepBasedCreateProgramPage';
import NotificationsPage from './components/NotificationsPage';
import MuiNotificationsPage from './components/MuiNotificationsPage';
import WebSocketDebugger from './components/WebSocketDebugger';
import MuiWebSocketDebugger from './components/MuiWebSocketDebugger';
import MuiExample from './components/common/MuiExample';

// 알림 아이콘 컴포넌트 (MUI Navigation에서 처리하므로 주석 처리)
// const NotificationIcon: React.FC<{ onClick: () => void }> = ({ onClick }) => {
//     const { unreadCount } = useNotifications();

//     return (
//         <button
//             className={`notification-icon-button ${unreadCount > 0 ? 'has-notifications' : ''}`}
//             onClick={onClick}
//             title="알림"
//         >
//             🔔
//             {unreadCount > 0 && (
//                 <span className="notification-badge">{unreadCount}</span>
//             )}
//         </button>
//     );
// };

const AppContent: React.FC = () => {
    const { user, logout } = useAuth();
    const [page, setPage] = useState<Page>('login');
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if (user) {
            setPage('programs');
        } else {
            setPage('login');
        }
    }, [user]);

    const redirectToLogin = (): void => {
        setPage('login');
    };

    // 전역 리다이렉트 함수 설정
    useEffect(() => {
        setGlobalRedirectToLogin(redirectToLogin);
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

// NotificationProvider 내부에서 useNotifications를 사용하는 컴포넌트
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
        <div className="app">
            {user ? (
                <>
                    <MuiNavigation
                        user={user}
                        currentPage={page}
                        onPageChange={(page: string) => setPage(page as Page)}
                        onLogout={logout}
                        onNotifications={() => setShowNotifications(true)}
                        unreadCount={unreadCount}
                    />

                    {showNotifications ? (
                        <MuiNotificationsPage onBack={() => setShowNotifications(false)} />
                    ) : (
                        <>
                            {page === 'programs' && <MuiProgramsPage />}
                            {page === 'my' && <MyProgramsPage />}
                            {page === 'records' && <PersonalRecordsPage />}
                            {page === 'create' && (
                                <StepBasedCreateProgramPage
                                    goMy={() => setPage('my')}
                                    goPrograms={() => setPage('programs')}
                                />
                            )}
                            {page === 'mui-example' && <MuiExample />}
                        </>
                    )}
                </>
            ) : (
                page === 'login' ? (
                    <MuiLoginPage
                        setUser={() => { }} // AuthProvider에서 관리하므로 빈 함수
                        goRegister={() => setPage('register')}
                        goPrograms={() => setPage('programs')}
                    />
                ) : (
                    <MuiRegisterPage goLogin={() => setPage('login')} />
                )
            )}
            <MuiWebSocketDebugger />
        </div>
    );
};

const App: React.FC = () => {
    const redirectToLogin = (): void => {
        // 페이지 상태는 AppContent에서 관리하므로 여기서는 빈 함수
    };

    return (
        <AuthProvider onRedirectToLogin={redirectToLogin}>
            <AppContent />
        </AuthProvider>
    );
};

export default App;
