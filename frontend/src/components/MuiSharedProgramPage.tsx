import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Chip,
    Avatar,
    Stack,
    CircularProgress,
    Paper,
    Dialog,
    DialogContent,
    DialogActions,
    IconButton,
} from './common/MuiComponents';
import {
    FitnessCenter as FitnessCenterIcon,
    Group as GroupIcon,
    CalendarToday as CalendarIcon,
    Cancel as CancelIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    Warning as WarningIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { ProgramDetail } from '../types';
import { programApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';

interface MuiSharedProgramPageProps {
    programId: number;
    onClose: () => void;
}

// WOD 패턴 타입을 한글로 변환하는 함수
const getWorkoutTypeLabel = (type: string) => {
    const typeMap: { [key: string]: string } = {
        'round_based': '라운드 제한',
        'time_cap': '시간 제한'
    };
    return typeMap[type] || type;
};

const MuiSharedProgramPage: React.FC<MuiSharedProgramPageProps> = ({ programId, onClose }) => {
    const { isDarkMode } = useTheme();
    const [program, setProgram] = useState<ProgramDetail | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string>('');

    const loadProgram = useCallback(async () => {
        setLoading(true);
        try {
            const response = await programApi.getProgramDetail(programId);
            setProgram(response.program);
        } catch (err) {
            console.error('프로그램 로드 실패:', err);
            setError('프로그램을 불러올 수 없습니다.');
        } finally {
            setLoading(false);
        }
    }, [programId]);

    useEffect(() => {
        loadProgram();
    }, [loadProgram]);

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'success';
            case 'intermediate': return 'warning';
            case 'advanced': return 'error';
            default: return 'default';
        }
    };

    const getDifficultyLabel = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return '초급';
            case 'intermediate': return '중급';
            case 'advanced': return '고급';
            default: return difficulty;
        }
    };

    const getTypeLabel = (type: string) => {
        if (!type || type.trim() === '') {
            return null;
        }
        switch (type) {
            case 'wod': return 'WOD';
            case 'time_based': return '시간 기반';
            case 'rep_based': return '횟수 기반';
            default: return type;
        }
    };

    // 만료 기한 관련 유틸리티 함수
    const getExpiryInfo = (expiresAt?: string) => {
        if (!expiresAt) return null;

        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs <= 0) {
            return { status: 'expired', days: 0, text: '만료됨' };
        } else if (diffDays <= 1) {
            return { status: 'urgent', days: diffDays, text: '오늘 만료' };
        } else if (diffDays <= 3) {
            return { status: 'warning', days: diffDays, text: `${diffDays}일 후 만료` };
        } else {
            return { status: 'normal', days: diffDays, text: `${diffDays}일 후 만료` };
        }
    };

    if (loading) {
        return (
            <Dialog open={true} maxWidth="sm" fullWidth>
                <DialogContent>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                        <CircularProgress />
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    if (error || !program) {
        return (
            <Dialog open={true} maxWidth="sm" fullWidth onClose={onClose}>
                <DialogContent>
                    <Box sx={{ textAlign: 'center', p: 4 }}>
                        <Typography variant="h6" color="error" gutterBottom>
                            {error || '프로그램을 찾을 수 없습니다'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            프로그램이 삭제되었거나 공개가 중단되었을 수 있습니다.
                        </Typography>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} variant="contained">
                        닫기
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    return (
        <Dialog
            open={true}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: { xs: 2, sm: 4 },
                    backgroundImage: 'none',
                    backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    boxShadow: isDarkMode
                        ? '0 24px 48px rgba(0, 0, 0, 0.4)'
                        : '0 24px 48px rgba(0, 0, 0, 0.12)',
                    maxHeight: { xs: '90vh', sm: '80vh', md: '70vh' },
                    height: { xs: 'auto', sm: 'auto' },
                    mx: { xs: 1, sm: 2 },
                    my: { xs: 1, sm: 2 },
                    display: 'flex',
                    flexDirection: 'column',
                }
            }}
        >
            {/* 헤더 - 그라데이션 배경 (고정 영역) */}
            <Box
                sx={{
                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                    color: 'white',
                    p: { xs: 2, sm: 3 },
                    position: 'relative',
                    overflow: 'hidden',
                    flexShrink: 0,
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

                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h4" component="h1" sx={{
                            fontWeight: 700,
                            mb: 1,
                            fontSize: { xs: '1.5rem', sm: '2.125rem' }
                        }}>
                            {program.title}
                        </Typography>
                        <Typography variant="body1" sx={{
                            opacity: 0.9,
                            mb: 2,
                            fontSize: { xs: '0.875rem', sm: '1rem' }
                        }}>
                            {program.description}
                        </Typography>

                        {/* 기본 정보 태그들 */}
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            <Chip
                                label={`🎯 ${program.target_value}`}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            />
                            <Chip
                                label={`🏋️ ${getTypeLabel(program.workout_type) || '미분류'}`}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            />
                            <Chip
                                label={`📈 ${getDifficultyLabel(program.difficulty)}`}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            />
                            <Chip
                                label={`👥 ${program.participants}/${program.max_participants}명`}
                                size="small"
                                sx={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                    color: 'white',
                                    fontWeight: 600,
                                }}
                            />
                        </Stack>
                    </Box>

                    <IconButton
                        onClick={onClose}
                        size="large"
                        sx={{
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        <CancelIcon />
                    </IconButton>
                </Stack>
            </Box>

            {/* 스크롤 가능한 콘텐츠 영역 */}
            <DialogContent sx={{
                p: 0,
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                    width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                    backgroundColor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '3px',
                },
            }}>
                <Box sx={{ p: { xs: 2, sm: 3 } }}>
                    {/* 만료 기한 정보 */}
                    {program.expires_at && (() => {
                        const expiryInfo = getExpiryInfo(program.expires_at);
                        if (!expiryInfo) return null;

                        const getChipColor = () => {
                            switch (expiryInfo.status) {
                                case 'expired': return 'error';
                                case 'urgent': return 'error';
                                case 'warning': return 'warning';
                                default: return 'default';
                            }
                        };

                        const getIcon = () => {
                            switch (expiryInfo.status) {
                                case 'expired': return <WarningIcon fontSize="small" />;
                                case 'urgent': return <AccessTimeIcon fontSize="small" />;
                                case 'warning': return <ScheduleIcon fontSize="small" />;
                                default: return <CalendarIcon fontSize="small" />;
                            }
                        };

                        return (
                            <Box sx={{ mb: 3 }}>
                                <Chip
                                    icon={getIcon()}
                                    label={expiryInfo.text}
                                    size="medium"
                                    color={getChipColor()}
                                    variant={expiryInfo.status === 'expired' ? 'filled' : 'outlined'}
                                    sx={{
                                        fontWeight: expiryInfo.status === 'urgent' || expiryInfo.status === 'expired' ? 600 : 400,
                                        '& .MuiChip-icon': {
                                            fontSize: '18px'
                                        }
                                    }}
                                />
                            </Box>
                        );
                    })()}

                    {/* 운동 목록 */}
                    <Box sx={{ mb: { xs: 3, sm: 4 } }}>
                        <Typography variant="h5" sx={{
                            mb: { xs: 2, sm: 3 },
                            fontWeight: 600,
                            color: 'text.primary',
                            fontSize: { xs: '1.25rem', sm: '1.5rem' }
                        }}>
                            🏋️ 포함된 운동
                        </Typography>

                        {/* WOD 패턴 방식 운동 목록 */}
                        {program.workout_pattern?.exercises && program.workout_pattern.exercises.length > 0 && (
                            <Card sx={{ mb: 3, overflow: 'hidden' }}>
                                <Box sx={{
                                    p: 2,
                                    background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                    color: 'white',
                                }}>
                                    <Typography variant="h6" sx={{
                                        fontWeight: 600,
                                        fontSize: { xs: '1rem', sm: '1.25rem' }
                                    }}>
                                        🎯 WOD 패턴 운동
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 2 }}>
                                    <Stack spacing={2}>
                                        {program.workout_pattern.exercises.map((exercise, index) => (
                                            <Card key={index} variant="outlined" sx={{
                                                p: { xs: 1.5, sm: 2 },
                                                border: '1px solid',
                                                borderColor: 'primary.main',
                                                backgroundColor: 'primary.50',
                                            }}>
                                                <Stack spacing={2}>
                                                    {/* 운동명과 기본 횟수 */}
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Stack direction="row" alignItems="center" spacing={2}>
                                                            <Avatar sx={{
                                                                bgcolor: 'primary.main',
                                                                width: 32,
                                                                height: 32,
                                                                fontSize: '0.875rem',
                                                            }}>
                                                                {index + 1}
                                                            </Avatar>
                                                            <Typography variant="body1" sx={{
                                                                fontWeight: 600,
                                                                fontSize: { xs: '0.875rem', sm: '1rem' }
                                                            }}>
                                                                {exercise.exercise_name}
                                                            </Typography>
                                                        </Stack>
                                                        <Chip
                                                            label={exercise.base_reps ? `${exercise.base_reps}회` : ''}
                                                            color="primary"
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    </Stack>

                                                    {/* 진행 방식 정보 */}
                                                    <Box sx={{
                                                        pl: { xs: 2, sm: 3 },
                                                        py: 2,
                                                        bgcolor: (() => {
                                                            const type = exercise.progression_type;
                                                            if (type === 'increase') return 'rgba(76, 175, 80, 0.08)';
                                                            if (type === 'decrease') return 'rgba(244, 67, 54, 0.08)';
                                                            if (type === 'mixed') return 'rgba(255, 152, 0, 0.08)';
                                                            if (type === 'fixed') return 'rgba(25, 118, 210, 0.08)';
                                                            return 'rgba(158, 158, 158, 0.08)';
                                                        })(),
                                                        borderRadius: 2,
                                                        border: '1px solid',
                                                        borderColor: (() => {
                                                            const type = exercise.progression_type;
                                                            if (type === 'increase') return 'rgba(76, 175, 80, 0.3)';
                                                            if (type === 'decrease') return 'rgba(244, 67, 54, 0.3)';
                                                            if (type === 'mixed') return 'rgba(255, 152, 0, 0.3)';
                                                            if (type === 'fixed') return 'rgba(25, 118, 210, 0.3)';
                                                            return 'rgba(158, 158, 158, 0.3)';
                                                        })(),
                                                    }}>
                                                        <Stack spacing={1}>
                                                            {/* 진행 방식 헤더 */}
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                {(() => {
                                                                    const type = exercise.progression_type;

                                                                    if (type === 'increase') {
                                                                        return (
                                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main' }}>
                                                                                📈 증가 패턴
                                                                            </Typography>
                                                                        );
                                                                    } else if (type === 'decrease') {
                                                                        return (
                                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'error.main' }}>
                                                                                📉 감소 패턴
                                                                            </Typography>
                                                                        );
                                                                    } else if (type === 'mixed') {
                                                                        return (
                                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'warning.main' }}>
                                                                                🔄 혼합 패턴
                                                                            </Typography>
                                                                        );
                                                                    } else if (type === 'fixed') {
                                                                        return (
                                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'info.main' }}>
                                                                                🔒 고정 패턴
                                                                            </Typography>
                                                                        );
                                                                    } else {
                                                                        return (
                                                                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                                                                                ❓ 진행 방식 미정
                                                                            </Typography>
                                                                        );
                                                                    }
                                                                })()}
                                                            </Stack>

                                                            {/* 진행 방식 상세 정보 */}
                                                            <Stack direction="column" spacing={1}>
                                                                <Chip
                                                                    icon={(() => {
                                                                        const type = exercise.progression_type;
                                                                        if (type === 'increase') return <TrendingUpIcon />;
                                                                        if (type === 'decrease') return <TrendingUpIcon sx={{ transform: 'rotate(180deg)' }} />;
                                                                        if (type === 'mixed') return <TrendingUpIcon />;
                                                                        return <TrendingUpIcon />;
                                                                    })()}
                                                                    label={(() => {
                                                                        const type = exercise.progression_type;
                                                                        const value = exercise.progression_value || 1;

                                                                        if (type === 'increase') return `라운드당 ${value}회씩 증가`;
                                                                        if (type === 'decrease') return `라운드당 ${value}회씩 감소`;
                                                                        if (type === 'mixed') return `혼합 진행 (${value}회)`;
                                                                        if (type === 'fixed') return '횟수 고정';
                                                                        return '진행 방식 정보 없음';
                                                                    })()}
                                                                    size="small"
                                                                    color={(() => {
                                                                        const type = exercise.progression_type;
                                                                        if (type === 'increase') return 'success';
                                                                        if (type === 'decrease') return 'error';
                                                                        if (type === 'mixed') return 'warning';
                                                                        if (type === 'fixed') return 'info';
                                                                        return 'default';
                                                                    })()}
                                                                    variant="filled"
                                                                    sx={{
                                                                        fontSize: '0.75rem',
                                                                        height: 24,
                                                                        fontWeight: 600,
                                                                        width: 'fit-content',
                                                                        maxWidth: { xs: '100%', sm: '280px' },
                                                                        whiteSpace: 'normal',
                                                                        wordBreak: 'keep-all',
                                                                        px: 1,
                                                                        py: 0,
                                                                    }}
                                                                />

                                                                {/* 예시 표시 */}
                                                                <Typography variant="caption" sx={{
                                                                    color: 'text.secondary',
                                                                    fontStyle: 'italic',
                                                                    fontSize: '0.7rem',
                                                                    display: 'block',
                                                                    mt: 0.5,
                                                                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                                                    px: 1,
                                                                    py: 0.25,
                                                                    borderRadius: 1,
                                                                    border: '1px solid rgba(0, 0, 0, 0.1)',
                                                                    width: 'fit-content',
                                                                    maxWidth: { xs: '100%', sm: '280px' },
                                                                    whiteSpace: 'normal',
                                                                    wordBreak: 'keep-all',
                                                                    minHeight: 'auto',
                                                                    height: 'auto'
                                                                }}>
                                                                    {(() => {
                                                                        const baseReps = exercise.base_reps || 0;
                                                                        const progressionValue = exercise.progression_value || 1;
                                                                        const type = exercise.progression_type;

                                                                        if (type === 'increase') {
                                                                            return `예: 1라운드 ${baseReps}회 → 2라운드 ${baseReps + progressionValue}회`;
                                                                        } else if (type === 'decrease') {
                                                                            return `예: 1라운드 ${baseReps}회 → 2라운드 ${Math.max(0, baseReps - progressionValue)}회`;
                                                                        } else if (type === 'mixed') {
                                                                            return `예: 혼합 패턴 (라운드별로 다름)`;
                                                                        } else if (type === 'fixed') {
                                                                            return `예: 모든 라운드 ${baseReps}회 고정`;
                                                                        } else {
                                                                            return `예: 진행 방식 정보 없음`;
                                                                        }
                                                                    })()}
                                                                </Typography>
                                                            </Stack>
                                                        </Stack>
                                                    </Box>
                                                </Stack>
                                            </Card>
                                        ))}
                                    </Stack>
                                </Box>
                            </Card>
                        )}

                        {/* 기존 방식 운동 목록 */}
                        {(!program.workout_pattern?.exercises || program.workout_pattern.exercises.length === 0) &&
                            program.exercises && program.exercises.length > 0 && (
                                <Card sx={{ mb: 3, overflow: 'hidden' }}>
                                    <Box sx={{
                                        p: 2,
                                        background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                                        color: 'white',
                                    }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            💪 기본 운동
                                        </Typography>
                                    </Box>
                                    <Box sx={{ p: 2 }}>
                                        <Stack spacing={2}>
                                            {program.exercises.map((exercise, index) => (
                                                <Card key={index} variant="outlined" sx={{
                                                    p: 2,
                                                    border: '1px solid',
                                                    borderColor: 'warning.main',
                                                    backgroundColor: 'warning.50',
                                                }}>
                                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                        <Stack direction="row" alignItems="center" spacing={2}>
                                                            <Avatar sx={{
                                                                bgcolor: 'warning.main',
                                                                width: 32,
                                                                height: 32,
                                                                fontSize: '0.875rem',
                                                            }}>
                                                                {index + 1}
                                                            </Avatar>
                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                {exercise.name}
                                                            </Typography>
                                                        </Stack>
                                                        <Chip
                                                            label={exercise.target_value}
                                                            color="warning"
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    </Stack>
                                                </Card>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Card>
                            )}

                        {/* 운동 목록이 없는 경우 */}
                        {(!program.workout_pattern?.exercises || program.workout_pattern.exercises.length === 0) &&
                            (!program.exercises || program.exercises.length === 0) && (
                                <Card sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        🏃‍♂️ 운동 정보 없음
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        이 프로그램에는 포함된 운동이 없습니다.
                                    </Typography>
                                </Card>
                            )}
                    </Box>

                    {/* WOD 패턴 정보 */}
                    {program.workout_pattern && (
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                                🔄 WOD 패턴
                            </Typography>
                            <Card sx={{ overflow: 'hidden' }}>
                                <Box sx={{
                                    p: 2,
                                    background: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
                                    color: 'white',
                                }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                        패턴 상세 정보
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 3 }}>
                                    <Stack spacing={3}>
                                        {/* 패턴 태그들 */}
                                        <Stack direction="row" spacing={2} flexWrap="wrap">
                                            <Chip
                                                label={getWorkoutTypeLabel(program.workout_pattern.type)}
                                                color="primary"
                                                variant="filled"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            <Chip
                                                label={`${program.workout_pattern.total_rounds ?? 0}라운드`}
                                                color="secondary"
                                                variant="filled"
                                                sx={{ fontWeight: 600 }}
                                            />
                                            {program.workout_pattern.time_cap_per_round && (
                                                <Chip
                                                    label={`${program.workout_pattern.time_cap_per_round}분 제한`}
                                                    color="warning"
                                                    variant="filled"
                                                    sx={{ fontWeight: 600 }}
                                                />
                                            )}
                                        </Stack>

                                        {/* 패턴 설명 */}
                                        {program.workout_pattern.description && (
                                            <Paper sx={{
                                                p: 2,
                                                bgcolor: isDarkMode ? 'grey.800' : 'grey.50',
                                                border: '1px solid',
                                                borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                                            }}>
                                                <Typography variant="body1" sx={{
                                                    fontWeight: 500,
                                                    color: isDarkMode ? 'text.primary' : 'text.primary',
                                                }}>
                                                    {program.workout_pattern.description}
                                                </Typography>
                                            </Paper>
                                        )}
                                    </Stack>
                                </Box>
                            </Card>
                        </Box>
                    )}

                    {/* 안내 메시지 */}
                    <Paper sx={{
                        p: 3,
                        bgcolor: isDarkMode ? 'info.dark' : 'info.light',
                        border: '1px solid',
                        borderColor: isDarkMode ? 'info.main' : 'info.main',
                        borderRadius: 2,
                    }}>
                        <Typography variant="body1" sx={{ fontWeight: 600, mb: 1, color: 'info.contrastText' }}>
                            💡 이 WOD에 참여하고 싶으신가요?
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'info.contrastText' }}>
                            로그인하여 프로그램에 참여하고 운동 기록을 관리하세요!
                        </Typography>
                    </Paper>
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
                    variant="contained"
                    size="large"
                    sx={{
                        borderRadius: 2,
                        px: 4,
                        py: 1.5,
                        fontWeight: 600,
                    }}
                >
                    닫기
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MuiSharedProgramPage;

