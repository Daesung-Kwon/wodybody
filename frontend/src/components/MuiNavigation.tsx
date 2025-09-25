import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Badge,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Avatar,
    Box,
    Divider,
    Button,
    Stack,
} from './common/MuiComponents';
import {
    Notifications as NotificationsIcon,
    FitnessCenter as FitnessCenterIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Help as HelpIcon,
    ExitToApp as LogoutIcon,
    Home as HomeIcon,
    Timer as TimerIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { User } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface MuiNavigationProps {
    user: User;
    currentPage: string;
    onPageChange: (page: string) => void;
    onLogout: () => void;
    onNotifications: () => void;
    unreadCount: number;
}

const MuiNavigation: React.FC<MuiNavigationProps> = ({
    user,
    currentPage,
    onPageChange,
    onLogout,
    onNotifications,
    unreadCount,
}) => {
    const { isDarkMode } = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const toggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
    };

    const menuItems = [
        { id: 'programs', label: '공개 WOD', icon: <HomeIcon /> },
        { id: 'my', label: '내 WOD', icon: <FitnessCenterIcon /> },
        { id: 'records', label: '내 기록', icon: <TrendingUpIcon /> },
        { id: 'create', label: 'WOD 등록', icon: <TimerIcon /> },
        { id: 'mui-example', label: 'MUI 예제', icon: <FitnessCenterIcon /> },
    ];

    const drawerItems = [
        { id: 'profile', label: '프로필 설정', icon: <PersonIcon /> },
        { id: 'settings', label: '설정', icon: <SettingsIcon /> },
        { id: 'help', label: '도움말', icon: <HelpIcon /> },
    ];

    return (
        <>
            {/* 상단 네비게이션 바 */}
            <AppBar
                position="sticky"
                sx={{
                    backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    color: 'text.primary',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    zIndex: 1100,
                }}
            >
                <Toolbar sx={{ px: { xs: 2, md: 3 } }}>
                    {/* 햄버거 메뉴 */}
                    <IconButton
                        edge="start"
                        color="inherit"
                        onClick={toggleDrawer}
                        sx={{ mr: 2 }}
                    >
                        <Avatar
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: 'primary.main',
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {user.name.charAt(0)}
                        </Avatar>
                    </IconButton>

                    {/* 브랜드 로고 */}
                    <Typography
                        variant="h6"
                        component="div"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 'bold',
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Enjoy WOD!
                    </Typography>

                    {/* 알림 버튼 */}
                    <IconButton color="inherit" onClick={onNotifications}>
                        <Badge badgeContent={unreadCount} color="error">
                            <NotificationsIcon />
                        </Badge>
                    </IconButton>
                </Toolbar>

                {/* 하단 탭 네비게이션 */}
                <Box sx={{ px: { xs: 2, md: 3 }, pb: 1 }}>
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{
                            overflowX: 'auto',
                            '&::-webkit-scrollbar': { display: 'none' },
                            scrollbarWidth: 'none',
                        }}
                    >
                        {menuItems.map((item) => (
                            <Button
                                key={item.id}
                                variant={currentPage === item.id ? 'contained' : 'text'}
                                onClick={() => onPageChange(item.id)}
                                startIcon={item.icon}
                                sx={{
                                    minWidth: 'auto',
                                    px: 2,
                                    py: 1,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: currentPage === item.id ? 600 : 500,
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {item.label}
                            </Button>
                        ))}
                    </Stack>
                </Box>
            </AppBar>

            {/* 사이드 드로어 */}
            <Drawer
                anchor="left"
                open={drawerOpen}
                onClose={toggleDrawer}
                sx={{
                    zIndex: 1100,
                    '& .MuiDrawer-paper': {
                        width: 280,
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                        zIndex: 1100,
                    },
                }}
            >
                {/* 드로어 헤더 */}
                <Box
                    sx={{
                        p: 3,
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        color: 'white',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                            sx={{
                                width: 50,
                                height: 50,
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {user.name.charAt(0)}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {user.name}님
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                크로스핏 애호가
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                {/* 드로어 메뉴 */}
                <List sx={{ pt: 2 }}>
                    {drawerItems.map((item) => (
                        <ListItem key={item.id} disablePadding>
                            <ListItemButton
                                onClick={() => {
                                    // 메뉴 아이템 클릭 처리
                                    toggleDrawer();
                                }}
                                sx={{ px: 3, py: 1.5 }}
                            >
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.label}
                                    primaryTypographyProps={{
                                        fontWeight: 500,
                                    }}
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>

                <Divider sx={{ my: 2 }} />

                {/* 로그아웃 버튼 */}
                <Box sx={{ p: 2 }}>
                    <Button
                        fullWidth
                        variant="outlined"
                        color="error"
                        startIcon={<LogoutIcon />}
                        onClick={() => {
                            onLogout();
                            toggleDrawer();
                        }}
                        sx={{
                            py: 1.5,
                            borderRadius: 2,
                            fontWeight: 500,
                        }}
                    >
                        로그아웃
                    </Button>
                </Box>
            </Drawer>
        </>
    );
};

export default MuiNavigation;
