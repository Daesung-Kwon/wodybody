import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent,
    TextField, FormControl, InputLabel, Select, MenuItem, Chip, Avatar,
    IconButton, Accordion, AccordionSummary, AccordionDetails,
    Alert, Fade, Collapse
} from './common/MuiComponents';
import {
    Add as AddIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    ExpandMore as ExpandMoreIcon,
    KeyboardArrowUp as ArrowUpIcon,
    KeyboardArrowDown as ArrowDownIcon,
    Delete as DeleteIcon,
    FitnessCenter as FitnessCenterIcon,
    Category as CategoryIcon,
    CheckCircle as CheckCircleIcon,
    Timer as TimerIcon,
    Edit as EditIcon,
    Check as CheckIcon
} from '@mui/icons-material';
import { ExerciseCategory, Exercise, SelectedExercise } from '../types';
import { exerciseApi } from '../utils/api';
import MuiLoadingSpinner from './MuiLoadingSpinner';
import MuiAlertDialog from './MuiAlertDialog';
import { useTheme } from '../theme/ThemeProvider';

interface MuiExerciseSelectorProps {
    selectedExercises: SelectedExercise[];
    onExercisesChange: (exercises: SelectedExercise[]) => void;
    showCategorySelector?: boolean; // 카테고리 선택기 표시 여부 (기본값: true)
}

