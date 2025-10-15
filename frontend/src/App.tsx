import React, { useState, useEffect } from 'react';
import { Page } from './types';
import { setGlobalRedirectToLogin } from './utils/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
// import LoginPage from './components/LoginPage';
// import RegisterPage from './components/RegisterPage';
import MuiLoginPage from './components/MuiLoginPage';
import MuiRegisterPage from './components/MuiRegisterPage';
import MuiNavigation from './components/MuiNavigation';
import MuiProgramsPage from './components/MuiProgramsPage';
import MuiMyProgramsPage from './components/MuiMyProgramsPage';
import MuiPersonalRecordsPage from './components/MuiPersonalRecordsPage';
import MuiStepBasedCreateProgramPage from './components/MuiStepBasedCreateProgramPage';
import MuiNotificationsPage from './components/MuiNotificationsPage';
import MuiWebSocketDebugger from './components/MuiWebSocketDebugger';
import SecureKeypadShowcase from './components/SecureKeypadShowcase';
import MuiSharedProgramPage from './components/MuiSharedProgramPage';
// import MuiExample from './components/common/MuiExample'; // 임시 숨김

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
    const [sharedProgramId, setSharedProgramId] = useState<number | null>(null);

    useEffect(() => {
        if (user) {
            setPage('programs');
        } else {
            // URL hash 체크
            const hash = window.location.hash.substring(1);
            if (hash === 'keypad-demo') {
                setPage('keypad-demo');
            } else if (hash.startsWith('share/')) {
                // 공유 URL 처리
                const programId = parseInt(hash.split('/')[1]);
                if (!isNaN(programId)) {
                    setSharedProgramId(programId);
                }
            } else {
                setPage('login');
            }
        }
    }, [user]);

    // URL hash 변경 감지
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.substring(1);
            if (hash === 'keypad-demo' && !user) {
                setPage('keypad-demo');
            } else if (hash.startsWith('share/') && !user) {
                // 공유 URL 처리
                const programId = parseInt(hash.split('/')[1]);
                if (!isNaN(programId)) {
                    setSharedProgramId(programId);
                }
            } else if (hash === '' && !user) {
                setPage('login');
                setSharedProgramId(null);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
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
                sharedProgramId={sharedProgramId}
                onCloseSharedProgram={() => {
                    setSharedProgramId(null);
                    window.location.hash = '';
                }}
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
    sharedProgramId: number | null;
    onCloseSharedProgram: () => void;
}> = ({ user, page, setPage, logout, showNotifications, setShowNotifications, sharedProgramId, onCloseSharedProgram }) => {
    const { unreadCount } = useNotifications();

    return (
        <div>
            {/* 공유 프로그램 모달 - 로그인 여부와 상관없이 표시 */}
            {sharedProgramId && (
                <MuiSharedProgramPage
                    programId={sharedProgramId}
                    onClose={onCloseSharedProgram}
                />
            )}

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
                            {page === 'my' && <MuiMyProgramsPage />}
                            {page === 'records' && <MuiPersonalRecordsPage />}
                            {page === 'create' && (
                                <MuiStepBasedCreateProgramPage
                                    goMy={() => setPage('my')}
                                    goPrograms={() => setPage('programs')}
                                />
                            )}
                            {/* {page === 'mui-example' && <MuiExample />} */}
                        </>
                    )}
                </>
            ) : (
                page === 'keypad-demo' ? (
                    <SecureKeypadShowcase />
                ) : page === 'login' ? (
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
