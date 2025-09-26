import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent, CardActions,
    Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider,
    Badge, Avatar, Tooltip, Fade,
} from './common/MuiComponents';
import {
    ArrowBack as ArrowBackIcon,
    Notifications as NotificationsIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    FitnessCenter as FitnessCenterIcon,
    Group as GroupIcon,
    Public as PublicIcon,
    Delete as DeleteIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Star as StarIcon,
    Close as CloseIcon,
    AccessTime as AccessTimeIcon,
    CalendarToday as CalendarTodayIcon,
} from '@mui/icons-material';
import { useNotifications } from '../contexts/NotificationContext';
import { Notification } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface MuiNotificationsPageProps {
    onBack: () => void;
}

const MuiNotificationsPage: React.FC<MuiNotificationsPageProps> = ({ onBack }) => {
    const { isDarkMode } = useTheme();
    const { notifications, markAsRead, markAllAsRead } = useNotifications();
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleNotificationClick = (notification: Notification) => {
        if (!notification.is_read) {
            markAsRead(notification.id);
        }
        setSelectedNotification(notification);
        setShowDetailModal(true);
    };

    const closeDetailModal = () => {
        setShowDetailModal(false);
        setSelectedNotification(null);
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
                return <FitnessCenterIcon color="primary" />;
            case 'program_deleted':
                return <DeleteIcon color="error" />;
            case 'program_opened':
                return <PublicIcon color="success" />;
            case 'program_registered':
                return <GroupIcon color="info" />;
            case 'program_cancelled':
                return <CancelIcon color="warning" />;
            case 'program_join_request':
                return <PersonIcon color="primary" />;
            case 'program_approved':
                return <CheckCircleIcon color="success" />;
            case 'program_rejected':
                return <CancelIcon color="error" />;
            default:
                return <NotificationsIcon color="action" />;
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

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'program_created':
                return 'primary';
            case 'program_deleted':
                return 'error';
            case 'program_opened':
                return 'success';
            case 'program_registered':
                return 'info';
            case 'program_cancelled':
                return 'warning';
            case 'program_join_request':
                return 'primary';
            case 'program_approved':
                return 'success';
            case 'program_rejected':
                return 'error';
            default:
                return 'default';
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
        <Box
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                backgroundColor: isDarkMode ? 'background.default' : 'background.paper',
                zIndex: 1200,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* 헤더 */}
            <Paper
                elevation={2}
                sx={{
                    p: 2,
                    borderRadius: 0,
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #1e293b 0%, #334155 100%)'
                        : 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    color: 'white',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                }}
            >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <IconButton
                            onClick={onBack}
                            sx={{
                                color: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                },
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            알림
                        </Typography>
                        <Badge badgeContent={notifications.filter(n => !n.is_read).length} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </Stack>
                    {notifications.some(n => !n.is_read) && (
                        <Button
                            variant="outlined"
                            startIcon={<CheckCircleIcon />}
                            onClick={markAllAsRead}
                            sx={{
                                color: 'white',
                                borderColor: 'rgba(255, 255, 255, 0.5)',
                                '&:hover': {
                                    borderColor: 'white',
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                },
                            }}
                        >
                            모두 읽음
                        </Button>
                    )}
                </Stack>
            </Paper>

            {/* 알림 목록 */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {notifications.length === 0 ? (
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            textAlign: 'center',
                            color: 'text.secondary',
                        }}
                    >
                        <Avatar
                            sx={{
                                width: 80,
                                height: 80,
                                backgroundColor: 'grey.200',
                                mb: 3,
                            }}
                        >
                            <NotificationsIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                            새로운 알림이 없습니다
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            새로운 알림이 오면 여기에 표시됩니다
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                        {Object.entries(groupedNotifications).map(([date, dateNotifications]) => (
                            <Box key={date} sx={{ mb: 4 }}>
                                {/* 날짜 헤더 */}
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 2,
                                        mb: 2,
                                        textAlign: 'center',
                                        backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                        border: 'none',
                                    }}
                                >
                                    <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                                        <CalendarTodayIcon color="action" />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {new Date(date).toLocaleDateString('ko-KR', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </Typography>
                                    </Stack>
                                </Paper>

                                {/* 알림 목록 */}
                                <Stack spacing={2}>
                                    {dateNotifications.map((notification, index) => (
                                        <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }} key={notification.id}>
                                            <Card
                                                sx={{
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease-in-out',
                                                    borderLeft: !notification.is_read ? '4px solid' : '4px solid transparent',
                                                    borderLeftColor: !notification.is_read ? 'primary.main' : 'transparent',
                                                    backgroundColor: !notification.is_read
                                                        ? (isDarkMode ? 'grey.900' : 'primary.50')
                                                        : (isDarkMode ? 'background.paper' : 'white'),
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 3,
                                                        backgroundColor: !notification.is_read
                                                            ? (isDarkMode ? 'grey.800' : 'primary.100')
                                                            : (isDarkMode ? 'grey.800' : 'grey.50'),
                                                    },
                                                }}
                                                onClick={() => handleNotificationClick(notification)}
                                            >
                                                <CardContent sx={{ p: 3 }}>
                                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                                        {/* 아이콘 */}
                                                        <Avatar
                                                            sx={{
                                                                backgroundColor: `${getNotificationColor(notification.type)}.light`,
                                                                color: `${getNotificationColor(notification.type)}.main`,
                                                                width: 48,
                                                                height: 48,
                                                            }}
                                                        >
                                                            {getNotificationIcon(notification.type)}
                                                        </Avatar>

                                                        {/* 내용 */}
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                                                                <Chip
                                                                    label={getNotificationTypeLabel(notification.type)}
                                                                    color={getNotificationColor(notification.type)}
                                                                    size="small"
                                                                    sx={{ fontWeight: 600 }}
                                                                />
                                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                                    <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                                    <Typography variant="caption" color="text.secondary">
                                                                        {formatTime(notification.created_at)}
                                                                    </Typography>
                                                                </Stack>
                                                            </Stack>

                                                            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                                                {notification.title}
                                                            </Typography>

                                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                                {notification.message}
                                                            </Typography>

                                                            <Typography variant="caption" color="text.secondary">
                                                                {formatDate(notification.created_at)}
                                                            </Typography>
                                                        </Box>

                                                        {/* 읽음 상태 표시 */}
                                                        {!notification.is_read && (
                                                            <Box
                                                                sx={{
                                                                    width: 8,
                                                                    height: 8,
                                                                    backgroundColor: 'primary.main',
                                                                    borderRadius: '50%',
                                                                    mt: 1,
                                                                }}
                                                            />
                                                        )}
                                                    </Stack>
                                                </CardContent>
                                            </Card>
                                        </Fade>
                                    ))}
                                </Stack>
                            </Box>
                        ))}
                    </Box>
                )}
            </Box>

            {/* 알림 상세 모달 */}
            <Dialog
                open={showDetailModal}
                onClose={closeDetailModal}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                {selectedNotification && (
                    <>
                        <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Avatar
                                    sx={{
                                        backgroundColor: `${getNotificationColor(selectedNotification.type)}.light`,
                                        color: `${getNotificationColor(selectedNotification.type)}.main`,
                                    }}
                                >
                                    {getNotificationIcon(selectedNotification.type)}
                                </Avatar>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        {getNotificationTypeLabel(selectedNotification.type)}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDate(selectedNotification.created_at)}
                                    </Typography>
                                </Box>
                            </Stack>
                            <IconButton
                                aria-label="close"
                                onClick={closeDetailModal}
                                sx={{
                                    color: (theme) => theme.palette.grey[500],
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: 3 }}>
                            <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
                                {selectedNotification.title}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                {selectedNotification.message}
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={closeDetailModal} color="primary">
                                확인
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};

export default MuiNotificationsPage;
