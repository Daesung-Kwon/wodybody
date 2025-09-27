import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Typography, Box, Stack, Alert, Chip, Avatar, Divider
} from './common/MuiComponents';
import {
    Flag as TargetIcon,
    Save as SaveIcon,
    Cancel as CancelIcon,
    Timer as TimerIcon,
    TrendingUp as TrendingUpIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { CreateGoalRequest } from '../types';
import { personalGoalsApi } from '../utils/api';
import MuiAlertDialog from './MuiAlertDialog';
import { useTheme } from '../theme/ThemeProvider';

interface MuiGoalSettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    programId: number;
    programTitle: string;
    currentBestTime?: number;
}

const MuiGoalSettingModal: React.FC<MuiGoalSettingModalProps> = ({
    isOpen,
    onClose,
    onSave,
    programId,
    programTitle,
    currentBestTime = 0
}) => {
    const { isDarkMode } = useTheme();
    const [targetTime, setTargetTime] = useState<number>(0);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [timeInput, setTimeInput] = useState<string>('');
    const [alertDialog, setAlertDialog] = useState<{
        open: boolean;
        title?: string;
        message: string;
        type?: 'success' | 'error' | 'warning' | 'info';
    }>({
        open: false,
        message: ''
    });

    useEffect(() => {
        if (isOpen) {
            // 현재 최고 기록의 90%를 기본 목표로 설정
            const suggestedTime = currentBestTime > 0 ? Math.max(1, Math.floor(currentBestTime * 0.9)) : 300; // 5분 기본값
            setTargetTime(suggestedTime);
            setTimeInput(formatTimeInput(suggestedTime));
        }
    }, [isOpen, currentBestTime]);

    const formatTimeInput = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const parseTimeInput = (input: string): number => {
        const parts = input.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
        return 0;
    };

    const handleTimeInputChange = (value: string) => {
        setTimeInput(value);
        const parsedTime = parseTimeInput(value);
        setTargetTime(parsedTime);
    };

    const handleSave = async () => {
        if (targetTime <= 0) {
            setAlertDialog({
                open: true,
                title: '입력 오류',
                message: '목표 시간을 올바르게 입력해주세요.',
                type: 'warning'
            });
            return;
        }

        setIsSaving(true);
        try {
            const goalData: CreateGoalRequest = {
                program_id: programId,
                target_time: targetTime
            };

            await personalGoalsApi.createGoal(goalData);
            onSave();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '목표 설정 실패';
            setAlertDialog({
                open: true,
                title: '목표 설정 실패',
                message: `목표 설정 중 오류가 발생했습니다: ${errorMessage}`,
                type: 'error'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    const getImprovementPercentage = (): number => {
        if (currentBestTime <= 0) return 0;
        return Math.round(((currentBestTime - targetTime) / currentBestTime) * 100);
    };

    const improvementPercentage = getImprovementPercentage();

    return (
        <>
            <Dialog
                open={isOpen}
                onClose={onClose}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        backgroundImage: 'none',
                        backgroundColor: isDarkMode ? 'background.paper' : 'white',
                    }
                }}
            >
                {/* 헤더 */}
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

                    <Stack direction="row" alignItems="center" spacing={2} sx={{ position: 'relative', zIndex: 1 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255, 255, 255, 0.2)' }}>
                            <TargetIcon />
                        </Avatar>
                        <Box>
                            <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                                목표 설정
                            </Typography>
                            <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                {programTitle}
                            </Typography>
                        </Box>
                    </Stack>
                </Box>

                <DialogContent sx={{ p: 3 }}>
                    <Stack spacing={3}>
                        {/* 현재 기록 정보 */}
                        {currentBestTime > 0 && (
                            <Alert
                                severity="info"
                                icon={<TimerIcon />}
                                sx={{ borderRadius: 2 }}
                            >
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    현재 최고 기록: {formatTime(currentBestTime)}
                                </Typography>
                            </Alert>
                        )}

                        {/* 목표 시간 입력 */}
                        <Box>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TargetIcon />
                                목표 시간 설정
                            </Typography>

                            <TextField
                                fullWidth
                                label="목표 시간 (분:초)"
                                placeholder="예: 5:30"
                                value={timeInput}
                                onChange={(e) => handleTimeInputChange(e.target.value)}
                                helperText="분:초 형식으로 입력해주세요 (예: 5:30)"
                                sx={{ mb: 2 }}
                            />

                            {/* 개선도 표시 */}
                            {currentBestTime > 0 && targetTime > 0 && (
                                <Box sx={{
                                    p: 2,
                                    bgcolor: isDarkMode ? 'grey.800' : 'grey.50',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: isDarkMode ? 'grey.700' : 'grey.200'
                                }}>
                                    <Stack direction="row" alignItems="center" spacing={2}>
                                        {improvementPercentage > 0 ? (
                                            <TrendingUpIcon sx={{ color: 'success.main' }} />
                                        ) : improvementPercentage < 0 ? (
                                            <TrendingUpIcon sx={{ color: 'error.main', transform: 'rotate(180deg)' }} />
                                        ) : (
                                            <CheckCircleIcon sx={{ color: 'info.main' }} />
                                        )}
                                        <Typography variant="body2" sx={{
                                            color: improvementPercentage > 0 ? 'success.main' :
                                                improvementPercentage < 0 ? 'error.main' : 'info.main',
                                            fontWeight: 600
                                        }}>
                                            {improvementPercentage > 0
                                                ? `현재 기록 대비 ${improvementPercentage}% 단축 목표`
                                                : improvementPercentage < 0
                                                    ? `현재 기록 대비 ${Math.abs(improvementPercentage)}% 증가`
                                                    : '현재 기록과 동일한 목표'
                                            }
                                        </Typography>
                                    </Stack>
                                </Box>
                            )}
                        </Box>


                        {/* 목표 요약 */}
                        <Box sx={{
                            p: 2,
                            bgcolor: 'primary.50',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: 'primary.200'
                        }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                                📋 목표 요약
                            </Typography>
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    <strong>프로그램:</strong> {programTitle}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>목표 시간:</strong> {formatTime(targetTime)}
                                </Typography>
                            </Stack>
                        </Box>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{
                    p: 3,
                    backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
                    borderTop: '1px solid',
                    borderColor: isDarkMode ? 'grey.700' : 'grey.200',
                }}>
                    <Stack direction="row" spacing={2} width="100%">
                        <Button
                            onClick={onClose}
                            variant="outlined"
                            disabled={isSaving}
                            sx={{ flex: 1, borderRadius: 2 }}
                        >
                            취소
                        </Button>
                        <Button
                            onClick={handleSave}
                            variant="contained"
                            startIcon={<SaveIcon />}
                            disabled={isSaving || targetTime <= 0}
                            sx={{ flex: 1, borderRadius: 2 }}
                        >
                            {isSaving ? '저장 중...' : '목표 설정'}
                        </Button>
                    </Stack>
                </DialogActions>
            </Dialog>

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

export default MuiGoalSettingModal;
