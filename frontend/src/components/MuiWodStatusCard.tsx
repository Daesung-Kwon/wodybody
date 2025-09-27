import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    LinearProgress,
    Chip,
    Stack,
    Alert,
    Button,
    IconButton,
    Tooltip
} from './common/MuiComponents';
import {
    FitnessCenter as FitnessCenterIcon,
    Public as PublicIcon,
    Schedule as ScheduleIcon,
    Warning as WarningIcon,
    Refresh as RefreshIcon,
    Diamond as DiamondIcon
} from '@mui/icons-material';
import { WodStatus } from '../types';
import { wodStatusApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';
import MuiPremiumUpgradeModal from './MuiPremiumUpgradeModal';

const MuiWodStatusCard: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [wodStatus, setWodStatus] = useState<WodStatus | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);

    const loadWodStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            const status = await wodStatusApi.getStatus();
            setWodStatus(status);
        } catch (err) {
            console.error('WOD 현황 로딩 실패:', err);
            setError('WOD 현황을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadWodStatus();
    }, []);

    if (loading) {
        return (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        📊 WOD 현황
                    </Typography>
                    <LinearProgress />
                </CardContent>
            </Card>
        );
    }

    if (error || !wodStatus) {
        return (
            <Card sx={{ mb: 3, borderRadius: 2 }}>
                <CardContent>
                    <Alert
                        severity="error"
                        action={
                            <Button size="small" onClick={loadWodStatus}>
                                다시 시도
                            </Button>
                        }
                    >
                        {error || 'WOD 현황을 불러올 수 없습니다.'}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    const totalProgress = (wodStatus.total_wods / wodStatus.max_total_wods) * 100;
    const publicProgress = (wodStatus.public_wods / wodStatus.max_public_wods) * 100;

    return (
        <Card sx={{
            mb: 3,
            borderRadius: 2,
            background: isDarkMode
                ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
                : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            border: '1px solid',
            borderColor: isDarkMode ? 'grey.700' : 'grey.200'
        }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                        📊 WOD 현황
                    </Typography>
                    <Tooltip title="새로고침">
                        <IconButton size="small" onClick={loadWodStatus}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Stack spacing={3}>
                    {/* 전체 WOD 현황 */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <FitnessCenterIcon fontSize="small" color="primary" />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    전체 WOD
                                </Typography>
                            </Stack>
                            <Chip
                                label={`${wodStatus.total_wods}/${wodStatus.max_total_wods}`}
                                size="small"
                                color={wodStatus.total_wods >= wodStatus.max_total_wods ? 'error' : 'primary'}
                                variant="outlined"
                            />
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={totalProgress}
                            color={wodStatus.total_wods >= wodStatus.max_total_wods ? 'error' : 'primary'}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                        {!wodStatus.can_create_wod && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                                ⚠️ WOD 개수 제한에 도달했습니다
                            </Typography>
                        )}
                    </Box>

                    {/* 공개 WOD 현황 */}
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <PublicIcon fontSize="small" color="secondary" />
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    공개 WOD
                                </Typography>
                            </Stack>
                            <Chip
                                label={`${wodStatus.public_wods}/${wodStatus.max_public_wods}`}
                                size="small"
                                color={wodStatus.public_wods >= wodStatus.max_public_wods ? 'error' : 'secondary'}
                                variant="outlined"
                            />
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={publicProgress}
                            color={wodStatus.public_wods >= wodStatus.max_public_wods ? 'error' : 'secondary'}
                            sx={{ height: 8, borderRadius: 4 }}
                        />
                        {!wodStatus.can_create_public_wod && (
                            <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                                ⚠️ 공개 WOD 개수 제한에 도달했습니다
                            </Typography>
                        )}
                    </Box>

                    {/* 만료 알림 */}
                    {(wodStatus.expiring_soon > 0 || wodStatus.expired_wods > 0) && (
                        <Alert
                            severity="warning"
                            icon={<ScheduleIcon />}
                            sx={{ borderRadius: 2 }}
                        >
                            <Stack spacing={1}>
                                {wodStatus.expiring_soon > 0 && (
                                    <Typography variant="body2">
                                        🔔 {wodStatus.expiring_soon}개의 공개 WOD가 3일 이내에 만료됩니다
                                    </Typography>
                                )}
                                {wodStatus.expired_wods > 0 && (
                                    <Typography variant="body2">
                                        ⏰ {wodStatus.expired_wods}개의 WOD가 만료되었습니다
                                    </Typography>
                                )}
                            </Stack>
                        </Alert>
                    )}

                    {/* 프리미엄 업그레이드 안내 */}
                    {(!wodStatus.can_create_wod || !wodStatus.can_create_public_wod) && (
                        <Alert
                            severity="info"
                            icon={<DiamondIcon />}
                            action={
                                <Button
                                    size="small"
                                    color="inherit"
                                    sx={{ fontWeight: 600 }}
                                    onClick={() => setShowUpgradeModal(true)}
                                >
                                    업그레이드
                                </Button>
                            }
                            sx={{ borderRadius: 2 }}
                        >
                            <Typography variant="body2">
                                💎 프리미엄으로 업그레이드하여 제한을 해제하세요
                            </Typography>
                        </Alert>
                    )}

                    {/* 사용 가이드 */}
                    <Box sx={{
                        p: 2,
                        backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: isDarkMode ? 'grey.700' : 'grey.200'
                    }}>
                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                            💡 사용 가이드
                        </Typography>
                        <Stack spacing={0.5}>
                            <Typography variant="caption" color="text.secondary">
                                • 기본 사용자: WOD 최대 5개 (공개 3개)
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                • 공개 WOD는 7일 후 자동 만료
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                • 프리미엄으로 제한 해제 가능
                            </Typography>
                        </Stack>
                    </Box>
                </Stack>
            </CardContent>

            {/* 프리미엄 업그레이드 모달 */}
            <MuiPremiumUpgradeModal
                open={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                onUpgrade={() => {
                    setShowUpgradeModal(false);
                    // TODO: 실제 업그레이드 로직 구현
                    window.alert('프리미엄 업그레이드 기능은 준비 중입니다!');
                }}
            />
        </Card>
    );
};

export default MuiWodStatusCard;
