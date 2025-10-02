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
    DialogContent,
    DialogActions,
    Stack,
    TextField,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Tooltip,
    Paper,
} from './common/MuiComponents';
import {
    Refresh as RefreshIcon,
    Search as SearchIcon,
    Person as PersonIcon,
    FitnessCenter as FitnessCenterIcon,
    Group as GroupIcon,
    CalendarToday as CalendarIcon,
    PlayArrow as PlayArrowIcon,
    Cancel as CancelIcon,
    Schedule as ScheduleIcon,
    TrendingUp as TrendingUpIcon,
    AccessTime as AccessTimeIcon,
    Warning as WarningIcon,
} from '@mui/icons-material';
import { Program, ProgramWithParticipation, CreateWorkoutRecordRequest, ProgramDetail } from '../types';
import { programApi, participationApi, workoutRecordsApi } from '../utils/api';
import MuiLoadingSpinner from './MuiLoadingSpinner';
import MuiWorkoutTimer from './MuiWorkoutTimer';
import MuiWorkoutRecordModal from './MuiWorkoutRecordModal';
import { useTheme } from '../theme/ThemeProvider';

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

const MuiProgramsPage: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [programs, setPrograms] = useState<ProgramWithParticipation[]>([]);
    const [filteredPrograms, setFilteredPrograms] = useState<ProgramWithParticipation[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<ProgramDetail | null>(null);
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

    const openModal = async (program: Program): Promise<void> => {
        try {
            // 실제 API를 호출하여 최신 프로그램 상세 정보를 가져옴
            const response = await programApi.getProgramDetail(program.id);
            const programDetail = response.program;

            setSelectedProgram(programDetail);
            setShowModal(true);
        } catch (error) {
            console.error('프로그램 상세 정보 로드 실패:', error);
            // 오류가 발생하면 Program을 ProgramDetail로 변환
            const fallbackDetail: ProgramDetail = {
                ...program,
                is_open: true // 기본값 설정
            };
            setSelectedProgram(fallbackDetail);
            setShowModal(true);
        }
    };

    const closeModal = (): void => {
        setShowModal(false);
        setSelectedProgram(null);
    };

    const handleCardClick = async (e: React.MouseEvent, program: Program): Promise<void> => {
        if (!(e.target as HTMLElement).closest('button')) {
            await openModal(program);
        }
    };

    // 운동 시작
    const startWorkout = (program: Program): void => {
        const programDetail: ProgramDetail = {
            ...program,
            is_open: true // 기본값 설정
        };
        setSelectedProgram(programDetail);
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
        console.log('MuiProgramsPage workout_type:', type, 'type:', typeof type);
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

    if (busy) return <MuiLoadingSpinner label="프로그램 로딩 중..." />;

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
                <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
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
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
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
                                    borderRadius: 2,
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
                                            <Box sx={{ mb: 2 }}>
                                                <Chip
                                                    icon={getIcon()}
                                                    label={expiryInfo.text}
                                                    size="small"
                                                    color={getChipColor()}
                                                    variant={expiryInfo.status === 'expired' ? 'filled' : 'outlined'}
                                                    sx={{
                                                        fontWeight: expiryInfo.status === 'urgent' || expiryInfo.status === 'expired' ? 600 : 400,
                                                        '& .MuiChip-icon': {
                                                            fontSize: '16px'
                                                        }
                                                    }}
                                                />
                                            </Box>
                                        );
                                    })()}

                                    {/* 운동 미리보기 - workout_pattern 우선, exercises fallback */}
                                    {program.workout_pattern?.exercises && program.workout_pattern.exercises.length > 0 ? (
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
                                    ) : program.exercises && program.exercises.length > 0 ? (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                포함된 운동:
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {program.exercises.slice(0, 3).map((exercise, index) => (
                                                    <Chip
                                                        key={index}
                                                        label={exercise.name}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                ))}
                                                {program.exercises.length > 3 && (
                                                    <Chip
                                                        label={`+${program.exercises.length - 3}개 더`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mb: 0.5 }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    ) : null}

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

            {/* 프로그램 상세 모달 - Material Design 개선 */}
            <Dialog
                open={showModal}
                onClose={closeModal}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                        boxShadow: isDarkMode
                            ? '0 24px 48px rgba(0, 0, 0, 0.4)'
                            : '0 24px 48px rgba(0, 0, 0, 0.12)',
                        minHeight: '80vh',
                    }
                }}
            >
                {selectedProgram && (
                    <>
                        {/* 헤더 - 그라데이션 배경 */}
                        <Box
                            sx={{
                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                color: 'white',
                                p: 3,
                                position: 'relative',
                                overflow: 'hidden',
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
                                    <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                                        {selectedProgram.title}
                                    </Typography>
                                    <Typography variant="body1" sx={{ opacity: 0.9, mb: 2 }}>
                                        {selectedProgram.description}
                                    </Typography>

                                    {/* 기본 정보 태그들 */}
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip
                                            label={`🎯 ${selectedProgram.target_value}`}
                                            size="small"
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Chip
                                            label={`🏋️ ${getTypeLabel(selectedProgram.workout_type) || '미분류'}`}
                                            size="small"
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Chip
                                            label={`📈 ${getDifficultyLabel(selectedProgram.difficulty)}`}
                                            size="small"
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                            }}
                                        />
                                        <Chip
                                            label={`👥 ${selectedProgram.participants}/${selectedProgram.max_participants}명`}
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
                                    onClick={closeModal}
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

                        <DialogContent sx={{ p: 0 }}>
                            <Box sx={{ p: 3 }}>
                                {/* 운동 목록 */}
                                <Box sx={{ mb: 4 }}>
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary' }}>
                                        🏋️ 포함된 운동
                                    </Typography>

                                    {/* WOD 패턴 방식 운동 목록 */}
                                    {selectedProgram.workout_pattern?.exercises && selectedProgram.workout_pattern.exercises.length > 0 && (
                                        <Card sx={{ mb: 3, overflow: 'hidden' }}>
                                            <Box sx={{
                                                p: 2,
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                color: 'white',
                                            }}>
                                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                    🎯 WOD 패턴 운동
                                                </Typography>
                                            </Box>
                                            <Box sx={{ p: 2 }}>
                                                <Stack spacing={2}>
                                                    {selectedProgram.workout_pattern.exercises.map((exercise, index) => {
                                                        // 디버깅: 실제 데이터 확인
                                                        console.log(`=== Exercise ${index + 1} Debug ===`);
                                                        console.log('Exercise:', exercise);
                                                        console.log('Name:', exercise.exercise_name);
                                                        console.log('Base reps:', exercise.base_reps);
                                                        console.log('Progression type:', exercise.progression_type);
                                                        console.log('Progression value:', exercise.progression_value);
                                                        console.log('================================');

                                                        return (
                                                            <Card key={index} variant="outlined" sx={{
                                                                p: 2,
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
                                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                                {exercise.exercise_name || exercise.name}
                                                                            </Typography>
                                                                        </Stack>
                                                                        <Chip
                                                                            label={exercise.base_reps ? `${exercise.base_reps}회` : exercise.target_value}
                                                                            color="primary"
                                                                            variant="outlined"
                                                                            size="small"
                                                                        />
                                                                    </Stack>

                                                                    {/* 진행 방식 정보 - 실제 데이터 기반으로 수정 */}
                                                                    <Box sx={{
                                                                        pl: 5,
                                                                        py: 2,
                                                                        bgcolor: (() => {
                                                                            const type = exercise.progression_type;
                                                                            if (type === 'increase') return 'rgba(76, 175, 80, 0.08)';
                                                                            if (type === 'decrease') return 'rgba(244, 67, 54, 0.08)';
                                                                            if (type === 'mixed') return 'rgba(255, 152, 0, 0.08)';
                                                                            if (type === 'fixed') return 'rgba(25, 118, 210, 0.08)';
                                                                            return 'rgba(158, 158, 158, 0.08)'; // 기본값
                                                                        })(),
                                                                        borderRadius: 2,
                                                                        border: '1px solid',
                                                                        borderColor: (() => {
                                                                            const type = exercise.progression_type;
                                                                            if (type === 'increase') return 'rgba(76, 175, 80, 0.3)';
                                                                            if (type === 'decrease') return 'rgba(244, 67, 54, 0.3)';
                                                                            if (type === 'mixed') return 'rgba(255, 152, 0, 0.3)';
                                                                            if (type === 'fixed') return 'rgba(25, 118, 210, 0.3)';
                                                                            return 'rgba(158, 158, 158, 0.3)'; // 기본값
                                                                        })(),
                                                                    }}>
                                                                        <Stack spacing={1}>
                                                                            {/* 진행 방식 헤더 */}
                                                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                                                {(() => {
                                                                                    const type = exercise.progression_type;
                                                                                    console.log('Progression type for header:', type, typeof type);

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
                                                                            <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
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
                                                                                    }}
                                                                                />

                                                                                {/* 예시 표시 - 실제 데이터 기반 */}
                                                                                <Typography variant="caption" sx={{
                                                                                    color: 'text.secondary',
                                                                                    fontStyle: 'italic',
                                                                                    fontSize: '0.7rem',
                                                                                    display: 'block',
                                                                                    mt: 0.5,
                                                                                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                                                                    p: 0.5,
                                                                                    borderRadius: 1,
                                                                                    border: '1px solid rgba(0, 0, 0, 0.1)'
                                                                                }}>
                                                                                    {(() => {
                                                                                        const baseReps = exercise.base_reps || 0;
                                                                                        const progressionValue = exercise.progression_value || 1;
                                                                                        const type = exercise.progression_type;

                                                                                        console.log('예시 계산:', {
                                                                                            baseReps,
                                                                                            progressionValue,
                                                                                            progressionType: type,
                                                                                            typeOfType: typeof type
                                                                                        });

                                                                                        if (type === 'increase') {
                                                                                            return `예: 1라운드 ${baseReps}회 → 2라운드 ${baseReps + progressionValue}회`;
                                                                                        } else if (type === 'decrease') {
                                                                                            return `예: 1라운드 ${baseReps}회 → 2라운드 ${Math.max(0, baseReps - progressionValue)}회`;
                                                                                        } else if (type === 'mixed') {
                                                                                            return `예: 혼합 패턴 (라운드별로 다름)`;
                                                                                        } else if (type === 'fixed') {
                                                                                            return `예: 모든 라운드 ${baseReps}회 고정`;
                                                                                        } else {
                                                                                            return `예: 진행 방식 정보 없음 (타입: ${type})`;
                                                                                        }
                                                                                    })()}
                                                                                </Typography>
                                                                            </Stack>
                                                                        </Stack>
                                                                    </Box>
                                                                </Stack>
                                                            </Card>
                                                        );
                                                    })}
                                                </Stack>
                                            </Box>
                                        </Card>
                                    )}

                                    {/* 기존 방식 운동 목록 */}
                                    {(!selectedProgram.workout_pattern?.exercises || selectedProgram.workout_pattern.exercises.length === 0) &&
                                        selectedProgram.exercises && selectedProgram.exercises.length > 0 && (
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
                                                        {selectedProgram.exercises.map((exercise, index) => (
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
                                    {(!selectedProgram.workout_pattern?.exercises || selectedProgram.workout_pattern.exercises.length === 0) &&
                                        (!selectedProgram.exercises || selectedProgram.exercises.length === 0) && (
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
                                {selectedProgram.workout_pattern && (
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
                                                            label={selectedProgram.workout_pattern.type}
                                                            color="primary"
                                                            variant="filled"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                        <Chip
                                                            label={`${selectedProgram.workout_pattern.total_rounds}라운드`}
                                                            color="secondary"
                                                            variant="filled"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                        {selectedProgram.workout_pattern.time_cap_per_round && (
                                                            <Chip
                                                                label={`${selectedProgram.workout_pattern.time_cap_per_round}분 제한`}
                                                                color="warning"
                                                                variant="filled"
                                                                sx={{ fontWeight: 600 }}
                                                            />
                                                        )}
                                                    </Stack>

                                                    {/* 패턴 설명 */}
                                                    {selectedProgram.workout_pattern.description && (
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
                                                                {selectedProgram.workout_pattern.description}
                                                            </Typography>
                                                        </Paper>
                                                    )}
                                                </Stack>
                                            </Box>
                                        </Card>
                                    </Box>
                                )}
                            </Box>
                        </DialogContent>

                        <DialogActions sx={{
                            p: 3,
                            backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
                            borderTop: '1px solid',
                            borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                        }}>
                            <Button
                                onClick={closeModal}
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
                <MuiWorkoutRecordModal
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
