import React from 'react';
import {
    Box,
    Dialog,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Stack,
    Card,
    CardContent,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemIcon,
    ListItemText
} from './common/MuiComponents';
import {
    Diamond as DiamondIcon,
    Close as CloseIcon,
    FitnessCenter as FitnessCenterIcon,
    Public as PublicIcon,
    Schedule as ScheduleIcon,
    Analytics as AnalyticsIcon,
    Support as SupportIcon
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

interface MuiPremiumUpgradeModalProps {
    open: boolean;
    onClose: () => void;
    onUpgrade: () => void;
}

const MuiPremiumUpgradeModal: React.FC<MuiPremiumUpgradeModalProps> = ({
    open,
    onClose,
    onUpgrade
}) => {
    const { isDarkMode } = useTheme();

    const features = [
        {
            icon: <FitnessCenterIcon />,
            title: '무제한 WOD 생성',
            description: 'WOD 개수 제한 없이 자유롭게 생성하세요'
        },
        {
            icon: <PublicIcon />,
            title: '무제한 공개 WOD',
            description: '공개 WOD 개수 제한을 해제하세요'
        },
        {
            icon: <ScheduleIcon />,
            title: '만료 시간 해제',
            description: '공개 WOD의 만료 시간을 해제하세요'
        },
        {
            icon: <AnalyticsIcon />,
            title: '고급 분석 기능',
            description: '상세한 운동 통계와 분석을 제공합니다'
        },
        {
            icon: <SupportIcon />,
            title: '우선 지원',
            description: '프리미엄 사용자 전용 고객 지원'
        }
    ];

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    backgroundImage: 'none',
                    backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    boxShadow: isDarkMode
                        ? '0 24px 48px rgba(0, 0, 0, 0.4)'
                        : '0 24px 48px rgba(0, 0, 0, 0.12)',
                }
            }}
        >
            {/* 헤더 */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                    color: 'black',
                    p: 3,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* 배경 장식 */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.1)',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.05)',
                    }}
                />

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                    <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                            💎 프리미엄 업그레이드
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.8 }}>
                            모든 제한을 해제하고 고급 기능을 사용하세요
                        </Typography>
                    </Box>

                    <DiamondIcon sx={{ fontSize: 60, opacity: 0.3 }} />
                </Stack>
            </Box>

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    {/* 가격 정보 */}
                    <Card sx={{
                        mb: 3,
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        color: 'white',
                        borderRadius: 3
                    }}>
                        <CardContent sx={{ textAlign: 'center', p: 3 }}>
                            <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                                월 5,000원
                            </Typography>
                            <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                                첫 달 무료 체험
                            </Typography>
                            <Chip
                                label="30일 무료 체험"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            />
                        </CardContent>
                    </Card>

                    {/* 기능 목록 */}
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        🚀 프리미엄 기능
                    </Typography>

                    <List sx={{ mb: 3 }}>
                        {features.map((feature, index) => (
                            <ListItem key={index} sx={{ px: 0, py: 1 }}>
                                <ListItemIcon sx={{ minWidth: 40 }}>
                                    <Box sx={{
                                        p: 1,
                                        borderRadius: 2,
                                        backgroundColor: 'primary.50',
                                        color: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {feature.icon}
                                    </Box>
                                </ListItemIcon>
                                <ListItemText
                                    primary={
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {feature.title}
                                        </Typography>
                                    }
                                    secondary={
                                        <Typography variant="body2" color="text.secondary">
                                            {feature.description}
                                        </Typography>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Divider sx={{ my: 2 }} />

                    {/* 추가 혜택 */}
                    <Box sx={{
                        p: 2,
                        backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isDarkMode ? 'grey.700' : 'grey.200'
                    }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                            🎁 추가 혜택
                        </Typography>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                • 광고 없는 깔끔한 환경
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                • 새로운 기능 우선 사용
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                • 커뮤니티 베타 테스터 참여
                            </Typography>
                        </Stack>
                    </Box>
                </Box>
            </DialogContent>

            <DialogActions sx={{
                p: 3,
                backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
                borderTop: '1px solid',
                borderColor: isDarkMode ? 'grey.700' : 'grey.200',
            }}>
                <Button
                    onClick={onClose}
                    variant="outlined"
                    size="large"
                    startIcon={<CloseIcon />}
                    sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                    }}
                >
                    나중에
                </Button>
                <Button
                    onClick={onUpgrade}
                    variant="contained"
                    size="large"
                    startIcon={<DiamondIcon />}
                    sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                        background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
                        color: 'black',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #ffc107 0%, #ffeb3b 100%)',
                        }
                    }}
                >
                    프리미엄 시작하기
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MuiPremiumUpgradeModal;
