import React, { useState } from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationBell.css';

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
    const [isOpen, setIsOpen] = useState(false);

    const handleBellClick = () => {
        setIsOpen(!isOpen);
    };

    const handleNotificationClick = (notificationId: number, isRead: boolean) => {
        if (!isRead) {
            markAsRead(notificationId);
        }
    };

    const handleMarkAllRead = () => {
        markAllAsRead();
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return '방금 전';
        if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
        return `${Math.floor(diffInMinutes / 1440)}일 전`;
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'program_created':
                return '🎯';
            case 'program_deleted':
                return '🗑️';
            case 'program_opened':
                return '✨';
            case 'program_registered':
                return '👥';
            case 'program_cancelled':
                return '❌';
            default:
                return '🔔';
        }
    };

    return (
        <div className="notification-bell">
            <button
                className={`bell-button ${unreadCount > 0 ? 'has-notifications' : ''}`}
                onClick={handleBellClick}
                title="알림"
            >
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown">
                    <div className="notification-header">
                        <h3>알림</h3>
                        {unreadCount > 0 && (
                            <button
                                className="mark-all-read-btn"
                                onClick={handleMarkAllRead}
                            >
                                모두 읽음
                            </button>
                        )}
                    </div>

                    <div className="notification-list">
                        {notifications.length === 0 ? (
                            <div className="no-notifications">
                                <p>새로운 알림이 없습니다</p>
                            </div>
                        ) : (
                            notifications.slice(0, 10).map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                    onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                                >
                                    <div className="notification-icon">
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-title">
                                            {notification.title}
                                        </div>
                                        <div className="notification-message">
                                            {notification.message}
                                        </div>
                                        <div className="notification-time">
                                            {formatTime(notification.created_at)}
                                        </div>
                                    </div>
                                    {!notification.is_read && (
                                        <div className="unread-indicator"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {notifications.length > 10 && (
                        <div className="notification-footer">
                            <button className="view-all-btn">
                                모든 알림 보기
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* 드롭다운 외부 클릭 시 닫기 */}
            {isOpen && (
                <div
                    className="notification-overlay"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};

export default NotificationBell;
