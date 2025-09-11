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
import PersonalRecordsPage from './components/PersonalRecordsPage';
import StepBasedCreateProgramPage from './components/StepBasedCreateProgramPage';
import NotificationBell from './components/NotificationBell';
import WebSocketDebugger from './components/WebSocketDebugger';

const AppContent: React.FC = () => {
    const { user, logout } = useAuth();
    const [page, setPage] = useState<Page>('login');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
                            <div className="navbar-header">
                                <button
                                    className="hamburger-menu"
                                    onClick={() => setIsMenuOpen(true)}
                                >
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </button>
                                <div className="navbar-brand">
                                    <h1>Enjoy WOD!</h1>
                                </div>
                                <div className="navbar-spacer"></div>
                            </div>
                            <div className="navbar-scroll">
                                <div className="nav-scroll-container">
                                    <button
                                        className={`nav-scroll-item ${page === 'programs' ? 'active' : ''}`}
                                        onClick={() => setPage('programs')}
                                    >
                                        공개 프로그램
                                    </button>
                                    <button
                                        className={`nav-scroll-item ${page === 'my' ? 'active' : ''}`}
                                        onClick={() => setPage('my')}
                                    >
                                        내 프로그램
                                    </button>
                                    <button
                                        className={`nav-scroll-item ${page === 'records' ? 'active' : ''}`}
                                        onClick={() => setPage('records')}
                                    >
                                        내 기록
                                    </button>
                                    <button
                                        className={`nav-scroll-item ${page === 'create' ? 'active' : ''}`}
                                        onClick={() => setPage('create')}
                                    >
                                        프로그램 등록
                                    </button>
                                </div>
                            </div>
                        </nav>

                        {/* Slide Menu */}
                        <div className={`slide-menu ${isMenuOpen ? 'open' : ''}`}>
                            <div className="slide-menu-overlay" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="slide-menu-content">
                                <div className="slide-menu-header">
                                    <h2>메뉴</h2>
                                    <button
                                        className="slide-menu-close"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="slide-menu-body">
                                    <div className="user-profile">
                                        <div className="user-avatar">
                                            <span>{user.name.charAt(0)}</span>
                                        </div>
                                        <div className="user-details">
                                            <h3>{user.name}님</h3>
                                            <p>크로스핏 애호가</p>
                                        </div>
                                    </div>
                                    <div className="menu-items">
                                        <div className="menu-item">
                                            <NotificationBell />
                                            <span>알림</span>
                                        </div>
                                        <div className="menu-item">
                                            <span>프로필 설정</span>
                                        </div>
                                        <div className="menu-item">
                                            <span>도움말</span>
                                        </div>
                                        <div className="menu-item logout" onClick={logout}>
                                            <span>로그아웃</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {page === 'programs' && <ProgramsPage />}
                        {page === 'my' && <MyProgramsPage />}
                        {page === 'records' && <PersonalRecordsPage />}
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
