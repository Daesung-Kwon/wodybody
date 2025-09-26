import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    CardActions,
    Typography,
    Button,
    Chip,
    Avatar,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Stack,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
    Divider,
    Badge,
    Tooltip,
    Paper,
} from './common/MuiComponents';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    Person as PersonIcon,
    FitnessCenter as FitnessCenterIcon,
    Timer as TimerIcon,
    Group as GroupIcon,
    CalendarToday as CalendarIcon,
    PlayArrow as PlayArrowIcon,
    Cancel as CancelIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { Program, ProgramWithParticipation, CreateWorkoutRecordRequest } from '../types';
import { programApi, participationApi, workoutRecordsApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import WorkoutTimer from './WorkoutTimer';
import MuiWorkoutTimer from './MuiWorkoutTimer';
import WorkoutRecordModal from './WorkoutRecordModal';
import { useTheme } from '../theme/ThemeProvider';

const MuiProgramsPage: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [programs, setPrograms] = useState<ProgramWithParticipation[]>([]);
    const [filteredPrograms, setFilteredPrograms] = useState<ProgramWithParticipation[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);

    // 필터링 상태
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');

    // 운동 타이머 관련 상태
    const [showTimer, setShowTimer] = useState<boolean>(false);
    const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
    const [completionTime, setCompletionTime] = useState<number>(0);
    const [isSavingRecord, setIsSavingRecord] = useState<boolean>(false);

    const load = async (): Promise<void> => {
        setBusy(true);
        try {
            const data = await programApi.getPrograms();
            setPrograms(data.programs || []);
            setFilteredPrograms(data.programs || []);
        } catch (error) {
            console.error('프로그램 로딩 실패:', error);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    // 필터링 로직
    useEffect(() => {
        let filtered = programs;

        // 검색어 필터링
        if (searchTerm) {
            filtered = filtered.filter(program =>
                program.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                program.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                program.creator_name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // 난이도 필터링
        if (difficultyFilter !== 'all') {
            filtered = filtered.filter(program => program.difficulty === difficultyFilter);
        }

        // 타입 필터링
        if (typeFilter !== 'all') {
            filtered = filtered.filter(program => program.workout_type === typeFilter);
        }

        setFilteredPrograms(filtered);
    }, [programs, searchTerm, difficultyFilter, typeFilter]);

    const joinProgram = async (id: number): Promise<void> => {
        setActionBusyId(id);
        try {
            await participationApi.joinProgram(id);
            await load();
            // 성공 알림은 MUI Snackbar로 처리할 수 있음
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '참여 신청 실패';
            console.error(errorMessage);
        } finally {
            setActionBusyId(null);
        }
    };

    const leaveProgram = async (id: number): Promise<void> => {
        setActionBusyId(id);
        try {
            await participationApi.leaveProgram(id);
            await load();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '신청 취소 실패';
            console.error(errorMessage);
        } finally {
            setActionBusyId(null);
        }
    };

    const getParticipationButton = (program: ProgramWithParticipation) => {
        const { participation_status, participants, max_participants } = program;

        if (participation_status === 'pending') {
            return (
                <Button
                    variant="outlined"
                    disabled
                    startIcon={<ScheduleIcon />}
                    sx={{ minWidth: 120 }}
                >
                    대기 중
                </Button>
            );
        }

        if (participation_status === 'approved') {
            return (
                <Stack direction="row" spacing={1}>
                    <Button
                        variant="contained"
                        color="success"
                        startIcon={<PlayArrowIcon />}
                        onClick={(e) => {
                            e.stopPropagation();
                            startWorkout(program);
                        }}
                        sx={{ minWidth: 100 }}
                    >
                        운동 시작
                    </Button>
                    <Button
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        onClick={(e) => {
                            e.stopPropagation();
                            leaveProgram(program.id);
                        }}
                        disabled={actionBusyId === program.id}
                        sx={{ minWidth: 100 }}
                    >
                        {actionBusyId === program.id ? (
                            <CircularProgress size={16} />
                        ) : (
                            '참여 취소'
                        )}
                    </Button>
                </Stack>
            );
        }

        if (participation_status === 'rejected') {
            return (
                <Button
                    variant="outlined"
                    color="error"
                    disabled
                    sx={{ minWidth: 120 }}
                >
                    거부됨
                </Button>
            );
        }

        // 참여하지 않은 상태
        return (
            <Button
                variant="contained"
                color="primary"
                onClick={(e) => {
                    e.stopPropagation();
                    joinProgram(program.id);
                }}
                disabled={actionBusyId === program.id || participants >= max_participants}
                sx={{ minWidth: 120 }}
            >
                {actionBusyId === program.id ? (
                    <CircularProgress size={16} />
                ) : (
                    participants >= max_participants ? '정원 마감' : '참여 신청'
                )}
            </Button>
        );
    };

    const openModal = (program: Program): void => {
        setSelectedProgram(program);
        setShowModal(true);
    };

    const closeModal = (): void => {
        setShowModal(false);
        setSelectedProgram(null);
    };

    const handleCardClick = (e: React.MouseEvent, program: Program): void => {
        if (!(e.target as HTMLElement).closest('button')) {
            openModal(program);
        }
    };

    // 운동 시작
    const startWorkout = (program: Program): void => {
        setSelectedProgram(program);
        setShowTimer(true);
    };

    // 운동 완료
    const handleWorkoutComplete = (time: number): void => {
        setCompletionTime(time);
        setShowTimer(false);
        setShowRecordModal(true);
    };

    // 운동 취소
    const handleWorkoutCancel = (): void => {
        setShowTimer(false);
        setSelectedProgram(null);
    };

    // 기록 저장
    const handleSaveRecord = async (data: CreateWorkoutRecordRequest): Promise<void> => {
        if (!selectedProgram) return;

        setIsSavingRecord(true);
        try {
            await workoutRecordsApi.createRecord(selectedProgram.id, data);
            setShowRecordModal(false);
            setSelectedProgram(null);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 저장 실패';
            console.error(`기록 저장 중 오류가 발생했습니다: ${errorMessage}`);
        } finally {
            setIsSavingRecord(false);
        }
    };

    // 기록 모달 닫기
    const closeRecordModal = (): void => {
        setShowRecordModal(false);
        setSelectedProgram(null);
    };

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
        switch (type) {
            case 'wod': return 'WOD';
            case 'time_based': return '시간 기반';
            case 'rep_based': return '횟수 기반';
            default: return type;
        }
    };

    if (busy) return <LoadingSpinner label="프로그램 로딩 중..." />;

    return (
        <Box sx={{ p: 3 }}>
            {/* 헤더 */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                            fontWeight: 'bold',
                            color: isDarkMode ? '#ffffff' : '#1976d2', // 라이트 모드: 파란색, 다크 모드: 흰색
                        }}
                    >
                        공개된 크로스핏 WOD
                    </Typography>
                    <Tooltip title="새로고침">
                        <IconButton
                            onClick={load}
                            disabled={busy}
                            sx={{
                                color: isDarkMode ? '#ffffff' : '#1976d2' // 라이트 모드: 파란색, 다크 모드: 흰색
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {/* 필터 및 검색 */}
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Stack spacing={2}>
                        {/* 검색창 - 전체 너비 */}
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="프로그램 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        {/* 필터들 - 한 줄로 배치 */}
                        <Stack direction={{ xs: 'row', sm: 'row' }} spacing={2} alignItems="center">
                            <FormControl sx={{ minWidth: { xs: 100, sm: 120 }, flex: 1 }}>
                                <InputLabel>난이도</InputLabel>
                                <Select
                                    value={difficultyFilter}
                                    label="난이도"
                                    onChange={(e) => setDifficultyFilter(e.target.value)}
                                >
                                    <MenuItem value="all">전체</MenuItem>
                                    <MenuItem value="beginner">초급</MenuItem>
                                    <MenuItem value="intermediate">중급</MenuItem>
                                    <MenuItem value="advanced">고급</MenuItem>
                                </Select>
                            </FormControl>

                            <FormControl sx={{ minWidth: { xs: 100, sm: 120 }, flex: 1 }}>
                                <InputLabel>타입</InputLabel>
                                <Select
                                    value={typeFilter}
                                    label="타입"
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                >
                                    <MenuItem value="all">전체</MenuItem>
                                    <MenuItem value="wod">WOD</MenuItem>
                                    <MenuItem value="time_based">시간 기반</MenuItem>
                                    <MenuItem value="rep_based">횟수 기반</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Stack>
                </Paper>
            </Box>

            {/* 프로그램 목록 */}
            {filteredPrograms.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        {programs.length === 0 ? '현재 공개된 WOD가 없습니다.' : '검색 결과가 없습니다.'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {programs.length === 0
                            ? '새로운 WOD가 등록되면 여기에 표시됩니다.'
                            : '다른 검색어나 필터를 시도해보세요.'
                        }
                    </Typography>
                </Paper>
            ) : (
                <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'repeat(2, 1fr)',
                        lg: 'repeat(3, 1fr)'
                    },
                    gap: 3
                }}>
                    {filteredPrograms.map((program) => (
                        <Box key={program.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                                    },
                                }}
                                onClick={(e) => handleCardClick(e, program)}
                            >
                                <CardHeader
                                    avatar={
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            <FitnessCenterIcon />
                                        </Avatar>
                                    }
                                    title={
                                        <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
                                            {program.title}
                                        </Typography>
                                    }
                                    subheader={
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Chip
                                                label={getTypeLabel(program.workout_type)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={getDifficultyLabel(program.difficulty)}
                                                size="small"
                                                color={getDifficultyColor(program.difficulty)}
                                            />
                                        </Stack>
                                    }
                                    action={
                                        <IconButton size="small">
                                            <PersonIcon />
                                        </IconButton>
                                    }
                                />

                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {program.description}
                                    </Typography>

                                    {/* 프로그램 정보 */}
                                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <PersonIcon fontSize="small" color="action" />
                                            <Typography variant="caption">{program.creator_name}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                            <GroupIcon fontSize="small" color="action" />
                                            <Typography variant="caption">
                                                {program.participants}/{program.max_participants}명
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    {/* 운동 미리보기 */}
                                    {program.workout_pattern?.exercises && program.workout_pattern.exercises.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                포함된 운동:
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {program.workout_pattern.exercises.slice(0, 3).map((exercise, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={exercise.exercise_name}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                ))}
                                                {program.workout_pattern.exercises.length > 3 && (
                                                    <Chip
                                                        label={`+${program.workout_pattern.exercises.length - 3}개 더`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}

                                    {program.workout_pattern && (
                                        <Box sx={{ mb: 2 }}>
                                            <Chip
                                                label={`${program.workout_pattern.type} • ${program.workout_pattern.total_rounds}라운드`}
                                                size="small"
                                                color="secondary"
                                                variant="outlined"
                                            />
                                        </Box>
                                    )}
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    {getParticipationButton(program)}
                                </CardActions>
                            </Card>
                        </Box>
                    ))}
                </Box>
            )}

            {/* 상세 모달 */}
            <Dialog
                open={showModal}
                onClose={closeModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        maxHeight: '90vh',
                    },
                }}
            >
                {selectedProgram && (
                    <>
                        <DialogTitle sx={{ pb: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                                    {selectedProgram.title}
                                </Typography>
                                <IconButton onClick={closeModal} size="small">
                                    <CancelIcon />
                                </IconButton>
                            </Stack>
                        </DialogTitle>

                        <DialogContent sx={{ pt: 2 }}>
                            <Stack spacing={3}>
                                {/* 설명 */}
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                                        설명
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary">
                                        {selectedProgram.description}
                                    </Typography>
                                </Box>

                                <Divider />

                                {/* 기본 정보 */}
                                <Box>
                                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                        기본 정보
                                    </Typography>
                                    <Box sx={{
                                        display: 'grid',
                                        gridTemplateColumns: {
                                            xs: '1fr',
                                            sm: 'repeat(2, 1fr)'
                                        },
                                        gap: 2
                                    }}>
                                        <Paper sx={{ p: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <PersonIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        작성자
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {selectedProgram.creator_name}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                        <Paper sx={{ p: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <FitnessCenterIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        운동 타입
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {getTypeLabel(selectedProgram.workout_type)}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                        <Paper sx={{ p: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <TimerIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        목표
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {selectedProgram.target_value}
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                        <Paper sx={{ p: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <GroupIcon color="primary" />
                                                <Box>
                                                    <Typography variant="caption" color="text.secondary">
                                                        참여자
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                        {selectedProgram.participants}/{selectedProgram.max_participants}명
                                                    </Typography>
                                                </Box>
                                            </Stack>
                                        </Paper>
                                    </Box>
                                </Box>

                                {/* WOD 패턴 */}
                                {selectedProgram.workout_pattern && (
                                    <>
                                        <Divider />
                                        <Box>
                                            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                                WOD 패턴
                                            </Typography>
                                            <Paper sx={{ p: 3 }}>
                                                <Stack spacing={2}>
                                                    <Stack direction="row" spacing={2} alignItems="center">
                                                        <Chip
                                                            label={selectedProgram.workout_pattern.type}
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                        <Chip
                                                            label={`${selectedProgram.workout_pattern.total_rounds}라운드`}
                                                            color="secondary"
                                                            variant="outlined"
                                                        />
                                                        {selectedProgram.workout_pattern.time_cap_per_round && (
                                                            <Chip
                                                                label={`${selectedProgram.workout_pattern.time_cap_per_round}분 제한`}
                                                                color="warning"
                                                                variant="outlined"
                                                            />
                                                        )}
                                                    </Stack>

                                                    {selectedProgram.workout_pattern.description && (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {selectedProgram.workout_pattern.description}
                                                        </Typography>
                                                    )}

                                                    {selectedProgram.workout_pattern.exercises && selectedProgram.workout_pattern.exercises.length > 0 && (
                                                        <Box>
                                                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                                                포함된 운동
                                                            </Typography>
                                                            <Stack spacing={1}>
                                                                {selectedProgram.workout_pattern.exercises.map((exercise, index) => (
                                                                    <Paper key={index} sx={{ p: 2 }}>
                                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                                                {exercise.exercise_name}
                                                                            </Typography>
                                                                            <Typography variant="body2" color="text.secondary">
                                                                                {exercise.base_reps}회
                                                                            </Typography>
                                                                        </Stack>
                                                                        <Typography variant="caption" color="text.secondary">
                                                                            {exercise.progression_type === 'fixed' ? '고정' :
                                                                                exercise.progression_type === 'increase' ? `+${exercise.progression_value}회씩 증가` :
                                                                                    exercise.progression_type === 'decrease' ? `-${exercise.progression_value}회씩 감소` :
                                                                                        '혼합'}
                                                                        </Typography>
                                                                    </Paper>
                                                                ))}
                                                            </Stack>
                                                        </Box>
                                                    )}
                                                </Stack>
                                            </Paper>
                                        </Box>
                                    </>
                                )}
                            </Stack>
                        </DialogContent>

                        <DialogActions sx={{ p: 3 }}>
                            <Button onClick={closeModal} variant="outlined">
                                닫기
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* 운동 타이머 */}
            {showTimer && selectedProgram && (
                <MuiWorkoutTimer
                    onComplete={handleWorkoutComplete}
                    onCancel={handleWorkoutCancel}
                    programTitle={selectedProgram.title}
                />
            )}

            {/* 운동 기록 저장 모달 */}
            {showRecordModal && selectedProgram && (
                <WorkoutRecordModal
                    isOpen={showRecordModal}
                    onClose={closeRecordModal}
                    onSave={handleSaveRecord}
                    completionTime={completionTime}
                    programTitle={selectedProgram.title}
                    isLoading={isSavingRecord}
                />
            )}
        </Box>
    );
};

export default MuiProgramsPage;
