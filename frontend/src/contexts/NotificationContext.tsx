import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Notification, NotificationContextType } from '../types';
import { notificationApi } from '../utils/api';

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

    // WebSocket 연결 설정
    useEffect(() => {
        if (userId) {
            console.log('WebSocket 연결 시도 중...', userId);
            // 모바일 Safari 감지
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileSafari = userAgent.includes('safari') &&
                !userAgent.includes('chrome') &&
                (userAgent.includes('iphone') || userAgent.includes('ipad') || userAgent.includes('mobile'));

            // localStorage에서 토큰 가져오기 (모바일 Safari 대응)
            const authToken = localStorage.getItem('access_token');
            console.log('모바일 Safari 감지:', isMobileSafari, '| 인증 토큰:', authToken ? '있음' : '없음');

            const newSocket = io(process.env.REACT_APP_API_URL || 'https://wodybody-production.up.railway.app', {
                transports: isMobileSafari ? ['polling', 'websocket'] : ['websocket', 'polling'],
                autoConnect: true,
                reconnection: true,
                reconnectionDelay: isMobileSafari ? 2000 : 1000,
                reconnectionAttempts: 10,
                withCredentials: true,
                forceNew: true,
                // 모바일 Safari를 위한 추가 설정
                upgrade: !isMobileSafari,
                timeout: isMobileSafari ? 20000 : 10000,
                // 모바일 Safari를 위한 인증 토큰 전달
                auth: authToken ? { token: authToken } : undefined,
                query: authToken ? { token: authToken, user_id: userId } : { user_id: userId }
            });

            newSocket.on('connect', () => {
                console.log('WebSocket 연결됨:', newSocket.id);
                // 사용자 방에 참여
                newSocket.emit('join_user_room', { user_id: userId });
            });

            newSocket.on('disconnect', (reason) => {
                console.log('WebSocket 연결 해제됨:', reason);
            });

            newSocket.on('connect_error', (error) => {
                console.error('WebSocket 연결 오류:', error);
                // 모바일 Safari에서 WebSocket 연결 실패 시 polling만 사용하도록 재시도
                if (isMobileSafari) {
                    console.log('모바일 Safari에서 polling 전용으로 재연결 시도');
                    newSocket.io.opts.transports = ['polling'];
                    newSocket.connect();
                }
            });

            // 개인 알림 수신
            newSocket.on('notification', (notification: Notification) => {
                console.log('개인 알림 수신:', notification);
                addNotification(notification);
            });

            // 프로그램 알림 수신
            newSocket.on('program_notification', (notification: any) => {
                console.log('프로그램 알림 수신:', notification);
                // 프로그램 알림을 개인 알림으로 변환
                const personalNotification: Notification = {
                    id: Date.now(), // 임시 ID
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    program_id: notification.program_id,
                    is_read: false,
                    created_at: notification.created_at
                };
                addNotification(personalNotification);
            });

            setSocket(newSocket);

            return () => {
                newSocket.emit('leave_user_room', { user_id: userId });
                newSocket.disconnect();
            };
        }
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
