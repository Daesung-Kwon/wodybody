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
    IconButton,
    Switch,
    FormControlLabel,
} from './common/MuiComponents';
import {
    PlayArrow as PlayArrowIcon,
    Pause as PauseIcon,
    Refresh as RefreshIcon,
    Close as CloseIcon,
    CheckCircle as CheckCircleIcon,
    Timer as TimerIcon,
    FitnessCenter as FitnessCenterIcon,
    VolumeUp as VolumeUpIcon,
    VolumeOff as VolumeOffIcon,
    Vibration as VibrationIcon,
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';
import { WorkoutPattern, ExerciseSet } from '../types';

interface MuiWorkoutTimerEnhancedProps {
    onComplete: (completionTime: number, roundTimes: number[]) => void;
    onCancel: () => void;
    programTitle: string;
    workoutPattern?: WorkoutPattern;
}

interface RoundTrackerState {
    currentRound: number;
    totalRounds: number;
    roundStartTime: number;
    completedRounds: number[];
    timeCapPerRound?: number;
}

// Wake Lock 타입 정의 (TypeScript 호환성)
interface WakeLockSentinel extends EventTarget {
    release(): Promise<void>;
    released: boolean;
}

const MuiWorkoutTimerEnhanced: React.FC<MuiWorkoutTimerEnhancedProps> = ({
    onComplete,
    onCancel,
    programTitle,
    workoutPattern
}) => {
    const { isDarkMode } = useTheme();
    const [time, setTime] = useState<number>(0);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Wake Lock 상태
    const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

    // 라운드 추적
    const [roundTracker, setRoundTracker] = useState<RoundTrackerState>({
        currentRound: 1,
        totalRounds: workoutPattern?.total_rounds || 1,
        roundStartTime: 0,
        completedRounds: [],
        timeCapPerRound: workoutPattern?.time_cap_per_round
    });

    // 사용자 설정
    const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
    const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    // Audio Context
    const audioContextRef = useRef<AudioContext | null>(null);

    // Audio Context 초기화
    useEffect(() => {
        if (soundEnabled) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return () => {
            audioContextRef.current?.close();
        };
    }, [soundEnabled]);

    // 알림 권한 확인
    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Wake Lock 요청
    const requestWakeLock = async () => {
        try {
            if ('wakeLock' in navigator) {
                const nav = navigator as any;
                const lock = await nav.wakeLock.request('screen') as WakeLockSentinel;
                setWakeLock(lock);
                console.log('✅ Wake Lock 활성화');

                // Wake Lock 해제 이벤트 리스너
                lock.addEventListener('release', () => {
                    console.log('⚠️ Wake Lock 해제됨');
                });
            }
        } catch (err) {
            console.error('❌ Wake Lock 실패:', err);
        }
    };

    // Wake Lock 해제
    const releaseWakeLock = async () => {
        if (wakeLock) {
            try {
                await wakeLock.release();
                setWakeLock(null);
                console.log('✅ Wake Lock 수동 해제');
            } catch (err) {
                console.error('❌ Wake Lock 해제 실패:', err);
            }
        }
    };

    // 알림 권한 요청
    const requestNotificationPermission = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            return permission;
        }
        return Notification.permission;
    };

    // 음향 효과 - 라운드 완료
    const playRoundCompleteSound = () => {
        if (!soundEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
    };

    // 음향 효과 - 틱 소리 (카운트다운)
    const playTickSound = () => {
        if (!soundEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = 400;
        oscillator.type = 'square';

        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
    };

    // 음향 효과 - 운동 완료
    const playWorkoutCompleteSound = () => {
        if (!soundEnabled || !audioContextRef.current) return;

        const ctx = audioContextRef.current;
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5

        frequencies.forEach((freq, index) => {
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            const startTime = ctx.currentTime + index * 0.2;
            gainNode.gain.setValueAtTime(0.2, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.3);
        });
    };

    // 진동 - 라운드 완료
    const vibrateRoundComplete = () => {
        if (vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate([200, 100, 200]);
        }
    };

    // 진동 - 운동 완료
    const vibrateWorkoutComplete = () => {
        if (vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate([100, 50, 100, 50, 300]);
        }
    };

    // 진동 - 틱
    const vibrateTick = () => {
        if (vibrationEnabled && 'vibrate' in navigator) {
            navigator.vibrate(50);
        }
    };

    // 브라우저 알림
    const showNotification = (title: string, body: string, tag: string) => {
        if (notificationPermission === 'granted') {
            const options: NotificationOptions & { vibrate?: number[] } = {
                body,
                icon: '/logo192.png',
                badge: '/logo192.png',
                tag
            };

            // 진동 지원 시 추가 (Android)
            if (vibrationEnabled && 'vibrate' in navigator) {
                options.vibrate = [200, 100, 200];
            }

            new Notification(title, options);
        }
    };

    // 라운드별 횟수 계산
    const calculateRepsForRound = (exercise: ExerciseSet, round: number): number => {
        const baseReps = exercise.base_reps || 1;
        const progressionValue = exercise.progression_value || 0;

        switch (exercise.progression_type) {
            case 'increase':
                return baseReps + (progressionValue * (round - 1));

            case 'decrease':
                return Math.max(1, baseReps - (progressionValue * (round - 1)));

            case 'mixed':
                if (round % 2 === 1) {
                    return baseReps + (progressionValue * Math.floor((round - 1) / 2));
                } else {
                    return Math.max(1, baseReps - (progressionValue * Math.floor(round / 2)));
                }

            case 'fixed':
            default:
                return baseReps;
        }
    };

    // 라운드 완료 처리
    const handleRoundComplete = () => {
        const currentTime = time;
        const roundTime = currentTime - roundTracker.roundStartTime;

        // 마지막 라운드인지 확인
        const isLastRound = roundTracker.currentRound >= roundTracker.totalRounds;

        if (!isLastRound) {
            // 라운드 완료 처리
            setRoundTracker(prev => ({
                ...prev,
                currentRound: prev.currentRound + 1,
                roundStartTime: currentTime,
                completedRounds: [...prev.completedRounds, roundTime]
            }));

            // 피드백
            playRoundCompleteSound();
            vibrateRoundComplete();
            showNotification(
                '라운드 완료!',
                `${roundTracker.currentRound}/${roundTracker.totalRounds} 라운드 완료 (${formatTime(roundTime)})`,
                'round-complete'
            );
        } else {
            // 운동 완료
            completeWorkout();
        }
    };

    // 타이머 시작/일시정지/재개
    const toggleTimer = async () => {
        if (!isRunning) {
            // 타이머 시작
            setIsRunning(true);
            setIsPaused(false);

            // Wake Lock 요청
            await requestWakeLock();

            // 알림 권한 요청
            await requestNotificationPermission();

            // Audio Context 재개 (모바일 대응)
            if (audioContextRef.current?.state === 'suspended') {
                await audioContextRef.current.resume();
            }
        } else {
            // 일시정지/재개
            setIsPaused(!isPaused);

            if (isPaused) {
                // 재개 시 Wake Lock 재요청
                await requestWakeLock();
            } else {
                // 일시정지 시 Wake Lock 해제 (선택적)
                await releaseWakeLock();
            }
        }
    };

    // 타이머 리셋
    const resetTimer = async () => {
        setIsRunning(false);
        setIsPaused(false);
        setTime(0);
        setRoundTracker({
            currentRound: 1,
            totalRounds: workoutPattern?.total_rounds || 1,
            roundStartTime: 0,
            completedRounds: [],
            timeCapPerRound: workoutPattern?.time_cap_per_round
        });

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        await releaseWakeLock();
    };

    // 타이머 완료
    const completeWorkout = async () => {
        const finalTime = time;
        const finalRoundTime = finalTime - roundTracker.roundStartTime;
        const allRoundTimes = [...roundTracker.completedRounds, finalRoundTime];

        setIsRunning(false);
        setIsPaused(false);

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }

        // 피드백
        playWorkoutCompleteSound();
        vibrateWorkoutComplete();
        showNotification(
            '운동 완료! 🎉',
            `총 ${formatTime(finalTime)}에 완료했습니다.`,
            'workout-complete'
        );

        await releaseWakeLock();

        onComplete(finalTime, allRoundTimes);
    };

    // 타이머 취소
    const cancelWorkout = async () => {
        await resetTimer();
        onCancel();
    };

    // 시간 포맷팅
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

    // 시간 제한 모드 처리
    useEffect(() => {
        if (!isRunning || isPaused || !roundTracker.timeCapPerRound || !workoutPattern) return;

        const timeCapSeconds = roundTracker.timeCapPerRound * 60;
        const elapsedInRound = time - roundTracker.roundStartTime;
        const remainingTime = timeCapSeconds - elapsedInRound;

        // 마지막 3초 카운트다운
        if (remainingTime > 0 && remainingTime <= 3) {
            const fraction = remainingTime % 1;
            if (fraction < 0.1) {
                playTickSound();
                vibrateTick();
            }
        }

        // 시간 초과 시 라운드 완료
        if (remainingTime <= 0) {
            handleRoundComplete();
        }
    }, [time, isRunning, isPaused, roundTracker, workoutPattern]);

    // 컴포넌트 언마운트 시 Wake Lock 해제
    useEffect(() => {
        return () => {
            releaseWakeLock();
        };
    }, []);

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
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: 1 }}>
                        <FitnessCenterIcon sx={{ fontSize: '2rem' }} />
                        <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                            {programTitle}
                        </Typography>
                    </Stack>

                    {/* 설정 버튼들 */}
                    <Stack direction="row" spacing={1}>
                        <IconButton
                            size="small"
                            onClick={() => setSoundEnabled(!soundEnabled)}
                            sx={{ color: 'white' }}
                        >
                            {soundEnabled ? <VolumeUpIcon /> : <VolumeOffIcon />}
                        </IconButton>
                        {('vibrate' in navigator) && (
                            <IconButton
                                size="small"
                                onClick={() => setVibrationEnabled(!vibrationEnabled)}
                                sx={{ color: 'white', opacity: vibrationEnabled ? 1 : 0.5 }}
                            >
                                <VibrationIcon />
                            </IconButton>
                        )}
                    </Stack>
                </Stack>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                    운동을 시작하세요!
                </Typography>
            </DialogTitle>

            <DialogContent sx={{ textAlign: 'center', py: 3 }}>
                {/* 라운드 정보 */}
                {workoutPattern && (
                    <Paper sx={{
                        p: 2,
                        mb: 3,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <Stack spacing={2}>
                            <Box sx={{ textAlign: 'center' }}>
                                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                                    라운드 {roundTracker.currentRound} / {roundTracker.totalRounds}
                                </Typography>
                                {roundTracker.timeCapPerRound && (
                                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                                        제한시간: {roundTracker.timeCapPerRound}분
                                    </Typography>
                                )}
                            </Box>

                            {/* 전체 라운드 진행률 */}
                            <Box>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Typography variant="caption">전체 진행률</Typography>
                                    <Typography variant="caption">
                                        {Math.round((roundTracker.currentRound / roundTracker.totalRounds) * 100)}%
                                    </Typography>
                                </Stack>
                                <LinearProgress
                                    variant="determinate"
                                    value={(roundTracker.currentRound / roundTracker.totalRounds) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: '#2ecc71',
                                        },
                                    }}
                                />
                            </Box>

                            {/* 시간 제한 모드: 현재 라운드 진행률 */}
                            {roundTracker.timeCapPerRound && isRunning && (
                                <Box>
                                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                        <Typography variant="caption">현재 라운드</Typography>
                                        <Typography variant="caption">
                                            {formatTime(time - roundTracker.roundStartTime)} /
                                            {formatTime(roundTracker.timeCapPerRound * 60)}
                                        </Typography>
                                    </Stack>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(100, ((time - roundTracker.roundStartTime) / (roundTracker.timeCapPerRound * 60)) * 100)}
                                        sx={{
                                            height: 6,
                                            borderRadius: 3,
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: ((time - roundTracker.roundStartTime) / (roundTracker.timeCapPerRound * 60)) > 0.9
                                                    ? '#e74c3c'
                                                    : '#3498db',
                                            },
                                        }}
                                    />
                                </Box>
                            )}
                        </Stack>
                    </Paper>
                )}

                {/* 타이머 디스플레이 */}
                <Box sx={{ mb: 3 }}>
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
                            mb: 2,
                        }}
                    />
                </Fade>

                {/* 현재 라운드 운동 정보 */}
                {workoutPattern && isRunning && (
                    <Paper sx={{
                        p: 2,
                        borderRadius: 2,
                        background: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                    }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                            현재 라운드 운동
                        </Typography>
                        <Stack spacing={0.5}>
                            {workoutPattern.exercises.map((exercise, index) => {
                                const reps = calculateRepsForRound(exercise, roundTracker.currentRound);
                                return (
                                    <Box
                                        key={index}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            p: 1,
                                            borderRadius: 1,
                                            bgcolor: 'rgba(0, 0, 0, 0.2)'
                                        }}
                                    >
                                        <Typography variant="body2">
                                            {exercise.exercise_name}
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {reps}회
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Stack>
                    </Paper>
                )}

                {/* 완료된 라운드 */}
                {roundTracker.completedRounds.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>
                            완료된 라운드
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                            {roundTracker.completedRounds.map((roundTime, index) => (
                                <Chip
                                    key={index}
                                    label={`R${index + 1}: ${formatTime(roundTime)}`}
                                    size="small"
                                    sx={{
                                        backgroundColor: 'rgba(46, 204, 113, 0.3)',
                                        color: 'white',
                                        fontWeight: 600,
                                        mb: 1,
                                    }}
                                />
                            ))}
                        </Stack>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ flexDirection: 'column', gap: 2, p: 3 }}>
                {/* 라운드 완료 버튼 (수동) */}
                {workoutPattern && isRunning && !roundTracker.timeCapPerRound && (
                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleRoundComplete}
                        sx={{
                            width: '100%',
                            py: 1.5,
                            px: 2,
                            fontSize: '1.1rem',
                            fontWeight: 600,
                            backgroundColor: '#3498db',
                            '&:hover': {
                                backgroundColor: '#2980b9',
                            },
                        }}
                    >
                        라운드 완료 ({roundTracker.currentRound}/{roundTracker.totalRounds})
                    </Button>
                )}

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

export default MuiWorkoutTimerEnhanced;

