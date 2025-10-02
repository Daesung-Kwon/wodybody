import React, { useState } from 'react';
import {
    Box, Typography, Button, Stack, Paper, TextField, Switch, FormControlLabel,
    IconButton, Tooltip, Chip, Avatar, Alert
} from './common/MuiComponents';
import {
    Edit as EditIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Delete as DeleteIcon,
    Public as PublicIcon,
    Lock as LockIcon,
    CheckCircle as CheckCircleIcon,
    AccessTime as AccessTimeIcon,
    CalendarToday as CalendarTodayIcon,
    TrendingUp as TrendingUpIcon,
    TrendingDown as TrendingDownIcon,
    Flag as TargetIcon
} from '@mui/icons-material';
import { WorkoutRecord, PersonalGoal, UpdateWorkoutRecordRequest } from '../types';
import { workoutRecordsApi } from '../utils/api';
import MuiAlertDialog from './MuiAlertDialog';
import { useTheme } from '../theme/ThemeProvider';

interface MuiRecordCardProps {
    record: WorkoutRecord;
    goal?: PersonalGoal;
    onUpdated?: () => void;
}

const MuiRecordCard: React.FC<MuiRecordCardProps> = ({ record, goal, onUpdated }) => {
    const { isDarkMode } = useTheme();
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editData, setEditData] = useState<UpdateWorkoutRecordRequest>({
        completion_time: record.completion_time,
        notes: record.notes,
        is_public: record.is_public
    });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [alertDialog, setAlertDialog] = useState<{
        open: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: ''
    });

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getGoalStatus = (): { status: 'achieved' | 'missed' | 'none'; message: string } => {
        if (!goal) return { status: 'none', message: '' };

        if (record.completion_time <= goal.target_time) {
            return {
                status: 'achieved',
                message: `🎉 목표 달성! (목표: ${formatTime(goal.target_time)})`
            };
        } else {
            const diff = record.completion_time - goal.target_time;
            return {
                status: 'missed',
                message: `목표 미달성 (${formatTime(diff)} 초과)`
            };
        }
    };

    const handleEdit = () => {
        setIsEditing(true);
        setEditData({
            completion_time: record.completion_time,
            notes: record.notes,
            is_public: record.is_public
        });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditData({
            completion_time: record.completion_time,
            notes: record.notes,
            is_public: record.is_public
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await workoutRecordsApi.updateRecord(record.id, editData);
            setIsEditing(false);
            if (onUpdated) onUpdated();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 수정 실패';
            setAlertDialog({
                open: true,
                title: '수정 실패',
                message: `기록 수정 중 오류가 발생했습니다: ${errorMessage}`,
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('이 기록을 삭제하시겠습니까?')) return;

        setIsDeleting(true);
        try {
            await workoutRecordsApi.deleteRecord(record.id);
            if (onUpdated) onUpdated();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 삭제 실패';
            setAlertDialog({
                open: true,
                title: '삭제 실패',
                message: `기록 삭제 중 오류가 발생했습니다: ${errorMessage}`,
                type: 'error'
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const goalStatus = getGoalStatus();

    return (
        <>
            <Paper
                sx={{
                    p: 2,
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                    backgroundColor: isDarkMode ? 'grey.800' : 'white',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                        boxShadow: isDarkMode ? '0 4px 12px rgba(0, 0, 0, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
                    }
                }}
            >
                {isEditing ? (
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                            기록 수정
                        </Typography>

                        <Stack spacing={2}>
                            <TextField
                                label="완료 시간 (초)"
                                type="number"
                                value={editData.completion_time || ''}
                                onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    completion_time: parseInt(e.target.value) || 0
                                }))}
                                size="small"
                                fullWidth
                            />

                            <TextField
                                label="메모"
                                multiline
                                rows={2}
                                value={editData.notes || ''}
                                onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    notes: e.target.value
                                }))}
                                size="small"
                                fullWidth
                            />

                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={editData.is_public}
                                        onChange={(e) => setEditData(prev => ({
                                            ...prev,
                                            is_public: e.target.checked
                                        }))}
                                    />
                                }
                                label="공개"
                            />

                            <Stack direction="row" spacing={1}>
                                <Button
                                    variant="contained"
                                    size="small"
                                    startIcon={<SaveIcon />}
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    sx={{ flex: 1 }}
                                >
                                    {isSaving ? '저장 중...' : '저장'}
                                </Button>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<CancelIcon />}
                                    onClick={handleCancel}
                                    disabled={isSaving}
                                    sx={{ flex: 1 }}
                                >
                                    취소
                                </Button>
                            </Stack>
                        </Stack>
                    </Box>
                ) : (
                    <Box>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Avatar sx={{
                                    width: 24,
                                    height: 24,
                                    bgcolor: 'primary.main',
                                    fontSize: '0.75rem'
                                }}>
                                    <AccessTimeIcon sx={{ fontSize: 12 }} />
                                </Avatar>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {formatTime(record.completion_time)}
                                </Typography>
                            </Stack>

                            <Stack direction="row" spacing={0.5}>
                                <Tooltip title="수정">
                                    <IconButton size="small" onClick={handleEdit}>
                                        <EditIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="삭제">
                                    <IconButton
                                        size="small"
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        color="error"
                                    >
                                        <DeleteIcon sx={{ fontSize: 16 }} />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>

                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                            <CalendarTodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {formatDate(record.completed_at)}
                            </Typography>

                            {record.is_public ? (
                                <Chip
                                    icon={<PublicIcon />}
                                    label="공개"
                                    size="small"
                                    color="success"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            ) : (
                                <Chip
                                    icon={<LockIcon />}
                                    label="비공개"
                                    size="small"
                                    color="default"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />
                            )}
                        </Stack>

                        {record.notes && (
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="body2" sx={{
                                    fontStyle: 'italic',
                                    color: 'text.secondary',
                                    backgroundColor: isDarkMode ? 'grey.700' : 'grey.50',
                                    p: 1,
                                    borderRadius: 1,
                                    border: '1px solid',
                                    borderColor: isDarkMode ? 'grey.600' : 'grey.200'
                                }}>
                                    "{record.notes}"
                                </Typography>
                            </Box>
                        )}

                        {goalStatus.status !== 'none' && (
                            <Alert
                                severity={goalStatus.status === 'achieved' ? 'success' : 'warning'}
                                icon={goalStatus.status === 'achieved' ? <CheckCircleIcon /> : <TargetIcon />}
                                sx={{
                                    mt: 1,
                                    '& .MuiAlert-message': {
                                        fontSize: '0.75rem'
                                    }
                                }}
                            >
                                {goalStatus.message}
                            </Alert>
                        )}
                    </Box>
                )}
            </Paper>

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

export default MuiRecordCard;
