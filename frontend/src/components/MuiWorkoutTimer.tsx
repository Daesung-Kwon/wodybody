import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Stack,
    Chip,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Fade,
    Zoom,
} from './common/MuiComponents';
import {
    PlayArrow as PlayArrowIcon,
    Pause as PauseIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Timer as TimerIcon,
    FitnessCenter as FitnessCenterIcon,
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

interface MuiWorkoutTimerProps {
    onComplete: (completionTime: number) => void;
    onCancel: () => void;
    programTitle: string;
}

const MuiWorkoutTimer: React.FC<MuiWorkoutTimerProps> = ({
    onComplete,
    onCancel,
    programTitle
}) => {
    const { isDarkMode } = useTheme();
    const [time, setTime] = useState<number>(0); // 초 단위
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // 타이머 시작/일시정지/재개
    const toggleTimer = () => {
        if (!isRunning) {
            setIsRunning(true);
            setIsPaused(false);
        } else {
            setIsPaused(!isPaused);
        }
    };

    // 타이머 리셋
    const resetTimer = () => {
        setIsRunning(false);
        setIsPaused(false);
        setTime(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // 타이머 완료
    const completeWorkout = () => {
        setIsRunning(false);
        setIsPaused(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        onComplete(time);
    };

    // 타이머 취소
    const cancelWorkout = () => {
        resetTimer();
        onCancel();
    };

    // 시간 포맷팅 (MM:SS)
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // 타이머 실행
    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                setTime(prevTime => prevTime + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, isPaused]);

    const getStatusColor = () => {
        if (!isRunning && time === 0) return 'default';
        if (isRunning && !isPaused) return 'success';
        if (isPaused) return 'warning';
        if (time > 0 && !isRunning) return 'error';
        return 'default';
    };

    const getStatusText = () => {
        if (!isRunning && time === 0) return '운동을 시작하려면 시작 버튼을 누르세요';
        if (isRunning && !isPaused) return '운동 진행 중...';
        if (isPaused) return '일시정지 중';
        if (time > 0 && !isRunning) return '운동 완료! 기록을 저장하세요';
        return '';
    };

    const getStatusIcon = () => {
        if (!isRunning && time === 0) return <TimerIcon />;
        if (isRunning && !isPaused) return <FitnessCenterIcon />;
        if (isPaused) return <PauseIcon />;
        if (time > 0 && !isRunning) return <CheckCircleIcon />;
        return <TimerIcon />;
    };

    return (
        <Dialog
            open={true}
            onClose={cancelWorkout}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    background: isDarkMode
                        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
                },
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                    <FitnessCenterIcon sx={{ fontSize: '2rem' }} />
                    <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                        {programTitle}
                    </Typography>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                    운동을 시작하세요!
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ textAlign: 'center', py: 4 }}>
                {/* 타이머 디스플레이 */}
                <Box sx={{ mb: 4 }}>
                    <Zoom in={true} timeout={500}>
                        <Paper
                            elevation={8}
                            sx={{
                                width: { xs: 180, sm: 220 },
                                height: { xs: 180, sm: 220 },
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mx: 'auto',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: '4px solid rgba(255, 255, 255, 0.3)',
                                backdropFilter: 'blur(10px)',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    borderColor: 'rgba(255, 255, 255, 0.5)',
                                },
                            }}
                        >
                            <Typography
                                variant="h2"
                                sx={{
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                    fontSize: { xs: '2.5rem', sm: '3rem' },
                                }}
                            >
                                {formatTime(time)}
                            </Typography>
                        </Paper>
                    </Zoom>
                </Box>

                {/* 상태 표시 */}
                <Fade in={true} timeout={300}>
                    <Chip
                        icon={getStatusIcon()}
                        label={getStatusText()}
                        color={getStatusColor() as any}
                        variant="outlined"
                        sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            fontWeight: 600,
                            mb: 3,
                        }}
                    />
                </Fade>

                {/* 진행률 표시 (운동 중일 때) */}
                {isRunning && (
                    <Box sx={{ mb: 3 }}>
                        <LinearProgress
                            variant="indeterminate"
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: '#2ecc71',
                                },
                            }}
                        />
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ flexDirection: 'column', gap: 2, p: 3 }}>
                {/* 메인 컨트롤 버튼들 */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                    width: '100%'
                }}>
                    {!isRunning ? (
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<PlayArrowIcon />}
                            onClick={toggleTimer}
                            sx={{
                                gridColumn: '1 / -1',
                                py: 1.5,
                                px: 2,
                                fontSize: '1.1rem',
                                fontWeight: 600,
                                backgroundColor: '#27ae60',
                                height: 48,
                                '&:hover': {
                                    backgroundColor: '#219a52',
                                    transform: 'translateY(-2px)',
                                },
                            }}
                        >
                            시작
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={isPaused ? <PlayArrowIcon /> : <PauseIcon />}
                                onClick={toggleTimer}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    backgroundColor: '#f39c12',
                                    height: 48,
                                    '&:hover': {
                                        backgroundColor: '#e67e22',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                {isPaused ? '재개' : '일시정지'}
                            </Button>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<CheckCircleIcon />}
                                onClick={completeWorkout}
                                sx={{
                                    py: 1.5,
                                    px: 2,
                                    fontSize: '1.1rem',
                                    fontWeight: 600,
                                    backgroundColor: '#e74c3c',
                                    height: 48,
                                    '&:hover': {
                                        backgroundColor: '#c0392b',
                                        transform: 'translateY(-2px)',
                                    },
                                }}
                            >
                                완료
                            </Button>
                        </>
                    )}
                </Box>

                {/* 보조 컨트롤 버튼들 */}
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 2,
                    width: '100%'
                }}>
                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<RefreshIcon />}
                        onClick={resetTimer}
                        disabled={time === 0}
                        sx={{
                            py: 1.5,
                            px: 2,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            height: 48,
                            '&:hover': {
                                borderColor: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transform: 'translateY(-1px)',
                            },
                            '&:disabled': {
                                color: 'rgba(255, 255, 255, 0.3)',
                                borderColor: 'rgba(255, 255, 255, 0.2)',
                            },
                        }}
                    >
                        리셋
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        startIcon={<CloseIcon />}
                        onClick={cancelWorkout}
                        sx={{
                            py: 1.5,
                            px: 2,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            color: 'white',
                            borderColor: 'rgba(255, 255, 255, 0.5)',
                            height: 48,
                            '&:hover': {
                                borderColor: 'white',
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                transform: 'translateY(-1px)',
                            },
                        }}
                    >
                        취소
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};

export default MuiWorkoutTimer;
