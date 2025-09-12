import React from 'react';
import { useNotifications } from '../contexts/NotificationContext';
import './NotificationsPage.css';

interface NotificationsPageProps {
    onBack: () => void;
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({ onBack }) => {
    const { notifications, markAsRead, markAllAsRead } = useNotifications();

    const handleNotificationClick = (notificationId: number, isRead: boolean) => {
        if (!isRead) {
            markAsRead(notificationId);
        }
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

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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
            case 'program_join_request':
                return '🙋‍♂️';
            case 'program_approved':
                return '✅';
            case 'program_rejected':
                return '❌';
            default:
                return '🔔';
        }
    };

    const getNotificationTypeLabel = (type: string) => {
        switch (type) {
            case 'program_created':
                return '새 WOD';
            case 'program_deleted':
                return 'WOD 삭제';
            case 'program_opened':
                return 'WOD 공개';
            case 'program_registered':
                return '참여 신청';
            case 'program_cancelled':
                return '신청 취소';
            case 'program_join_request':
                return '참여 요청';
            case 'program_approved':
                return '승인됨';
            case 'program_rejected':
                return '거절됨';
            default:
                return '알림';
        }
    };

    // 알림을 날짜별로 그룹화
    const groupedNotifications = notifications.reduce((groups, notification) => {
        const date = new Date(notification.created_at).toDateString();
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(notification);
        return groups;
    }, {} as Record<string, typeof notifications>);

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <button className="back-button" onClick={onBack}>
                    ← 뒤로
                </button>
                <h1>알림</h1>
                {notifications.some(n => !n.is_read) && (
                    <button className="mark-all-read-button" onClick={markAllAsRead}>
                        모두 읽음
                    </button>
                )}
            </div>

            <div className="notifications-content">
                {notifications.length === 0 ? (
                    <div className="no-notifications">
                        <div className="no-notifications-icon">🔔</div>
                        <h3>새로운 알림이 없습니다</h3>
                        <p>새로운 알림이 오면 여기에 표시됩니다</p>
                    </div>
                ) : (
                    <div className="notifications-list">
                        {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                            <div key={date} className="notification-group">
                                <div className="group-date">
                                    {new Date(date).toLocaleDateString('ko-KR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </div>
                                {dateNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                                        onClick={() => handleNotificationClick(notification.id, notification.is_read)}
                                    >
                                        <div className="notification-icon">
                                            {getNotificationIcon(notification.type)}
                                        </div>
                                        <div className="notification-content">
                                            <div className="notification-header">
                                                <span className="notification-type">
                                                    {getNotificationTypeLabel(notification.type)}
                                                </span>
                                                <span className="notification-time">
                                                    {formatTime(notification.created_at)}
                                                </span>
                                            </div>
                                            <div className="notification-title">
                                                {notification.title}
                                            </div>
                                            <div className="notification-message">
                                                {notification.message}
                                            </div>
                                            <div className="notification-full-time">
                                                {formatDate(notification.created_at)}
                                            </div>
                                        </div>
                                        {!notification.is_read && (
                                            <div className="unread-indicator"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationsPage;
