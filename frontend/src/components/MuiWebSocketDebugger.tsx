import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    Paper,
    Typography,
    IconButton,
    Button,
    Box,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    Collapse,
    Stack,
    Tooltip,
    Badge,
} from './common/MuiComponents';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Refresh as RefreshIcon,
    BugReport as BugReportIcon,
    VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

const MuiWebSocketDebugger: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<string>('연결 안됨');
    const [logs, setLogs] = useState<string[]>([]);
    const [isExpanded, setIsExpanded] = useState<boolean>(false);
    const [isVisible, setIsVisible] = useState<boolean>(false);

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]); // 최대 20개 로그 유지
    };

    useEffect(() => {
        if (!isVisible) return;

        addLog('WebSocket 디버거 시작');

        const newSocket = io(process.env.REACT_APP_API_URL || 'https://wodybody-production.up.railway.app', {
            transports: ['websocket', 'polling'],
            autoConnect: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            withCredentials: true,
            forceNew: true
        });

        newSocket.on('connect', () => {
            setConnectionStatus('연결됨');
            addLog(`WebSocket 연결됨: ${newSocket.id}`);
        });

        newSocket.on('disconnect', (reason) => {
            setConnectionStatus('연결 해제됨');
            addLog(`WebSocket 연결 해제됨: ${reason}`);
        });

        newSocket.on('connect_error', (error) => {
            setConnectionStatus('연결 오류');
            addLog(`WebSocket 연결 오류: ${error.message}`);
        });

        newSocket.on('notification', (data) => {
            addLog(`개인 알림 수신: ${JSON.stringify(data)}`);
        });

        newSocket.on('program_notification', (data) => {
            addLog(`프로그램 알림 수신: ${JSON.stringify(data)}`);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isVisible]);

    const testJoinRoom = () => {
        if (socket) {
            socket.emit('join_user_room', { user_id: 1 });
            addLog('사용자 방 참여 요청 전송');
        }
    };

    const testLeaveRoom = () => {
        if (socket) {
            socket.emit('leave_user_room', { user_id: 1 });
            addLog('사용자 방 나가기 요청 전송');
        }
    };

    const clearLogs = () => {
        setLogs([]);
        addLog('로그 초기화됨');
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case '연결됨': return 'success';
            case '연결 해제됨': return 'error';
            case '연결 오류': return 'error';
            default: return 'default';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case '연결됨': return <WifiIcon />;
            case '연결 해제됨': return <WifiOffIcon />;
            case '연결 오류': return <WifiOffIcon />;
            default: return <WifiOffIcon />;
        }
    };

    if (!isVisible) {
        return (
            <Tooltip title="WebSocket 디버거 표시">
                <IconButton
                    onClick={() => setIsVisible(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 16,
                        right: 16,
                        zIndex: 1000,
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        '&:hover': {
                            backgroundColor: isDarkMode ? 'background.paper' : 'white',
                            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                        },
                    }}
                >
                    <BugReportIcon />
                </IconButton>
            </Tooltip>
        );
    }

    return (
        <Paper
            elevation={8}
            sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: isExpanded ? { xs: 'calc(100vw - 32px)', sm: 400 } : { xs: 200, sm: 280 },
                maxWidth: { xs: 'calc(100vw - 32px)', sm: 400 },
                maxHeight: isExpanded ? { xs: 'calc(100vh - 100px)', sm: 500 } : 60,
                zIndex: 1000,
                backgroundColor: isDarkMode ? 'background.paper' : 'white',
                border: '1px solid',
                borderColor: 'divider',
                transition: 'all 0.3s ease-in-out',
                overflow: 'hidden',
            }}
        >
            {/* 헤더 */}
            <Box
                sx={{
                    p: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isDarkMode ? 'background.default' : 'grey.50',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <BugReportIcon color="primary" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        WebSocket 디버거
                    </Typography>
                    <Badge
                        badgeContent={logs.length}
                        color="primary"
                        max={99}
                        sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem' } }}
                    />
                </Stack>

                <Stack direction="row" spacing={0.5}>
                    <Tooltip title={isExpanded ? '접기' : '펼치기'}>
                        <IconButton
                            size="small"
                            onClick={() => setIsExpanded(!isExpanded)}
                            sx={{ color: 'text.secondary' }}
                        >
                            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="숨기기">
                        <IconButton
                            size="small"
                            onClick={() => setIsVisible(false)}
                            sx={{ color: 'text.secondary' }}
                        >
                            <VisibilityOffIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* 상태 표시 */}
            <Box sx={{ p: 2, pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <Chip
                        icon={getStatusIcon(connectionStatus)}
                        label={connectionStatus}
                        color={getStatusColor(connectionStatus) as any}
                        size="small"
                        variant="outlined"
                    />
                    {socket && (
                        <Typography variant="caption" color="text.secondary">
                            ID: {socket.id?.substring(0, 8)}...
                        </Typography>
                    )}
                </Stack>
            </Box>

            {/* 확장된 내용 */}
            <Collapse in={isExpanded}>
                <Box sx={{ p: 2, pt: 0 }}>
                    {/* 테스트 버튼들 */}
                    <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        sx={{ mb: 2 }}
                    >
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<WifiIcon />}
                            onClick={testJoinRoom}
                            disabled={!socket || connectionStatus !== '연결됨'}
                            sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' }
                            }}
                        >
                            방 참여
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<WifiOffIcon />}
                            onClick={testLeaveRoom}
                            disabled={!socket || connectionStatus !== '연결됨'}
                            sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' }
                            }}
                        >
                            방 나가기
                        </Button>
                        <Button
                            size="small"
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={clearLogs}
                            sx={{
                                fontSize: { xs: '0.7rem', sm: '0.75rem' },
                                minWidth: { xs: 'auto', sm: 'auto' }
                            }}
                        >
                            로그 초기화
                        </Button>
                    </Stack>

                    <Divider sx={{ mb: 2 }} />

                    {/* 로그 목록 */}
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        실시간 로그 ({logs.length})
                    </Typography>

                    <Paper
                        variant="outlined"
                        sx={{
                            height: { xs: 150, sm: 200 },
                            overflow: 'auto',
                            backgroundColor: isDarkMode ? 'background.default' : 'grey.50',
                        }}
                    >
                        {logs.length === 0 ? (
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    height: '100%',
                                    color: 'text.secondary',
                                }}
                            >
                                <Typography variant="body2">로그가 없습니다</Typography>
                            </Box>
                        ) : (
                            <List dense>
                                {logs.map((log, index) => (
                                    <ListItem key={index} sx={{ py: 0.5, px: 1 }}>
                                        <ListItemText
                                            primary={
                                                <Typography
                                                    variant="caption"
                                                    sx={{
                                                        fontFamily: 'monospace',
                                                        fontSize: '0.7rem',
                                                        lineHeight: 1.2,
                                                        wordBreak: 'break-all',
                                                        color: 'text.secondary',
                                                    }}
                                                >
                                                    {log}
                                                </Typography>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Paper>
                </Box>
            </Collapse>
        </Paper>
    );
};

export default MuiWebSocketDebugger;
