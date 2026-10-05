import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, NotificationContextType } from '../types';
import { notificationApi } from '../utils/api';
import { getAccessToken } from '../lib/tokenStore';
import { apiBaseUrl } from '../lib/env';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
    children: React.ReactNode;
    userId?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, userId }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [, setSocket] = useState<Socket | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);

    // 알림 추가
    const addNotification = useCallback((notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        if (!notification.is_read) {
            setUnreadCount(prev => prev + 1);
        }
    }, []);

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        let newSocket: Socket | null = null;

        const connect = async () => {
            const authToken = await getAccessToken();
            if (cancelled || !authToken) return;

            const socketUrl = apiBaseUrl();
            if (!socketUrl) return;

            newSocket = io(socketUrl, {
                path: '/socket.io/',
                transports: ['polling', 'websocket'],
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: 2000,
                reconnectionAttempts: 10,
                withCredentials: false,
                timeout: 20000,
                auth: { token: authToken },
            });

            newSocket.on('connect', () => {
                newSocket?.emit('join_user_room');
            });

            newSocket.on('notification', (notification: Notification) => {
                addNotification(notification);
            });

            newSocket.on('program_notification', (notification: Notification) => {
                addNotification({
                    ...notification,
                    id: notification.id || Date.now(),
                    is_read: false,
                });
            });

            setSocket(newSocket);
        };

        void connect();
        return () => {
            cancelled = true;
            newSocket?.emit('leave_user_room');
            newSocket?.disconnect();
        };
    }, [userId, addNotification]);

    // 알림 조회
    const fetchNotifications = useCallback(async () => {
        try {
            const data = await notificationApi.getNotifications();
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        } catch (error) {
            console.error('알림 조회 실패:', error);
        }
    }, []);

    // 알림 읽음 처리
    const markAsRead = useCallback(async (notificationId: number) => {
        try {
            await notificationApi.markAsRead(notificationId);
            setNotifications(prev =>
                prev.map(n =>
                    n.id === notificationId ? { ...n, is_read: true } : n
                )
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('알림 읽음 처리 실패:', error);
        }
    }, []);

    // 모든 알림 읽음 처리
    const markAllAsRead = useCallback(async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications(prev =>
                prev.map(n => ({ ...n, is_read: true }))
            );
            setUnreadCount(0);
        } catch (error) {
            console.error('모든 알림 읽음 처리 실패:', error);
        }
    }, []);

    // 사용자 로그인 시 알림 조회
    useEffect(() => {
        if (userId) {
            fetchNotifications();
        } else {
            setNotifications([]);
            setUnreadCount(0);
        }
    }, [userId, fetchNotifications]);

    const value: NotificationContextType = {
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        fetchNotifications
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
