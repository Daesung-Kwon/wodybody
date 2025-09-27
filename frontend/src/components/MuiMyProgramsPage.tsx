import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent, CardActions,
    Chip, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, FormControl, InputLabel, Select, MenuItem, Alert,
    List, ListItem, ListItemText, Switch,
    Badge, Avatar, Tooltip, Fade, Divider, Grid,
} from './common/MuiComponents';
import {
    Refresh as RefreshIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Public as PublicIcon,
    VisibilityOff as VisibilityOffIcon,
    Group as GroupIcon,
    TrendingUp as TrendingUpIcon,
    Settings as SettingsIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Close as CloseIcon,
    FitnessCenter as FitnessCenterIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    CalendarToday as CalendarTodayIcon,
    AccessTime as AccessTimeIcon,
    Save as SaveIcon,
} from '@mui/icons-material';
import { MyProgram, ModalState, ProgramParticipant, CreateProgramForm } from '../types';
import { programApi, participationApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../theme/ThemeProvider';

const MuiMyProgramsPage: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [mine, setMine] = useState<MyProgram[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>({
        open: false,
        title: '',
        msg: '',
        type: 'info'
    });
    const [participantsModal, setParticipantsModal] = useState<{
        open: boolean;
        programId: number | null;
        participants: ProgramParticipant[];
        maxParticipants?: number;
        approvedCount?: number;
    }>({
        open: false,
        programId: null,
        participants: []
    });
    const [confirmAlert, setConfirmAlert] = useState<{
        open: boolean;
        title: string;
        message: string;
        programId: number | null;
    }>({
        open: false,
        title: '',
        message: '',
        programId: null
    });

    const [editModal, setEditModal] = useState<{
        open: boolean;
        program: MyProgram | null;
        formData: CreateProgramForm;
    }>({
        open: false,
        program: null,
        formData: {
            title: '',
            description: '',
            workout_type: 'time_based',
            target_value: '',
            difficulty: 'beginner',
            max_participants: 20,
            selected_exercises: [],
            workout_pattern: null
        }
    });

    const showModal = (title: string, msg: string, type: ModalState['type'] = 'info') =>
        setModal({ open: true, title, msg, type });

    const closeModal = () =>
        setModal({ open: false, title: '', msg: '', type: 'info' });

    const closeParticipantsModal = () =>
        setParticipantsModal({ open: false, programId: null, participants: [] });

    const openEditModal = async (program: MyProgram) => {
        try {
            const response = await programApi.getProgramDetail(program.id);
            const programDetail = response.program;

            setEditModal({
                open: true,
                program,
                formData: {
                    title: program.title,
                    description: program.description,
                    workout_type: program.workout_type,
                    target_value: program.target_value,
                    difficulty: program.difficulty,
                    max_participants: program.max_participants,
                    selected_exercises: programDetail.exercises.map(ex => ({
                        exercise_id: ex.id,
                        name: ex.name,
                        target_value: ex.target_value,
                        order: ex.order
                    })),
                    workout_pattern: programDetail.workout_pattern || null
                }
            });
        } catch (error) {
            console.error('프로그램 상세 정보 로드 실패:', error);
            showModal('오류', '프로그램 상세 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
    };

    const closeEditModal = () =>
        setEditModal({
            open: false, program: null, formData: {
                title: '',
                description: '',
                workout_type: 'time_based',
                target_value: '',
                difficulty: 'beginner',
                max_participants: 20,
                selected_exercises: [],
                workout_pattern: null
            }
        });

    const updateProgram = async (): Promise<void> => {
        if (!editModal.program) return;

        try {
            await programApi.updateProgram(editModal.program.id, editModal.formData);
            await load();
            closeEditModal();
            showModal('성공', '프로그램이 성공적으로 수정되었습니다.', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '프로그램 수정 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const load = async (): Promise<void> => {
        setBusy(true);
        try {
            const data = await programApi.getMyPrograms();
            console.log('전체 프로그램 데이터:', data);
            console.log('프로그램 목록:', data.programs);
            if (data.programs && data.programs.length > 0) {
                console.log('첫 번째 프로그램:', data.programs[0]);
                console.log('첫 번째 프로그램 workout_type:', data.programs[0].workout_type);
            }
            setMine(data.programs || []);
        } catch (error) {
            console.error('내 프로그램 로딩 실패:', error);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const open = async (id: number): Promise<void> => {
        try {
            await programApi.openProgram(id);
            await load();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '프로그램 공개 실패';
            window.alert(errorMessage);
        }
    };

    const results = async (id: number): Promise<void> => {
        try {
            const data = await programApi.getProgramResults(id);

            if (!data.results || data.results.length === 0) {
                showModal('결과 없음', '아직 참여자가 없습니다.', 'info');
                return;
            }

            const lines = data.results.map((result) => {
                let status = '';
                if (result.status === 'pending') status = '대기 중';
                else if (result.status === 'approved') status = '승인됨';
                else if (result.status === 'rejected') status = '거부됨';
                else if (result.status === 'left') status = '신청 취소함';
                else status = result.completed ? '완료' : '신청';

                const resultText = result.result ? ` - 결과: ${result.result}` : '';
                return `${result.user_name} (${status})${resultText}`;
            });

            showModal('참여자 결과', lines.join('\n'), 'info');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '결과 조회 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const showDeleteConfirm = (id: number, title: string): void => {
        setConfirmAlert({
            open: true,
            title: 'WOD 삭제 확인',
            message: `"${title}" WOD를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
            programId: id
        });
    };

    const deleteProgram = async (): Promise<void> => {
        if (!confirmAlert.programId) return;

        try {
            await programApi.deleteProgram(confirmAlert.programId);
            showModal('삭제 완료', 'WOD가 삭제되었습니다.', 'success');
            await load();
            setConfirmAlert({ open: false, title: '', message: '', programId: null });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '삭제 실패';
            showModal('오류', errorMessage, 'error');
            setConfirmAlert({ open: false, title: '', message: '', programId: null });
        }
    };

    const cancelDelete = (): void => {
        setConfirmAlert({ open: false, title: '', message: '', programId: null });
    };

    const manageParticipants = async (programId: number): Promise<void> => {
        try {
            const data = await participationApi.getProgramParticipants(programId);
            const program = mine.find(p => p.id === programId);
            setParticipantsModal({
                open: true,
                programId,
                participants: data.participants,
                maxParticipants: program?.max_participants || 0,
                approvedCount: data.approved_count
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '참여자 목록 조회 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const approveParticipant = async (programId: number, userId: number, action: 'approve' | 'reject'): Promise<void> => {
        try {
            await participationApi.approveParticipant(programId, userId, action);

            const data = await participationApi.getProgramParticipants(programId);
            setParticipantsModal(prev => ({
                ...prev,
                participants: data.participants,
                approvedCount: data.approved_count
            }));

            showModal('처리 완료', `참여자가 ${action === 'approve' ? '승인' : '거부'}되었습니다.`, 'success');

        } catch (error) {
            let errorMessage = '처리 실패';
            if (error instanceof Error) {
                errorMessage = error.message;
                if (errorMessage.includes('정원이 가득 찼습니다')) {
                    errorMessage = '정원이 가득 찼습니다. 더 이상 참여자를 승인할 수 없습니다.';
                }
            }
            showModal('오류', errorMessage, 'error');
        }
    };

    const getTypeLabel = (type: string) => {
        console.log('workout_type:', type, 'type:', typeof type); // 디버깅용
        if (!type || type.trim() === '') {
            return null; // 빈 값이면 null 반환
        }
        switch (type) {
            case 'wod': return 'WOD 패턴';
            case 'time_based': return '시간 기반';
            case 'rep_based': return '횟수 기반';
            default: return type;
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'left': return 'default';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return '대기 중';
            case 'approved': return '승인됨';
            case 'rejected': return '거부됨';
            case 'left': return '신청 취소함';
            default: return status;
        }
    };

    if (busy) return <LoadingSpinner label="내 프로그램 로딩 중..." />;

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
                            color: isDarkMode ? '#ffffff' : '#1976d2',
                        }}
                    >
                        내가 등록한 WOD
                    </Typography>
                    <Tooltip title="새로고침">
                        <IconButton
                            onClick={load}
                            disabled={busy}
                            sx={{
                                color: isDarkMode ? '#ffffff' : '#1976d2'
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Box>

            {/* WOD 목록 */}
            {mine.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Avatar
                        sx={{
                            width: 80,
                            height: 80,
                            backgroundColor: 'grey.200',
                            mb: 3,
                            mx: 'auto',
                        }}
                    >
                        <FitnessCenterIcon sx={{ fontSize: 40, color: 'grey.500' }} />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        등록한 WOD가 없습니다
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        새로운 WOD를 등록해보세요
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
                    {mine.map((program, index) => (
                        <Fade in={true} style={{ transitionDelay: `${index * 100}ms` }} key={program.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'all 0.2s ease-in-out',
                                    border: program.is_open ? '2px solid' : '1px solid',
                                    borderColor: program.is_open ? 'success.main' : 'divider',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                                    },
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1, p: 3 }}>
                                    {/* 헤더 */}
                                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                                            {program.title}
                                        </Typography>
                                        <Chip
                                            label={program.is_open ? '공개' : '비공개'}
                                            color={program.is_open ? 'success' : 'default'}
                                            size="small"
                                            icon={program.is_open ? <PublicIcon /> : <VisibilityOffIcon />}
                                        />
                                    </Stack>

                                    {/* 설명 */}
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                        {program.description}
                                    </Typography>

                                    {/* 태그들 */}
                                    <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 2 }}>
                                        <Chip
                                            label={getTypeLabel(program.workout_type)}
                                            size="small"
                                            color="primary"
                                            sx={{ fontWeight: 600 }}
                                        />
                                        <Chip
                                            label={getDifficultyLabel(program.difficulty)}
                                            size="small"
                                            color={getDifficultyColor(program.difficulty)}
                                            sx={{ fontWeight: 600 }}
                                        />
                                        <Chip
                                            label={`${program.participants}/${program.max_participants}명`}
                                            size="small"
                                            color="default"
                                            icon={<GroupIcon />}
                                            sx={{ fontWeight: 600 }}
                                        />
                                    </Stack>

                                    {/* 운동 정보 - 공개 WOD와 동일한 로직 적용 */}
                                    {program.workout_pattern?.exercises && program.workout_pattern.exercises.length > 0 && (
                                        <Box sx={{ mb: 2 }}>
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                포함된 운동:
                                            </Typography>
                                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                {program.workout_pattern.exercises.slice(0, 3).map((exercise, index) => (
                                                    <Chip key={index} label={exercise.exercise_name} size="small" variant="outlined" />
                                                ))}
                                                {program.workout_pattern.exercises.length > 3 && (
                                                    <Chip label={`+${program.workout_pattern.exercises.length - 3}개`} size="small" variant="outlined" />
                                                )}
                                            </Stack>
                                        </Box>
                                    )}
                                    {/* 기존 방식 호환성 유지 - workout_pattern이 없을 때만 표시 */}
                                    {(!program.workout_pattern?.exercises || program.workout_pattern.exercises.length === 0) &&
                                        program.exercises && program.exercises.length > 0 && (
                                            <Box sx={{ mb: 2 }}>
                                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                                                    포함된 운동:
                                                </Typography>
                                                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                                                    {program.exercises.slice(0, 3).map((exercise, index) => (
                                                        <Chip key={index} label={exercise.name} size="small" variant="outlined" />
                                                    ))}
                                                    {program.exercises.length > 3 && (
                                                        <Chip label={`+${program.exercises.length - 3}개`} size="small" variant="outlined" />
                                                    )}
                                                </Stack>
                                            </Box>
                                        )}

                                    {/* 등록일 */}
                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <CalendarTodayIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(program.created_at).toLocaleDateString('ko-KR')}
                                        </Typography>
                                    </Stack>
                                </CardContent>

                                <CardActions sx={{ p: 2, pt: 0 }}>
                                    <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                                        {!program.is_open ? (
                                            <>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<EditIcon />}
                                                    onClick={() => openEditModal(program)}
                                                    sx={{ flex: 1 }}
                                                >
                                                    수정
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    startIcon={<PublicIcon />}
                                                    onClick={() => open(program.id)}
                                                    sx={{ flex: 1 }}
                                                >
                                                    공개
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<TrendingUpIcon />}
                                                    onClick={() => results(program.id)}
                                                    sx={{ flex: 1 }}
                                                >
                                                    결과
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    startIcon={<SettingsIcon />}
                                                    onClick={() => manageParticipants(program.id)}
                                                    sx={{ flex: 1 }}
                                                >
                                                    관리
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={() => showDeleteConfirm(program.id, program.title)}
                                            sx={{
                                                minWidth: 40,
                                                px: 1,
                                                '& .MuiButton-startIcon': {
                                                    margin: 0 // 아이콘과 텍스트 사이의 간격 제거
                                                }
                                            }}
                                        >
                                            <DeleteIcon />
                                        </Button>
                                    </Stack>
                                </CardActions>
                            </Card>
                        </Fade>
                    ))}
                </Box>
            )}

            {/* 참여자 관리 모달 */}
            <Dialog
                open={participantsModal.open}
                onClose={closeParticipantsModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                        참여자 관리
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <IconButton
                            onClick={() => participantsModal.programId && manageParticipants(participantsModal.programId)}
                            sx={{ color: 'primary.main' }}
                        >
                            <RefreshIcon />
                        </IconButton>
                        <IconButton
                            aria-label="close"
                            onClick={closeParticipantsModal}
                            sx={{ color: (theme) => theme.palette.grey[500] }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Stack>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    {participantsModal.participants.length === 0 ? (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="h6" color="text.secondary">
                                참여자가 없습니다
                            </Typography>
                        </Box>
                    ) : (
                        <List>
                            {participantsModal.participants.map((participant) => (
                                <ListItem key={participant.id} sx={{ px: 0 }}>
                                    <ListItemText
                                        primary={
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {participant.user_name}
                                                </Typography>
                                                <Chip
                                                    label={getStatusLabel(participant.status)}
                                                    color={getStatusColor(participant.status)}
                                                    size="small"
                                                />
                                            </Stack>
                                        }
                                        secondary={
                                            <Typography variant="caption" color="text.secondary">
                                                신청일: {new Date(participant.joined_at).toLocaleDateString('ko-KR')}
                                            </Typography>
                                        }
                                    />
                                    {participant.status === 'pending' && (
                                        <Box sx={{ ml: 'auto' }}>
                                            <Stack direction="row" spacing={1}>
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    color="success"
                                                    startIcon={<CheckCircleIcon />}
                                                    onClick={() => approveParticipant(participantsModal.programId!, participant.user_id, 'approve')}
                                                    disabled={(participantsModal.approvedCount || 0) >= (participantsModal.maxParticipants || 0)}
                                                >
                                                    승인
                                                </Button>
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    color="error"
                                                    startIcon={<CancelIcon />}
                                                    onClick={() => approveParticipant(participantsModal.programId!, participant.user_id, 'reject')}
                                                >
                                                    거부
                                                </Button>
                                            </Stack>
                                        </Box>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
            </Dialog>

            {/* 프로그램 수정 모달 */}
            <Dialog
                open={editModal.open}
                onClose={closeEditModal}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" component="div" sx={{ fontWeight: 600 }}>
                        WOD 수정
                    </Typography>
                    <IconButton
                        aria-label="close"
                        onClick={closeEditModal}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* 기본 정보 */}
                        <TextField
                            fullWidth
                            label="제목"
                            value={editModal.formData.title}
                            onChange={(e) => setEditModal({
                                ...editModal,
                                formData: { ...editModal.formData, title: e.target.value }
                            })}
                            variant="outlined"
                        />

                        <TextField
                            fullWidth
                            label="설명"
                            value={editModal.formData.description}
                            onChange={(e) => setEditModal({
                                ...editModal,
                                formData: { ...editModal.formData, description: e.target.value }
                            })}
                            multiline
                            rows={3}
                            variant="outlined"
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                fullWidth
                                label="목표 값"
                                value={editModal.formData.target_value}
                                onChange={(e) => setEditModal({
                                    ...editModal,
                                    formData: { ...editModal.formData, target_value: e.target.value }
                                })}
                                variant="outlined"
                                placeholder="예: 20분, 100회, 3라운드"
                            />
                            <TextField
                                fullWidth
                                label="최대 참여자 수"
                                type="number"
                                value={editModal.formData.max_participants}
                                onChange={(e) => {
                                    const value = parseInt(e.target.value);
                                    if (value >= 1 && value <= 100) {
                                        setEditModal({
                                            ...editModal,
                                            formData: { ...editModal.formData, max_participants: value }
                                        });
                                    }
                                }}
                                variant="outlined"
                                inputProps={{ min: 1, max: 100 }}
                            />
                        </Stack>

                        {/* 운동 정보 */}
                        {editModal.formData.selected_exercises.length > 0 && (
                            <Box>
                                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                                    운동 구성
                                </Typography>
                                <Stack spacing={2}>
                                    {editModal.formData.selected_exercises.map((exercise, index) => (
                                        <Paper key={index} variant="outlined" sx={{ p: 2 }}>
                                            <Stack direction="row" alignItems="center" spacing={2}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, minWidth: 120 }}>
                                                    {exercise.name || `운동 ${index + 1}`}
                                                </Typography>
                                                <TextField
                                                    label="목표값"
                                                    value={exercise.target_value}
                                                    onChange={(e) => {
                                                        const newExercises = [...editModal.formData.selected_exercises];
                                                        newExercises[index].target_value = e.target.value;
                                                        setEditModal({
                                                            ...editModal,
                                                            formData: { ...editModal.formData, selected_exercises: newExercises }
                                                        });
                                                    }}
                                                    variant="outlined"
                                                    size="small"
                                                    placeholder="예: 10회, 20분"
                                                />
                                            </Stack>
                                        </Paper>
                                    ))}
                                </Stack>
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                    운동의 목표 값만 수정할 수 있습니다
                                </Typography>
                            </Box>
                        )}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeEditModal} color="secondary">
                        취소
                    </Button>
                    <Button
                        onClick={updateProgram}
                        variant="contained"
                        startIcon={<SaveIcon />}
                        color="primary"
                    >
                        저장
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 삭제 확인 모달 */}
            <Dialog
                open={confirmAlert.open}
                onClose={cancelDelete}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>
                    {confirmAlert.title}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {confirmAlert.message}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={cancelDelete} color="secondary">
                        취소
                    </Button>
                    <Button
                        onClick={deleteProgram}
                        variant="contained"
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        삭제
                    </Button>
                </DialogActions>
            </Dialog>

            {/* 일반 알림 모달 */}
            <Dialog
                open={modal.open}
                onClose={closeModal}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                <DialogTitle sx={{ fontWeight: 600 }}>
                    {modal.title}
                </DialogTitle>
                <DialogContent>
                    <Alert severity={modal.type} sx={{ mb: 2 }}>
                        {modal.msg}
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={closeModal} variant="contained">
                        확인
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MuiMyProgramsPage;