const MuiExerciseSelector: React.FC<MuiExerciseSelectorProps> = ({
    selectedExercises,
    onExercisesChange,
    showCategorySelector = true
}) => {
    const { isDarkMode } = useTheme();
    const [categories, setCategories] = useState<ExerciseCategory[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [allExercises, setAllExercises] = useState<Exercise[]>([]); // 모든 운동 저장
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [showSelectedExercises, setShowSelectedExercises] = useState<boolean>(true); // 모바일에서 기본으로 펼침
    const [alertDialog, setAlertDialog] = useState<{
        open: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: ''
    });

    // 카테고리 로드
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await exerciseApi.getCategories();
                setCategories(data.categories);
                if (data.categories.length > 0) {
                    setSelectedCategoryId(data.categories[0].id);
                }
            } catch (error) {
                console.error('카테고리 로딩 실패:', error);
            }
        };
        loadCategories();
    }, []);

    // 카테고리 선택기가 비활성화된 경우 모든 운동 로드
    useEffect(() => {
        if (!showCategorySelector) {
            // 검색어 및 카테고리 ID 초기화
            setSearchTerm('');
            setSelectedCategoryId(null);
            
            const loadAllExercises = async () => {
                setLoading(true);
                try {
                    const data = await exerciseApi.getExercises(); // 카테고리 ID 없이 모든 운동 조회
                    console.log('Loaded all exercises:', data.exercises.length, 'exercises');
                    setExercises(data.exercises);
                    setAllExercises(data.exercises); // 모든 운동도 저장
                } catch (error) {
                    console.error('전체 운동 로딩 실패:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadAllExercises();
        }
    }, [showCategorySelector]);

    // 선택된 카테고리의 운동들 로드 (카테고리 선택기가 활성화된 경우에만)
    useEffect(() => {
        if (showCategorySelector && selectedCategoryId) {
            const loadExercises = async () => {
                setLoading(true);
                try {
                    const data = await exerciseApi.getExercises(selectedCategoryId);
                    setExercises(data.exercises);
                } catch (error) {
                    console.error('운동 로딩 실패:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadExercises();
        }
    }, [selectedCategoryId, showCategorySelector]);

    // 운동 추가
    const addExercise = (exercise: Exercise) => {
        const isAlreadyAdded = selectedExercises.some(ex => ex.exercise_id === exercise.id);
        if (isAlreadyAdded) {
            setAlertDialog({
                open: true,
                title: '중복 추가',
                message: '이미 추가된 운동입니다.',
                type: 'warning'
            });
            return;
        }

        const newExercise: SelectedExercise = {
            exercise_id: exercise.id,
            name: exercise.name, // 운동 이름도 함께 저장
            target_value: '',
            order: selectedExercises.length
        };
        onExercisesChange([...selectedExercises, newExercise]);
    };

    // 운동 제거
    const removeExercise = (index: number) => {
        const newExercises = selectedExercises.filter((_, i) => i !== index);
        // 순서 재정렬
        const reorderedExercises = newExercises.map((ex, i) => ({
            ...ex,
            order: i
        }));
        onExercisesChange(reorderedExercises);
    };

    // 목표값 변경
    const updateTargetValue = (index: number, targetValue: string) => {
        const newExercises = [...selectedExercises];
        newExercises[index].target_value = targetValue;
        onExercisesChange(newExercises);
    };

    // 운동 검색 필터링
    const filteredExercises = exercises.filter(exercise => {
        // 검색어가 없으면 모든 운동 표시
        if (!searchTerm.trim()) return true;

        return exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            exercise.description.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // 운동 순서 변경
    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newExercises = [...selectedExercises];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newExercises.length) {
            [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];
            // 순서 재정렬
            const reorderedExercises = newExercises.map((ex, i) => ({
                ...ex,
                order: i
            }));
            onExercisesChange(reorderedExercises);
        }
    };

    const getCategoryName = (categoryId: number) => {
        return categories.find(cat => cat.id === categoryId)?.name || '알 수 없는 카테고리';
    };

    if (loading) return <MuiLoadingSpinner label="운동 로딩 중..." />;

    return (
        <>
            <Box>
                {/* 카테고리 선택 (조건부 렌더링) */}
                {showCategorySelector && (
                    <Paper sx={{
                        p: { xs: 2, sm: 3 },
                        mb: { xs: 2, sm: 3 },
                        borderRadius: 2
                    }}>
                        <Typography variant="h6" sx={{
                            mb: { xs: 1.5, sm: 2 },
                            fontWeight: 600,
                            fontSize: { xs: '1.1rem', sm: '1.25rem' }
                        }}>
                            📂 카테고리 선택
                        </Typography>
                        <FormControl fullWidth>
                            <InputLabel>운동 카테고리</InputLabel>
                            <Select
                                value={selectedCategoryId || ''}
                                label="운동 카테고리"
                                onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                                startAdornment={<CategoryIcon sx={{ mr: 1, color: 'text.secondary' }} />}
                                sx={{
                                    borderRadius: 2,
                                    '& .MuiSelect-select': {
                                        minHeight: { xs: '48px', sm: 'auto' }
                                    }
                                }}
                            >
                                {categories.map(category => (
                                    <MenuItem key={category.id} value={category.id}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <FitnessCenterIcon sx={{ fontSize: 20 }} />
                                            {category.name}
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Paper>
                )}

                {/* 운동 검색 및 선택 */}
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
                                    const isAlreadyAdded = selectedExercises.some(ex => ex.exercise_id === exercise.id);
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
                                                    {/* 운동명과 카테고리 chip을 같은 줄에 표시 */}
                                                    <Stack direction="row" alignItems="center" spacing={1}>
                                                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                            {exercise.name}
                                                        </Typography>
                                                        {/* 카테고리 선택기가 비활성화된 경우 카테고리 정보 표시 */}
                                                        {!showCategorySelector && exercise.category_name && (
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

                {/* 선택된 운동 관리 */}
                {selectedExercises.length > 0 && (
                    <Paper sx={{ p: 3, borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                ✅ 선택된 운동 ({selectedExercises.length}개)
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<ExpandMoreIcon />}
                                onClick={() => setShowSelectedExercises(!showSelectedExercises)}
                                sx={{ borderRadius: 2 }}
                            >
                                {showSelectedExercises ? '숨기기' : '보기'}
                            </Button>
                        </Stack>

                        <Collapse in={showSelectedExercises}>
                            <Fade in={showSelectedExercises} timeout={500}>
                                <Stack spacing={2}>
                                    {selectedExercises.map((selectedEx, index) => {
                                        // 모든 가능한 소스에서 운동 찾기
                                        let exercise = exercises.find(ex => ex.id === selectedEx.exercise_id);
                                        if (!exercise) {
                                            exercise = allExercises.find(ex => ex.id === selectedEx.exercise_id);
                                        }
                                        
                                        // 디버깅 정보
                                        console.log('Selected exercise lookup:', {
                                            selectedEx,
                                            exercise,
                                            showCategorySelector,
                                            exercisesCount: exercises.length,
                                            allExercisesCount: allExercises.length,
                                            foundInExercises: exercises.find(ex => ex.id === selectedEx.exercise_id),
                                            foundInAllExercises: allExercises.find(ex => ex.id === selectedEx.exercise_id)
                                        });
                                        
                                        return (
                                            <Accordion
                                                key={`${selectedEx.exercise_id}-${index}`}
                                                sx={{
                                                    borderRadius: 2,
                                                    '&:before': { display: 'none' },
                                                    boxShadow: isDarkMode ? '0 2px 8px rgba(0, 0, 0, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                }}
                                            >
                                                <AccordionSummary
                                                    expandIcon={<ExpandMoreIcon />}
                                                    sx={{
                                                        backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                                        borderRadius: '8px 8px 0 0',
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
                                                            {(() => {
                                                                const displayName = exercise?.name || selectedEx.name || `운동 #${selectedEx.exercise_id}`;
                                                                console.log('Display name for exercise:', {
                                                                    exerciseId: selectedEx.exercise_id,
                                                                    exerciseName: exercise?.name,
                                                                    selectedExName: selectedEx.name,
                                                                    finalDisplayName: displayName
                                                                });
                                                                return displayName;
                                                            })()}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                                            <Chip
                                                                label={exercise?.category_name || getCategoryName(exercise?.category_id || 0)}
                                                                size="small"
                                                                color="info"
                                                                variant="outlined"
                                                                icon={<CategoryIcon />}
                                                            />
                                                            {selectedEx.target_value && (
                                                                <Chip
                                                                    label={selectedEx.target_value.length > 15
                                                                        ? `${selectedEx.target_value.substring(0, 15)}...`
                                                                        : selectedEx.target_value}
                                                                    size="small"
                                                                    color="primary"
                                                                    variant="filled"
                                                                    icon={<TimerIcon />}
                                                                    sx={{
                                                                        maxWidth: '120px',
                                                                        '& .MuiChip-label': {
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            whiteSpace: 'nowrap'
                                                                        }
                                                                    }}
                                                                />
                                                            )}
                                                        </Stack>
                                                    </Box>

                                                    <Stack direction="row" spacing={1}>
                                                        <Box
                                                            component="div"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveExercise(index, 'up');
                                                            }}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 1,
                                                                cursor: index === 0 ? 'default' : 'pointer',
                                                                opacity: index === 0 ? 0.3 : 1,
                                                                '&:hover': index === 0 ? {} : {
                                                                    backgroundColor: 'action.hover'
                                                                }
                                                            }}
                                                        >
                                                            <ArrowUpIcon />
                                                        </Box>
                                                        <Box
                                                            component="div"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                moveExercise(index, 'down');
                                                            }}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 1,
                                                                cursor: index === selectedExercises.length - 1 ? 'default' : 'pointer',
                                                                opacity: index === selectedExercises.length - 1 ? 0.3 : 1,
                                                                '&:hover': index === selectedExercises.length - 1 ? {} : {
                                                                    backgroundColor: 'action.hover'
                                                                }
                                                            }}
                                                        >
                                                            <ArrowDownIcon />
                                                        </Box>
                                                        <Box
                                                            component="div"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeExercise(index);
                                                            }}
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                width: 32,
                                                                height: 32,
                                                                borderRadius: 1,
                                                                cursor: 'pointer',
                                                                color: 'error.main',
                                                                '&:hover': {
                                                                    backgroundColor: 'error.light',
                                                                    color: 'error.dark'
                                                                }
                                                            }}
                                                        >
                                                            <DeleteIcon />
                                                        </Box>
                                                    </Stack>
                                                </AccordionSummary>

                                                <AccordionDetails sx={{ p: 3 }}>
                                                    <Stack spacing={2}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                            목표값 설정
                                                        </Typography>

                                                        <TextField
                                                            label="목표값"
                                                            placeholder="예: 20분, 100회, 3세트, 5km"
                                                            value={selectedEx.target_value}
                                                            onChange={(e) => updateTargetValue(index, e.target.value)}
                                                            fullWidth
                                                            variant="outlined"
                                                            size="small"
                                                            inputProps={{ maxLength: 30 }}
                                                            helperText={`${selectedEx.target_value.length}/30자`}
                                                            InputProps={{
                                                                startAdornment: <EditIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                                            }}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    borderRadius: 2,
                                                                }
                                                            }}
                                                        />

                                                        <Paper sx={{
                                                            p: 2,
                                                            backgroundColor: isDarkMode ? 'grey.800' : 'grey.50',
                                                            borderRadius: 2
                                                        }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                                                💡 목표값 예시
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                시간: "20분", "30분", "45분"<br />
                                                                횟수: "100회", "50회", "3세트 10회"<br />
                                                                거리: "5km", "10km", "1마일"<br />
                                                                기타: "최대한 많이", "완주까지"
                                                            </Typography>
                                                        </Paper>
                                                    </Stack>
                                                </AccordionDetails>
                                            </Accordion>
                                        );
                                    })}
                                </Stack>
                            </Fade>
                        </Collapse>
                    </Paper>
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

export default MuiExerciseSelector;
