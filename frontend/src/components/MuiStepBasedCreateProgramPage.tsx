import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent,
    TextField, FormControl, InputLabel, Select, MenuItem, Stepper, Step, StepLabel,
    Divider, Chip, Avatar, Fade, Container
} from './common/MuiComponents';
import {
    Group as GroupIcon,
    CheckCircle as CheckCircleIcon,
    ArrowBack as ArrowBackIcon,
    ArrowForward as ArrowForwardIcon,
    Cancel as CancelIcon,
    Save as SaveIcon,
    SportsHandball as SportsHandballIcon,
    EmojiEvents as EmojiEventsIcon
} from '@mui/icons-material';
import { CreateProgramPageProps, CreateProgramForm, SelectedExercise, WorkoutPattern } from '../types';
import { programApi } from '../utils/api';
import MuiExerciseSelector from './MuiExerciseSelector';
import MuiWODBuilder from './MuiWODBuilder';
import MuiLoadingSpinner from './MuiLoadingSpinner';
import MuiWodStatusCard from './MuiWodStatusCard';
import MuiAlertDialog from './MuiAlertDialog';
import { useTheme } from '../theme/ThemeProvider';

type ExerciseMode = 'simple' | 'wod' | null;

interface StepData {
    // 1단계: 기본 정보
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    max_participants: number;

    // 2단계: 운동 방식
    exercise_mode: ExerciseMode;

    // 3단계: 운동 설정 (조건부)
    selected_exercises: SelectedExercise[];
    workout_pattern: WorkoutPattern | null;
    target_value: string; // 간단한 방식용
}

