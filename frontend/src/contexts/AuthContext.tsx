import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { userApi, setGlobalRedirectToLogin } from '../utils/api';
import { getAccessToken, setAccessToken } from '../lib/tokenStore';

interface AuthContextType {
    user: User | null;
    ready: boolean;
    setUser: (user: User | null) => void;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
    onRedirectToLogin: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onRedirectToLogin }) => {
    const [user, setUser] = useState<User | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        setGlobalRedirectToLogin(onRedirectToLogin);
    }, [onRedirectToLogin]);

    useEffect(() => {
        const checkAuth = async (): Promise<void> => {
            try {
                const token = await getAccessToken();
                if (!token) {
                    setUser(null);
                    return;
                }
                const userData = await userApi.getProfile();
                setUser(userData);
            } catch {
                await setAccessToken(null);
                setUser(null);
            } finally {
                setReady(true);
            }
        };
        void checkAuth();
    }, []);

    const logout = async (): Promise<void> => {
        try {
            await userApi.logout();
        } catch {
            /* still clear local auth */
        } finally {
            await setAccessToken(null);
            setUser(null);
            onRedirectToLogin();
        }
    };

    return (
        <AuthContext.Provider value={{ user, ready, setUser, logout }}>
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
