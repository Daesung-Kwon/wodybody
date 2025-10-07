import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent,
    TextField, FormControl, InputLabel, Select, MenuItem, Chip, Avatar,
    IconButton, Accordion, AccordionSummary, AccordionDetails, Divider,
    Alert
} from './common/MuiComponents';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    KeyboardArrowUp as ArrowUpIcon,
    KeyboardArrowDown as ArrowDownIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    FitnessCenter as FitnessCenterIcon,
    Timer as TimerIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    SwapVert as SwapVertIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { WorkoutPattern, ExerciseSet, WorkoutType, Exercise } from '../types';
import { exerciseApi } from '../utils/api';
import MuiLoadingSpinner from './MuiLoadingSpinner';
import MuiAlertDialog from './MuiAlertDialog';
import { useTheme } from '../theme/ThemeProvider';

interface MuiWODBuilderProps {
    workoutPattern: WorkoutPattern | null;
    onPatternChange: (pattern: WorkoutPattern | null) => void;
}

const MuiWODBuilder: React.FC<MuiWODBuilderProps> = ({ workoutPattern, onPatternChange }) => {
    const { isDarkMode } = useTheme();
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [expandedExercises, setExpandedExercises] = useState<number[]>([]);
    const [alertDialog, setAlertDialog] = useState<{
        open: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: ''
    });

    // 운동 목록 로드
    useEffect(() => {
        const loadExercises = async () => {
            setLoading(true);
            try {
                const data = await exerciseApi.getExercises();
                setExercises(data.exercises);
            } catch (error) {
                console.error('운동 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        loadExercises();
    }, []);

    // WOD 패턴 초기화
    const initializePattern = (type: WorkoutType) => {
        const pattern: WorkoutPattern = {
            type,
            total_rounds: 1,
            time_cap_per_round: type === 'time_cap' ? 1 : undefined,
            exercises: [],
            description: ''
        };
        onPatternChange(pattern);
    };

    // 운동 추가
    const addExercise = (exercise: Exercise) => {
        if (!workoutPattern) return;

        // 이미 추가된 운동인지 확인
        const isAlreadyAdded = workoutPattern.exercises.some(ex => ex.exercise_id === exercise.id);
        if (isAlreadyAdded) {
            setAlertDialog({
                open: true,
                title: '중복 추가',
                message: '이미 추가된 운동입니다.',
                type: 'warning'
            });
            return;
        }

        const newExercise: ExerciseSet = {
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            base_reps: 1,
            progression_type: 'fixed',
            progression_value: 0,
            order: workoutPattern.exercises.length
        };

        const updatedPattern = {
            ...workoutPattern,
            exercises: [...workoutPattern.exercises, newExercise]
        };
        onPatternChange(updatedPattern);
    };

    // 운동 제거
    const removeExercise = (index: number) => {
        if (!workoutPattern) return;

        const updatedExercises = workoutPattern.exercises.filter((_, i) => i !== index);
        const reorderedExercises = updatedExercises.map((ex, i) => ({
            ...ex,
            order: i
        }));

        const updatedPattern = {
            ...workoutPattern,
            exercises: reorderedExercises
        };
        onPatternChange(updatedPattern);
    };

    // 운동 설정 업데이트
    const updateExercise = (index: number, field: keyof ExerciseSet, value: any) => {
        if (!workoutPattern) return;

        const updatedExercises = [...workoutPattern.exercises];
        updatedExercises[index] = { ...updatedExercises[index], [field]: value };

        const updatedPattern = {
            ...workoutPattern,
            exercises: updatedExercises
        };
        onPatternChange(updatedPattern);
    };

    // 패턴 설정 업데이트
    const updatePattern = useCallback((field: keyof WorkoutPattern, value: any) => {
        if (!workoutPattern) return;

        const updatedPattern = {
            ...workoutPattern,
            [field]: value
        };
        onPatternChange(updatedPattern);
    }, [workoutPattern, onPatternChange]);

    // 운동 순서 변경
    const moveExercise = (index: number, direction: 'up' | 'down') => {
        if (!workoutPattern) return;

        const updatedExercises = [...workoutPattern.exercises];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < updatedExercises.length) {
            [updatedExercises[index], updatedExercises[targetIndex]] = [updatedExercises[targetIndex], updatedExercises[index]];
            const reorderedExercises = updatedExercises.map((ex, i) => ({
                ...ex,
                order: i
            }));

            const updatedPattern = {
                ...workoutPattern,
                exercises: reorderedExercises
            };
            onPatternChange(updatedPattern);
        }
    };

    // WOD 유형별 설명 생성
    const generateDescription = (pattern: WorkoutPattern) => {
        if (!pattern.exercises.length) return '';

        const exerciseNames = pattern.exercises.map(ex => ex.exercise_name).join(', ');
        const rounds = pattern.total_rounds;

        switch (pattern.type) {
            case 'round_based':
                return `${exerciseNames} 총 ${rounds}라운드`;
            case 'time_cap':
                return `${exerciseNames} 총 ${rounds}라운드 (라운드당 ${pattern.time_cap_per_round}분 제한)`;
            default:
                return `${exerciseNames} 총 ${rounds}라운드`;
        }
    };

    // 설명 자동 업데이트
    useEffect(() => {
        if (workoutPattern) {
            const description = generateDescription(workoutPattern);
            if (description !== workoutPattern.description) {
                updatePattern('description', description);
            }
        }
    }, [workoutPattern?.exercises, workoutPattern?.total_rounds, workoutPattern?.type, updatePattern, workoutPattern]);

    // 운동 검색 필터링
    const filteredExercises = exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exercise.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Accordion 토글
    const toggleExerciseExpansion = (index: number) => {
        setExpandedExercises(prev =>
            prev.includes(index)
                ? prev.filter(i => i !== index)
                : [...prev, index]
        );
    };

    const getProgressionIcon = (type: string | undefined) => {
        switch (type) {
            case 'increase': return <TrendingUpIcon />;
            case 'decrease': return <TrendingDownIcon />;
            case 'mixed': return <SwapVertIcon />;
            default: return <FitnessCenterIcon />;
        }
    };

    const getProgressionColor = (type: string | undefined) => {
        switch (type) {
            case 'increase': return 'success';
            case 'decrease': return 'error';
            case 'mixed': return 'warning';
            default: return 'primary';
        }
    };

    const getProgressionLabel = (type: string | undefined) => {
        switch (type) {
            case 'increase': return '증가';
            case 'decrease': return '감소';
            case 'mixed': return '혼합';
            case 'fixed': return '고정';
            default: return type || '고정';
        }
    };

    if (loading) return <MuiLoadingSpinner label="운동 로딩 중..." />;

    return (
        <>
            <Box>
                {/* WOD 유형 선택 */}
                <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                        🎯 WOD 유형 선택
                    </Typography>
                    <FormControl fullWidth>
                        <InputLabel>WOD 유형</InputLabel>
                        <Select
                            value={workoutPattern?.type || ''}
                            label="WOD 유형"
                            onChange={(e) => initializePattern(e.target.value as WorkoutType)}
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="">유형을 선택하세요</MenuItem>
                            <MenuItem value="round_based">라운드 제한</MenuItem>
                            <MenuItem value="time_cap">시간 제한</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>

                {workoutPattern && (
                    <Box>
                        {/* 기본 설정 */}
                        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                ⚙️ 기본 설정
                            </Typography>
                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                <Box sx={{ flex: 1 }}>
                                    <TextField
                                        label="총 라운드 수"
                                        type="number"
                                        value={workoutPattern.total_rounds === 0 ? '' : workoutPattern.total_rounds}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            if (value === '') {
                                                updatePattern('total_rounds', 0);
                                            } else {
                                                const numValue = parseInt(value);
                                                if (!isNaN(numValue) && numValue >= 1 && numValue <= 50) {
                                                    updatePattern('total_rounds', numValue);
                                                }
                                            }
                                        }}
                                        onBlur={(e) => {
                                            const value = e.target.value;
                                            if (value === '' || parseInt(value) < 1) {
                                                updatePattern('total_rounds', 1);
                                            }
                                        }}
                                        inputProps={{ min: 1, max: 50 }}
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            }
                                        }}
                                    />
                                </Box>
                                {workoutPattern.type === 'time_cap' && (
                                    <Box sx={{ flex: 1 }}>
                                        <TextField
                                            label="라운드당 시간 제한 (분)"
                                            type="number"
                                            value={workoutPattern.time_cap_per_round === 0 ? '' : (workoutPattern.time_cap_per_round || 1)}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                if (value === '') {
                                                    updatePattern('time_cap_per_round', 0);
                                                } else {
                                                    const numValue = parseInt(value);
                                                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 60) {
                                                        updatePattern('time_cap_per_round', numValue);
                                                    }
                                                }
                                            }}
                                            onBlur={(e) => {
                                                const value = e.target.value;
                                                if (value === '' || parseInt(value) < 1) {
                                                    updatePattern('time_cap_per_round', 1);
                                                }
                                            }}
                                            inputProps={{ min: 1, max: 60 }}
                                            fullWidth
                                            variant="outlined"
                                            sx={{
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: 2,
                                                }
                                            }}
                                        />
                                    </Box>
                                )}
                            </Stack>
                        </Paper>

                        {/* 운동 선택 */}
                        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                🏋️‍♂️ 운동 선택
                            </Typography>

                            {/* 운동 검색 */}
                            <TextField
                                fullWidth
                                placeholder="운동명 또는 설명으로 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                                    endAdornment: searchTerm && (
                                        <IconButton
                                            onClick={() => setSearchTerm('')}
                                            size="small"
                                            sx={{ mr: -1 }}
                                        >
                                            <ClearIcon />
                                        </IconButton>
                                    ),
                                }}
                                sx={{
                                    mb: 2,
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    }
                                }}
                            />

                            {/* 운동 그리드 */}
                            {filteredExercises.length > 0 ? (
                                <Box>
                                    {/* 운동 수 표시 */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        총 {filteredExercises.length}개의 운동이 있습니다.
                                    </Typography>

                                    {/* 운동 목록 - 스크롤 최적화 */}
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, 1fr)',
                                            lg: 'repeat(3, 1fr)'
                                        },
                                        gap: 2,
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        '&::-webkit-scrollbar': {
                                            width: '6px',
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                            borderRadius: '3px',
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                                            borderRadius: '3px',
                                            '&:hover': {
                                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
                                            }
                                        }
                                    }}>
                                        {filteredExercises.map(exercise => {
                                            const isAlreadyAdded = workoutPattern?.exercises.some(ex => ex.exercise_id === exercise.id) || false;
                                            return (
                                                <Card
                                                    key={exercise.id}
                                                    sx={{
                                                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                                                        transition: 'all 0.2s ease-in-out',
                                                        border: isAlreadyAdded ? '2px solid' : '1px solid',
                                                        borderColor: isAlreadyAdded ? 'success.main' : 'divider',
                                                        backgroundColor: isAlreadyAdded ? 'success.50' : 'background.paper',
                                                        position: 'relative',
                                                        '&:hover': !isAlreadyAdded ? {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: isDarkMode ? '0 4px 16px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.1)',
                                                        } : {}
                                                    }}
                                                    onClick={() => !isAlreadyAdded && addExercise(exercise)}
                                                >
                                                    {/* 추가 버튼 - 우측 상단 */}
                                                    <IconButton
                                                        size="small"
                                                        disabled={isAlreadyAdded}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            addExercise(exercise);
                                                        }}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 8,
                                                            right: 8,
                                                            zIndex: 1,
                                                            borderRadius: 1,
                                                            backgroundColor: isAlreadyAdded ? 'success.50' : 'primary.50',
                                                            color: isAlreadyAdded ? 'success.main' : 'primary.main',
                                                            '&:hover': {
                                                                backgroundColor: isAlreadyAdded ? 'success.100' : 'primary.100',
                                                            },
                                                            '&:disabled': {
                                                                backgroundColor: 'success.50',
                                                                color: 'success.main'
                                                            }
                                                        }}
                                                    >
                                                        {isAlreadyAdded ? <CheckIcon /> : <AddIcon />}
                                                    </IconButton>

                                                    <CardContent sx={{ p: 2, pr: 5 }}>
                                                        <Stack spacing={1}>
                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                                    {exercise.name}
                                                                </Typography>
                                                                {exercise.category_name && (
                                                                    <Chip
                                                                        label={exercise.category_name}
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                        sx={{ 
                                                                            height: 20,
                                                                            fontSize: '0.7rem',
                                                                            fontWeight: 500
                                                                        }}
                                                                    />
                                                                )}
                                                            </Stack>
                                                            <Typography variant="body2" color="text.secondary" sx={{
                                                                display: '-webkit-box',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                            }}>
                                                                {exercise.description}
                                                            </Typography>
                                                            {isAlreadyAdded && (
                                                                <Chip
                                                                    label="추가됨"
                                                                    color="success"
                                                                    size="small"
                                                                    icon={<FitnessCenterIcon />}
                                                                    sx={{ alignSelf: 'flex-start' }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </Box>
                                </Box>
                            ) : (
                                <Alert
                                    severity="info"
                                    action={
                                        <Button
                                            size="small"
                                            onClick={() => setSearchTerm('')}
                                            sx={{ borderRadius: 1 }}
                                        >
                                            검색 초기화
                                        </Button>
                                    }
                                    sx={{ borderRadius: 2 }}
                                >
                                    검색 결과가 없습니다. 다른 검색어를 시도해보세요.
                                </Alert>
                            )}
                        </Paper>

                        {/* 선택된 운동들 */}
                        {workoutPattern.exercises.length > 0 && (
                            <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    ✅ 선택된 운동 ({workoutPattern.exercises.length}개)
                                </Typography>

                                <Stack spacing={2}>
                                    {workoutPattern.exercises.map((exercise, index) => (
                                        <Accordion
                                            key={index}
                                            expanded={expandedExercises.includes(index)}
                                            onChange={() => toggleExerciseExpansion(index)}
                                            sx={{
                                                borderRadius: 2,
                                                '&:before': { display: 'none' },
                                                boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                            }}
                                        >
                                            <AccordionSummary
                                                expandIcon={<ArrowDownIcon />}
                                                sx={{
                                                    backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                                    borderRadius: expandedExercises.includes(index) ? '8px 8px 0 0' : '8px',
                                                    '& .MuiAccordionSummary-content': {
                                                        alignItems: 'center',
                                                        gap: 2
                                                    }
                                                }}
                                            >
                                                <Avatar sx={{
                                                    bgcolor: 'primary.main',
                                                    width: 32,
                                                    height: 32,
                                                    fontSize: '0.875rem',
                                                    fontWeight: 600
                                                }}>
                                                    {index + 1}
                                                </Avatar>

                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                        {exercise.exercise_name}
                                                    </Typography>
                                                    <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                        <Chip
                                                            label={`${exercise.base_reps}회`}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            icon={getProgressionIcon(exercise.progression_type)}
                                                            label={getProgressionLabel(exercise.progression_type)}
                                                            size="small"
                                                            color={getProgressionColor(exercise.progression_type)}
                                                            variant="filled"
                                                        />
                                                    </Stack>
                                                </Box>

                                                <Stack direction="row" spacing={1}>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveExercise(index, 'up');
                                                        }}
                                                        disabled={index === 0}
                                                        sx={{ borderRadius: 1 }}
                                                    >
                                                        <ArrowUpIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            moveExercise(index, 'down');
                                                        }}
                                                        disabled={index === workoutPattern.exercises.length - 1}
                                                        sx={{ borderRadius: 1 }}
                                                    >
                                                        <ArrowDownIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeExercise(index);
                                                        }}
                                                        color="error"
                                                        sx={{ borderRadius: 1 }}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Stack>
                                            </AccordionSummary>

                                            <AccordionDetails sx={{ p: 3 }}>
                                                <Stack spacing={2}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        운동 설정
                                                    </Typography>

                                                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                                                        <Box sx={{ flex: 1 }}>
                                                            <TextField
                                                                label="기본 횟수"
                                                                type="number"
                                                                value={exercise.base_reps === 0 ? '' : exercise.base_reps}
                                                                onChange={(e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '') {
                                                                        updateExercise(index, 'base_reps', 0);
                                                                    } else {
                                                                        const numValue = parseInt(value);
                                                                        if (!isNaN(numValue) && numValue >= 1) {
                                                                            updateExercise(index, 'base_reps', numValue);
                                                                        }
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    const value = e.target.value;
                                                                    if (value === '' || parseInt(value) < 1) {
                                                                        updateExercise(index, 'base_reps', 1);
                                                                    }
                                                                }}
                                                                inputProps={{ min: 1 }}
                                                                fullWidth
                                                                variant="outlined"
                                                                size="small"
                                                                sx={{
                                                                    '& .MuiOutlinedInput-root': {
                                                                        borderRadius: 2,
                                                                    }
                                                                }}
                                                            />
                                                        </Box>

                                                        <Box sx={{ flex: 1 }}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>진행 방식</InputLabel>
                                                                <Select
                                                                    value={exercise.progression_type}
                                                                    label="진행 방식"
                                                                    onChange={(e) => updateExercise(index, 'progression_type', e.target.value)}
                                                                    sx={{ borderRadius: 2 }}
                                                                >
                                                                    <MenuItem value="fixed">고정</MenuItem>
                                                                    <MenuItem value="increase">증가</MenuItem>
                                                                    <MenuItem value="decrease">감소</MenuItem>
                                                                    <MenuItem value="mixed">혼합</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                        </Box>

                                                        {(exercise.progression_type === 'increase' || exercise.progression_type === 'decrease') && (
                                                            <Box sx={{ flex: 1 }}>
                                                                <TextField
                                                                    label="증가/감소 값"
                                                                    type="number"
                                                                    value={exercise.progression_value === 0 ? '' : (exercise.progression_value || 1)}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value === '') {
                                                                            updateExercise(index, 'progression_value', 0);
                                                                        } else {
                                                                            const numValue = parseInt(value);
                                                                            if (!isNaN(numValue) && numValue >= 1) {
                                                                                updateExercise(index, 'progression_value', numValue);
                                                                            }
                                                                        }
                                                                    }}
                                                                    onBlur={(e) => {
                                                                        const value = e.target.value;
                                                                        if (value === '' || parseInt(value) < 1) {
                                                                            updateExercise(index, 'progression_value', 1);
                                                                        }
                                                                    }}
                                                                    inputProps={{ min: 1 }}
                                                                    fullWidth
                                                                    variant="outlined"
                                                                    size="small"
                                                                    sx={{
                                                                        '& .MuiOutlinedInput-root': {
                                                                            borderRadius: 2,
                                                                        }
                                                                    }}
                                                                />
                                                            </Box>
                                                        )}
                                                    </Stack>

                                                    {/* 진행 방식 예시 */}
                                                    <Paper sx={{
                                                        p: 2,
                                                        backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                                        borderRadius: 2
                                                    }}>
                                                        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                                            💡 진행 방식 예시
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {(() => {
                                                                const baseReps = exercise.base_reps || 1;
                                                                const progressionValue = exercise.progression_value || 1;
                                                                const type = exercise.progression_type;

                                                                switch (type) {
                                                                    case 'increase':
                                                                        return `1라운드: ${baseReps}회 → 2라운드: ${baseReps + progressionValue}회 → 3라운드: ${baseReps + progressionValue * 2}회`;
                                                                    case 'decrease':
                                                                        return `1라운드: ${baseReps}회 → 2라운드: ${Math.max(1, baseReps - progressionValue)}회 → 3라운드: ${Math.max(1, baseReps - progressionValue * 2)}회`;
                                                                    case 'mixed':
                                                                        return `각 라운드마다 다른 횟수로 진행됩니다`;
                                                                    default:
                                                                        return `모든 라운드: ${baseReps}회 고정`;
                                                                }
                                                            })()}
                                                        </Typography>
                                                    </Paper>
                                                </Stack>
                                            </AccordionDetails>
                                        </Accordion>
                                    ))}
                                </Stack>
                            </Paper>
                        )}

                        {/* WOD 미리보기 */}
                        <Paper sx={{
                            p: 3,
                            borderRadius: 2,
                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                            color: 'white'
                        }}>
                            <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                <VisibilityIcon sx={{ fontSize: 24 }} />
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    WOD 미리보기
                                </Typography>
                            </Stack>

                            <Stack spacing={2}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                                        유형:
                                    </Typography>
                                    <Chip
                                        label={workoutPattern.type === 'round_based' ? '라운드 제한' : '시간 제한'}
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                            fontWeight: 600,
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                                        총 라운드:
                                    </Typography>
                                    <Chip
                                        label={`${workoutPattern.total_rounds}라운드`}
                                        size="small"
                                        sx={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                            color: 'white',
                                            fontWeight: 600,
                                        }}
                                    />
                                </Box>

                                {workoutPattern.time_cap_per_round && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 80 }}>
                                            시간 제한:
                                        </Typography>
                                        <Chip
                                            label={`라운드당 ${workoutPattern.time_cap_per_round}분`}
                                            size="small"
                                            icon={<TimerIcon />}
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                )}

                                <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.3)' }} />

                                <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                        설명:
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                        {workoutPattern.description || '설명이 생성되지 않았습니다.'}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Box>
                )}
            </Box>

            {/* 알림 다이얼로그 */}
            <MuiAlertDialog
                open={alertDialog.open}
                onClose={() => setAlertDialog({ open: false, message: '' })}
                title={alertDialog.title}
                message={alertDialog.message}
                type={alertDialog.type}
            />
        </>
    );
};

export default MuiWODBuilder;