const MuiStepBasedCreateProgramPage: React.FC<CreateProgramPageProps> = ({ goMy, goPrograms }) => {
    const { isDarkMode } = useTheme();
    const [currentStep, setCurrentStep] = useState<number>(0);
    const [busy, setBusy] = useState<boolean>(false);
    const [alertDialog, setAlertDialog] = useState<{
        open: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: ''
    });
    const [stepData, setStepData] = useState<StepData>({
        title: '',
        description: '',
        difficulty: 'beginner',
        max_participants: 20,
        exercise_mode: null,
        selected_exercises: [],
        workout_pattern: null,
        target_value: ''
    });

    const steps = [
        '기본 정보',
        '운동 방식',
        '운동 설정',
        '최종 확인'
    ];

    const updateStepData = (updates: Partial<StepData>) => {
        setStepData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const canProceedToNext = (): boolean => {
        switch (currentStep) {
            case 0:
                return stepData.title.trim() !== '' && stepData.description.trim() !== '';
            case 1:
                return stepData.exercise_mode !== null;
            case 2:
                if (stepData.exercise_mode === 'simple') {
                    return stepData.selected_exercises.length > 0 && stepData.target_value.trim() !== '';
                } else if (stepData.exercise_mode === 'wod') {
                    return stepData.workout_pattern !== null && stepData.workout_pattern.exercises.length > 0;
                }
                return false;
            case 3:
                return true;
            default:
                return false;
        }
    };

    const submit = async () => {
        setBusy(true);
        try {
            const formData: CreateProgramForm = {
                title: stepData.title,
                description: stepData.description,
                difficulty: stepData.difficulty,
                max_participants: stepData.max_participants,
                workout_type: stepData.exercise_mode === 'wod' ? 'wod' : 'time_based',
                target_value: stepData.target_value,
                selected_exercises: stepData.selected_exercises,
                workout_pattern: stepData.workout_pattern
            };

            await programApi.createProgram(formData);
            setAlertDialog({
                open: true,
                title: '등록 완료',
                message: 'WOD가 등록되었습니다',
                type: 'success'
            });
            setTimeout(() => {
                setAlertDialog({ open: false, message: '' });
                goMy();
            }, 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '등록 실패';
            setAlertDialog({
                open: true,
                title: '등록 실패',
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setBusy(false);
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

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'success';
            case 'intermediate': return 'warning';
            case 'advanced': return 'error';
            default: return 'primary';
        }
    };

    const renderStep1 = () => (
        <Fade in={true} timeout={500}>
            <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                    📝 기본 정보 입력
                </Typography>

                <Stack spacing={3}>
                    {/* WOD 제목 */}
                    <TextField
                        label="WOD 제목"
                        placeholder="예: 아침 크로스핏 클래스"
                        value={stepData.title}
                        onChange={(e) => updateStepData({ title: e.target.value })}
                        required
                        fullWidth
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                    />

                    {/* WOD 설명 */}
                    <TextField
                        label="WOD 설명"
                        placeholder="WOD에 대한 자세한 설명을 입력하세요"
                        value={stepData.description}
                        onChange={(e) => updateStepData({ description: e.target.value })}
                        multiline
                        rows={4}
                        required
                        fullWidth
                        variant="outlined"
                        sx={{
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 2,
                            }
                        }}
                    />

                    {/* 난이도와 참가자 수 */}
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>
                            <FormControl fullWidth>
                                <InputLabel>난이도</InputLabel>
                                <Select
                                    value={stepData.difficulty}
                                    label="난이도"
                                    onChange={(e) => updateStepData({ difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="beginner">초급</MenuItem>
                                    <MenuItem value="intermediate">중급</MenuItem>
                                    <MenuItem value="advanced">고급</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Box sx={{ flex: 1 }}>
                            <TextField
                                label="최대 참가자 수"
                                type="number"
                                value={stepData.max_participants === 0 ? '' : stepData.max_participants}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === '') {
                                        updateStepData({ max_participants: 0 });
                                    } else {
                                        const numValue = parseInt(value);
                                        if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
                                            updateStepData({ max_participants: numValue });
                                        }
                                    }
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value;
                                    if (value === '' || parseInt(value) < 1) {
                                        updateStepData({ max_participants: 20 });
                                    }
                                }}
                                inputProps={{ min: 1, max: 200 }}
                                fullWidth
                                variant="outlined"
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </Stack>
            </Box>
        </Fade>
    );

    const renderStep2 = () => (
        <Fade in={true} timeout={500}>
            <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                    🎯 운동 방식 선택
                </Typography>

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }}>
                    {/* 간단한 운동 */}
                    <Box sx={{ flex: 1 }}>
                        <Card
                            sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease-in-out',
                                border: stepData.exercise_mode === 'simple' ? '2px solid' : '1px solid',
                                borderColor: stepData.exercise_mode === 'simple' ? 'primary.main' : 'divider',
                                backgroundColor: stepData.exercise_mode === 'simple' ? 'primary.50' : 'background.paper',
                                '&:hover': {
                                    transform: { xs: 'none', sm: 'translateY(-4px)' },
                                    boxShadow: {
                                        xs: 'none',
                                        sm: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)'
                                    },
                                },
                                '&:active': {
                                    transform: { xs: 'scale(0.98)', sm: 'translateY(-4px)' }
                                }
                            }}
                            onClick={() => updateStepData({ exercise_mode: 'simple' })}
                        >
                            <CardContent sx={{
                                p: { xs: 2, sm: 3 },
                                textAlign: 'center'
                            }}>
                                <Avatar
                                    sx={{
                                        width: { xs: 50, sm: 60 },
                                        height: { xs: 50, sm: 60 },
                                        bgcolor: 'success.main',
                                        mx: 'auto',
                                        mb: { xs: 1.5, sm: 2 }
                                    }}
                                >
                                    <SportsHandballIcon sx={{ fontSize: { xs: 24, sm: 30 } }} />
                                </Avatar>

                                <Typography variant="h6" sx={{
                                    fontWeight: 600,
                                    mb: { xs: 1.5, sm: 2 },
                                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}>
                                    간단한 운동
                                </Typography>

                                <Typography variant="body2" color="text.secondary" sx={{
                                    mb: { xs: 1.5, sm: 2 },
                                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                                }}>
                                    모든 운동을 한 번에 보여주고 선택하는 간편한 방식입니다.
                                </Typography>

                                <Stack spacing={1} alignItems="flex-start">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            전체 운동 목록에서 선택
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            목표 시간/횟수 설정
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'success.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            빠른 설정 가능
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    {/* WOD 패턴 */}
                    <Box sx={{ flex: 1 }}>
                        <Card
                            sx={{
                                height: '100%',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease-in-out',
                                border: stepData.exercise_mode === 'wod' ? '2px solid' : '1px solid',
                                borderColor: stepData.exercise_mode === 'wod' ? 'primary.main' : 'divider',
                                backgroundColor: stepData.exercise_mode === 'wod' ? 'primary.50' : 'background.paper',
                                '&:hover': {
                                    transform: { xs: 'none', sm: 'translateY(-4px)' },
                                    boxShadow: {
                                        xs: 'none',
                                        sm: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)'
                                    },
                                },
                                '&:active': {
                                    transform: { xs: 'scale(0.98)', sm: 'translateY(-4px)' }
                                }
                            }}
                            onClick={() => updateStepData({ exercise_mode: 'wod' })}
                        >
                            <CardContent sx={{
                                p: { xs: 2, sm: 3 },
                                textAlign: 'center'
                            }}>
                                <Avatar
                                    sx={{
                                        width: { xs: 50, sm: 60 },
                                        height: { xs: 50, sm: 60 },
                                        bgcolor: 'warning.main',
                                        mx: 'auto',
                                        mb: { xs: 1.5, sm: 2 }
                                    }}
                                >
                                    <EmojiEventsIcon sx={{ fontSize: { xs: 24, sm: 30 } }} />
                                </Avatar>

                                <Typography variant="h6" sx={{
                                    fontWeight: 600,
                                    mb: { xs: 1.5, sm: 2 },
                                    fontSize: { xs: '1.1rem', sm: '1.25rem' }
                                }}>
                                    WOD (Workout of the Day)
                                </Typography>

                                <Typography variant="body2" color="text.secondary" sx={{
                                    mb: { xs: 1.5, sm: 2 },
                                    fontSize: { xs: '0.875rem', sm: '0.875rem' }
                                }}>
                                    복잡한 운동 패턴과 라운드 시스템을 설정하는 방식입니다.
                                </Typography>

                                <Stack spacing={1} alignItems="flex-start">
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'warning.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            다양한 운동 패턴
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'warning.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            라운드별 설정
                                        </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: 'warning.main' }} />
                                        <Typography variant="caption" sx={{ fontSize: { xs: '0.75rem', sm: '0.75rem' } }}>
                                            진행 방식 커스터마이징
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>
                </Stack>
            </Box>
        </Fade>
    );

    const renderStep3 = () => {
        if (stepData.exercise_mode === 'simple') {
            return (
                <Fade in={true} timeout={500}>
                    <Box>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                            🏃‍♂️ 간단한 운동 설정
                        </Typography>

                        <Stack spacing={3}>
                            <TextField
                                label="전체 목표값"
                                placeholder="예: 20분, 100회, 5km"
                                value={stepData.target_value}
                                onChange={(e) => updateStepData({ target_value: e.target.value })}
                                required
                                fullWidth
                                variant="outlined"
                                inputProps={{ maxLength: 50 }}
                                helperText={`${stepData.target_value.length}/50자 - 전체 운동의 목표 시간, 횟수, 거리 등을 입력하세요`}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />

                            <MuiExerciseSelector
                                selectedExercises={stepData.selected_exercises}
                                onExercisesChange={(exercises) => updateStepData({ selected_exercises: exercises })}
                                showCategorySelector={false}
                            />
                        </Stack>
                    </Box>
                </Fade>
            );
        } else if (stepData.exercise_mode === 'wod') {
            return (
                <Fade in={true} timeout={500}>
                    <Box>
                        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                            💪 WOD 패턴 설정
                        </Typography>

                        <MuiWODBuilder
                            workoutPattern={stepData.workout_pattern}
                            onPatternChange={(pattern) => updateStepData({ workout_pattern: pattern })}
                        />
                    </Box>
                </Fade>
            );
        }
        return null;
    };

    const renderStep4 = () => (
        <Fade in={true} timeout={500}>
            <Box>
                <Typography variant="h5" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                    ✅ 최종 확인
                </Typography>

                <Card sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'primary.main' }}>
                            📋 WOD 정보 요약
                        </Typography>

                        <Stack spacing={3}>
                            {/* 기본 정보 */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                    기본 정보
                                </Typography>
                                <Stack spacing={1}>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                            제목:
                                        </Typography>
                                        <Typography variant="body2">{stepData.title}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                            설명:
                                        </Typography>
                                        <Typography variant="body2">{stepData.description}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                            난이도:
                                        </Typography>
                                        <Chip
                                            label={getDifficultyLabel(stepData.difficulty)}
                                            color={getDifficultyColor(stepData.difficulty)}
                                            size="small"
                                        />
                                    </Box>
                                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                            참가자:
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <GroupIcon sx={{ fontSize: 16 }} />
                                            <Typography variant="body2">{stepData.max_participants}명</Typography>
                                        </Box>
                                    </Box>
                                </Stack>
                            </Box>

                            <Divider />

                            {/* 운동 설정 */}
                            <Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                                    운동 설정
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                        방식:
                                    </Typography>
                                    <Chip
                                        label={stepData.exercise_mode === 'simple' ? '간단한 운동' : 'WOD 패턴'}
                                        color="primary"
                                        size="small"
                                    />
                                </Box>

                                {stepData.exercise_mode === 'simple' && (
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', gap: 2 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                                목표값:
                                            </Typography>
                                            <Typography variant="body2">{stepData.target_value}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                                운동:
                                            </Typography>
                                            <Chip
                                                label={`${stepData.selected_exercises.length}개 선택됨`}
                                                color="info"
                                                size="small"
                                            />
                                        </Box>

                                        {/* 선택된 운동 상세 정보 */}
                                        {stepData.selected_exercises.length > 0 && (
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                                    선택된 운동 목록:
                                                </Typography>
                                                <Stack spacing={1}>
                                                    {stepData.selected_exercises.map((exercise, index) => (
                                                        <Box key={index} sx={{
                                                            p: 1,
                                                            backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                                            borderRadius: 1,
                                                            border: '1px solid',
                                                            borderColor: isDarkMode ? 'grey.700' : 'grey.200'
                                                        }}>
                                                            <Stack direction="row" spacing={2} alignItems="center">
                                                                <Avatar sx={{
                                                                    width: 24,
                                                                    height: 24,
                                                                    bgcolor: 'primary.main',
                                                                    fontSize: '0.75rem'
                                                                }}>
                                                                    {index + 1}
                                                                </Avatar>
                                                                <Box sx={{ flex: 1 }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                        {exercise.name || `운동 #${exercise.exercise_id}`}
                                                                    </Typography>
                                                                </Box>
                                                                {exercise.target_value && (
                                                                    <Chip
                                                                        label={exercise.target_value}
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                        sx={{ minWidth: 'auto' }}
                                                                    />
                                                                )}
                                                            </Stack>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        )}
                                    </Stack>
                                )}

                                {stepData.exercise_mode === 'wod' && stepData.workout_pattern && (
                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 80 }}>
                                            패턴:
                                        </Typography>
                                        <Typography variant="body2">{stepData.workout_pattern.description}</Typography>
                                    </Box>
                                )}
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Fade>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 0: return renderStep1();
            case 1: return renderStep2();
            case 2: return renderStep3();
            case 3: return renderStep4();
            default: return null;
        }
    };

    if (busy) return <MuiLoadingSpinner label="WOD 등록 중..." />;

    return (
        <Container
            maxWidth="lg"
            sx={{
                py: 3,
                px: 3
            }}
        >
            {/* WOD 현황 카드 */}
            <MuiWodStatusCard />

            {/* 헤더 */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                        fontWeight: 700,
                        mb: 3,
                        fontSize: { xs: '1.5rem', sm: '2rem', md: '2.125rem' },
                        background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                        backgroundClip: 'text',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    🏋️‍♂️ 새 크로스핏 WOD 등록
                </Typography>

                {/* Stepper */}
                <Paper sx={{
                    p: 3,
                    borderRadius: 2
                }}>
                    <Stepper
                        activeStep={currentStep}
                        alternativeLabel
                        sx={{
                            '& .MuiStepLabel-root': {
                                padding: { xs: '0 4px', sm: '0 8px' }
                            }
                        }}
                    >
                        {steps.map((label, index) => (
                            <Step key={label}>
                                <StepLabel
                                    sx={{
                                        '& .MuiStepLabel-label': {
                                            fontSize: { xs: '0.75rem', sm: '0.875rem' },
                                            fontWeight: 600,
                                            display: { xs: 'none', sm: 'block' }
                                        },
                                        '& .MuiStepLabel-labelContainer': {
                                            '& .MuiStepLabel-iconContainer': {
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: { xs: '1.25rem', sm: '1.5rem' }
                                                }
                                            }
                                        }
                                    }}
                                >
                                    <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
                                        {label}
                                    </Box>
                                    <Box sx={{ display: { xs: 'block', sm: 'none' } }}>
                                        {index + 1}
                                    </Box>
                                </StepLabel>
                            </Step>
                        ))}
                    </Stepper>
                </Paper>
            </Box>

            {/* 메인 콘텐츠 */}
            <Paper sx={{
                p: 3,
                borderRadius: 2,
                mb: 3
            }}>
                {renderCurrentStep()}
            </Paper>

            {/* 네비게이션 - 모바일에서는 플로팅 스타일 */}
            <Paper sx={{
                p: 3,
                borderRadius: 2,
                position: { xs: 'sticky', sm: 'static' },
                bottom: { xs: 0, sm: 'auto' },
                zIndex: { xs: 1000, sm: 'auto' },
                boxShadow: { xs: '0 -4px 12px rgba(0, 0, 0, 0.15)', sm: 'none' }
            }}>
                <Stack
                    direction="row"
                    spacing={{ xs: 1, sm: 2 }}
                    justifyContent="space-between"
                    alignItems="center"
                >
                    <Box>
                        {currentStep > 0 && (
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBackIcon />}
                                onClick={prevStep}
                                sx={{
                                    borderRadius: 2,
                                    minHeight: { xs: '48px', sm: '36px' }
                                }}
                            >
                                이전
                            </Button>
                        )}
                    </Box>

                    <Stack
                        direction="row"
                        spacing={{ xs: 1, sm: 2 }}
                    >
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<CancelIcon />}
                            onClick={goPrograms}
                            sx={{
                                borderRadius: 2,
                                minHeight: { xs: '48px', sm: '36px' }
                            }}
                        >
                            취소
                        </Button>

                        {currentStep < steps.length - 1 ? (
                            <Button
                                variant="contained"
                                endIcon={<ArrowForwardIcon />}
                                onClick={nextStep}
                                disabled={!canProceedToNext()}
                                sx={{
                                    borderRadius: 2,
                                    minHeight: { xs: '48px', sm: '36px' }
                                }}
                            >
                                다음
                            </Button>
                        ) : (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<SaveIcon />}
                                onClick={submit}
                                disabled={!canProceedToNext() || busy}
                                sx={{
                                    borderRadius: 2,
                                    minHeight: { xs: '48px', sm: '36px' }
                                }}
                            >
                                {busy ? '등록 중...' : 'WOD 등록'}
                            </Button>
                        )}
                    </Stack>
                </Stack>
            </Paper>

            {/* 알림 다이얼로그 */}
            <MuiAlertDialog
                open={alertDialog.open}
                onClose={() => setAlertDialog({ open: false, message: '' })}
                title={alertDialog.title}
                message={alertDialog.message}
                type={alertDialog.type}
            />
        </Container>
    );
};

export default MuiStepBasedCreateProgramPage;
