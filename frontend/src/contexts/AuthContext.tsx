import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { userApi } from '../utils/api';

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
    redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    onRedirectToLogin: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onRedirectToLogin }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const checkAuth = async (): Promise<void> => {
            try {
                const userData = await userApi.getProfile();
                setUser(userData);
            } catch (error) {
                // 인증되지 않은 사용자는 로그인 페이지로
                console.log('인증되지 않은 사용자');
                setUser(null);
            }
        };
        checkAuth();
    }, []);

    const logout = async (): Promise<void> => {
        try {
            await userApi.logout();
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
            setUser(null);
            onRedirectToLogin();
        }
    };

    const redirectToLogin = (): void => {
        setUser(null);
        onRedirectToLogin();
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout, redirectToLogin }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
