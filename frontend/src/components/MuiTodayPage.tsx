import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Card, CardContent, Chip,
    Paper, CircularProgress, Alert, Divider,
} from './common/MuiComponents';
import {
    PlayArrow as PlayArrowIcon,
    Refresh as RefreshIcon,
    SkipNext as SkipNextIcon,
    CheckCircle as CheckCircleIcon,
    AutoAwesome as AutoAwesomeIcon,
    AccessTime as AccessTimeIcon,
    FitnessCenter as FitnessCenterIcon,
} from '@mui/icons-material';
import { DailyAssignment } from '../types';
import { todayApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';
import MuiWorkoutTimer from './MuiWorkoutTimer';

interface MuiTodayPageProps {
    goPreferences: () => void;
}

const formatDate = (iso?: string | null): string => {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('ko-KR', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
        });
    } catch {
        return iso;
    }
};

const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

const MuiTodayPage: React.FC<MuiTodayPageProps> = ({ goPreferences }) => {
    const { isDarkMode } = useTheme();
    const [assignment, setAssignment] = useState<DailyAssignment | null>(null);
    const [busy, setBusy] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [timerOpen, setTimerOpen] = useState<boolean>(false);

    const load = useCallback(async () => {
        setBusy(true);
        setError(null);
        try {
            const data = await todayApi.getToday();
            setAssignment(data);
        } catch (e: any) {
            setError(e?.message || '오늘의 추천을 가져오지 못했습니다');
        } finally {
            setBusy(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const data = await todayApi.refresh();
            setAssignment(data);
        } catch (e: any) {
            window.alert(e?.message || '추천 새로받기에 실패했습니다');
        } finally {
            setRefreshing(false);
        }
    };

    const handleSkip = async () => {
        try {
            const res = await todayApi.skip();
            setAssignment(res.assignment);
        } catch (e: any) {
            window.alert(e?.message || '건너뛰기에 실패했습니다');
        }
    };

    const handleStart = () => {
        if (assignment?.program_id) {
            setTimerOpen(true);
        }
    };

    const handleTimerComplete = async (seconds: number) => {
        try {
            const res = await todayApi.complete({ completion_time: seconds });
            setAssignment(res.assignment);
            setTimerOpen(false);
        } catch (e: any) {
            window.alert(e?.message || '완료 기록에 실패했습니다');
        }
    };

    if (busy) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error" action={
                    <Button color="inherit" size="small" onClick={load}>다시 시도</Button>
                }>{error}</Alert>
            </Box>
        );
    }

    const program = assignment?.program;
    const completed = !!assignment?.completed_at;
    const skipped = !!assignment?.skipped_at;
    const refreshLeft = Math.max(
        0,
        (assignment?.daily_refresh_limit ?? 3) - (assignment?.refresh_count ?? 0)
    );

    if (timerOpen && program) {
        return (
            <MuiWorkoutTimer
                programTitle={program.title}
                onComplete={handleTimerComplete}
                onCancel={() => setTimerOpen(false)}
            />
        );
    }

    return (
        <Box sx={{ maxWidth: 720, mx: 'auto', p: { xs: 2, md: 3 } }}>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="overline" color="text.secondary">
                    {formatDate(assignment?.assignment_date || new Date().toISOString())}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    오늘의 PT
                </Typography>
            </Stack>

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                오늘의 운동
            </Typography>

            {assignment && !program && (
                <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={goPreferences}>
                            선호 입력
                        </Button>
                    }
                >
                    추천 가능한 WOD가 부족합니다. 선호도를 입력하거나 라이브러리에 새 WOD를 추가해 보세요.
                </Alert>
            )}

            <Card
                sx={{
                    background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(25,118,210,0.18), rgba(66,165,245,0.08))'
                        : 'linear-gradient(135deg, #e3f2fd, #ffffff)',
                    border: '1px solid',
                    borderColor: 'divider',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.06)',
                    mb: 2,
                }}
            >
                <CardContent>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <FitnessCenterIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                            {program?.title || '추천 후보 부족'}
                        </Typography>
                        {completed && <Chip label="완료" color="success" size="small" icon={<CheckCircleIcon />} />}
                        {skipped && <Chip label="건너뜀" color="warning" size="small" />}
                    </Stack>

                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                        {program?.difficulty && <Chip size="small" label={program.difficulty} />}
                        {assignment?.duration_estimate_minutes && (
                            <Chip
                                size="small"
                                icon={<AccessTimeIcon />}
                                label={`${assignment.duration_estimate_minutes}분 예상`}
                            />
                        )}
                        {assignment?.intensity_hint && (
                            <Chip size="small" color="primary" variant="outlined" label={`강도: ${assignment.intensity_hint}`} />
                        )}
                        {assignment?.source && (
                            <Chip size="small" variant="outlined" label={assignment.source === 'ai_grok' ? 'AI 추천' : (assignment.source === 'fallback' ? '폴백' : '직접')} />
                        )}
                    </Stack>

                    {assignment?.ai_rationale && (
                        <Paper
                            elevation={0}
                            sx={{
                                p: 2, mb: 2, bgcolor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                borderRadius: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start',
                            }}
                        >
                            <AutoAwesomeIcon color="primary" />
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                                {assignment.ai_rationale}
                            </Typography>
                        </Paper>
                    )}

                    <Divider sx={{ my: 2 }} />

                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            disabled={!program?.id || completed}
                            onClick={handleStart}
                            sx={{ flexGrow: 1, py: 1.5, fontWeight: 700 }}
                        >
                            {completed ? '오늘 운동 완료' : '시작하기'}
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={handleRefresh}
                            disabled={refreshLeft <= 0 || refreshing || completed}
                        >
                            {refreshing ? '추천 중…' : `다른 추천 (${refreshLeft})`}
                        </Button>
                        <Button
                            variant="text"
                            color="warning"
                            startIcon={<SkipNextIcon />}
                            onClick={handleSkip}
                            disabled={completed || skipped}
                        >
                            건너뛰기
                        </Button>
                    </Stack>
                </CardContent>
            </Card>

            {assignment?.completed_at && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    오늘 운동을 완료하셨어요! 기록은 History에서 확인할 수 있습니다.
                </Alert>
            )}

            <Typography variant="body2" color="text.secondary">
                푸시 시간/난이도/사용 기구를 바꾸려면{' '}
                <Button size="small" onClick={goPreferences}>선호도 설정</Button>
            </Typography>
        </Box>
    );
};

export default MuiTodayPage;
