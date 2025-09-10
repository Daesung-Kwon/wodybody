import React, { useState, useEffect } from 'react';
import './App.css';
import { Page } from './types';
import { setGlobalRedirectToLogin } from './utils/api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProgramsPage from './components/ProgramsPage';
import MyProgramsPage from './components/MyProgramsPage';
import StepBasedCreateProgramPage from './components/StepBasedCreateProgramPage';
import NotificationBell from './components/NotificationBell';
import WebSocketDebugger from './components/WebSocketDebugger';

const AppContent: React.FC = () => {
    const { user, logout } = useAuth();
    const [page, setPage] = useState<Page>('login');

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
            <div className="app">
                {user ? (
                    <>
                        <nav className="navbar">
                            <h1>크로스핏 프로그램 관리</h1>
                            <div className="nav-buttons">
                                <button onClick={() => setPage('programs')}>
                                    공개 프로그램
                                </button>
                                <button onClick={() => setPage('my')}>
                                    내 프로그램
                                </button>
                                <button onClick={() => setPage('create')}>
                                    프로그램 등록
                                </button>
                                <NotificationBell />
                                <button onClick={logout}>
                                    로그아웃
                                </button>
                            </div>
                        </nav>
                        {page === 'programs' && <ProgramsPage />}
                        {page === 'my' && <MyProgramsPage />}
                        {page === 'create' && (
                            <StepBasedCreateProgramPage
                                goMy={() => setPage('my')}
                                goPrograms={() => setPage('programs')}
                            />
                        )}
                    </>
                ) : (
                    page === 'login' ? (
                        <LoginPage
                            setUser={() => { }} // AuthProvider에서 관리하므로 빈 함수
                            goRegister={() => setPage('register')}
                            goPrograms={() => setPage('programs')}
                        />
                    ) : (
                        <RegisterPage goLogin={() => setPage('login')} />
                    )
                )}
                <WebSocketDebugger />
            </div>
        </NotificationProvider>
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
