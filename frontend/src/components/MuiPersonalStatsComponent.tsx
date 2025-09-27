import React from 'react';
import {
    Box, Typography, Card, CardContent, Stack, Chip, Avatar,
    LinearProgress, Divider, Paper
} from './common/MuiComponents';
import {
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    TrendingFlat as TrendingFlatIcon,
    FitnessCenter as FitnessCenterIcon,
    Timer as TimerIcon,
    EmojiEvents as EmojiEventsIcon,
    BarChart as BarChartIcon,
} from '@mui/icons-material';
import { PersonalStats } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface MuiPersonalStatsComponentProps {
    stats: PersonalStats;
    onSetGoal: (programId: number) => void;
}

const MuiPersonalStatsComponent: React.FC<MuiPersonalStatsComponentProps> = ({ stats, onSetGoal }) => {
    const { isDarkMode } = useTheme();

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    const getImprovementText = (improvement: number): string => {
        if (improvement > 0) {
            return `최근 ${improvement.toFixed(1)}% 개선됨! 🎉`;
        } else if (improvement < 0) {
            return `최근 ${Math.abs(improvement).toFixed(1)}% 느려짐`;
        } else {
            return '변화 없음';
        }
    };

    const getImprovementColor = (improvement: number): 'success' | 'error' | 'default' => {
        if (improvement > 0) return 'success';
        if (improvement < 0) return 'error';
        return 'default';
    };

    const getImprovementIcon = (improvement: number) => {
        if (improvement > 0) return <TrendingUpIcon />;
        if (improvement < 0) return <TrendingDownIcon />;
        return <TrendingFlatIcon />;
    };

    return (
        <Paper sx={{ p: 3, borderRadius: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon />
                개인 통계
            </Typography>

            {/* 컴팩트한 통계 카드들 */}
            <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, 1fr)',
                    lg: 'repeat(4, 1fr)'
                },
                gap: 2
            }}>
                {/* 총 운동 횟수 */}
                <Card sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
                    color: 'white',
                    minHeight: 80
                }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                width: 32,
                                height: 32
                            }}>
                                <FitnessCenterIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    {stats.total_workouts}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    총 운동 횟수
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* 평균 기록 */}
                <Card sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
                    color: 'white',
                    minHeight: 80
                }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                width: 32,
                                height: 32
                            }}>
                                <TimerIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    {formatTime(stats.average_time)}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    평균 기록
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* 최고 기록 */}
                <Card sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)',
                    color: 'white',
                    minHeight: 80
                }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                width: 32,
                                height: 32
                            }}>
                                <EmojiEventsIcon sx={{ fontSize: 18 }} />
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    {formatTime(stats.best_time)}
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    최고 기록
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* 개선도 */}
                <Card sx={{
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%)',
                    color: 'white',
                    minHeight: 80
                }}>
                    <CardContent sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                            <Avatar sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.2)',
                                width: 32,
                                height: 32
                            }}>
                                {getImprovementIcon(stats.recent_improvement)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                                    {stats.recent_improvement > 0 ? '+' : ''}{stats.recent_improvement.toFixed(1)}%
                                </Typography>
                                <Typography variant="caption" sx={{ opacity: 0.9 }}>
                                    최근 개선도
                                </Typography>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            {/* 개선도 상세 정보 */}
            <Box sx={{ mt: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={2}>
                    <Chip
                        icon={getImprovementIcon(stats.recent_improvement)}
                        label={getImprovementText(stats.recent_improvement)}
                        color={getImprovementColor(stats.recent_improvement)}
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                    />
                </Stack>
            </Box>

        </Paper>
    );
};

export default MuiPersonalStatsComponent;
