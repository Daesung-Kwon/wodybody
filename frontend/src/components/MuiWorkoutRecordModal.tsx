import React, { useState } from 'react';
import {
    Dialog, DialogContent, DialogActions,
    TextField, Button, Typography, Box, Stack, Alert, Avatar,
    Switch
} from './common/MuiComponents';
import {
    Save as SaveIcon,
    Timer as TimerIcon,
    Public as PublicIcon,
    Lock as LockIcon,
    CheckCircle as CheckCircleIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { CreateWorkoutRecordRequest } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface MuiWorkoutRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateWorkoutRecordRequest) => void;
    completionTime: number;
    programTitle: string;
    isLoading?: boolean;
}

const MuiWorkoutRecordModal: React.FC<MuiWorkoutRecordModalProps> = ({
    isOpen,
    onClose,
    onSave,
    completionTime,
    programTitle,
    isLoading = false
}) => {
    const { isDarkMode } = useTheme();
    const [notes, setNotes] = useState<string>('');
    const [isPublic, setIsPublic] = useState<boolean>(true);

    const handleSave = () => {
        const data: CreateWorkoutRecordRequest = {
            completion_time: completionTime,
            notes: notes.trim(),
            is_public: isPublic
        };
        onSave(data);
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    return (
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
                    background: 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)',
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
                        <CheckCircleIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                            운동 기록 저장
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            운동 완료를 축하합니다! 🎉
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
                <Stack spacing={3}>
                    {/* 완료 요약 */}
                    <Box sx={{
                        p: 2,
                        bgcolor: 'success.50',
                        borderRadius: 2,
                        border: '1px solid',
                        borderColor: 'success.200'
                    }}>
                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'success.main' }}>
                            🏆 운동 완료 요약
                        </Typography>
                        <Stack spacing={2}>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    프로그램명
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                    {programTitle}
                                </Typography>
                            </Box>
                            <Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                    완료 시간
                                </Typography>
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <TimerIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                                        {formatTime(completionTime)}
                                    </Typography>
                                </Stack>
                            </Box>
                        </Stack>
                    </Box>

                    {/* 메모 입력 */}
                    <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                            메모 (선택사항)
                        </Typography>
                        <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="운동 후 느낌이나 특이사항을 기록해보세요"
                            placeholder="예: 오늘 컨디션이 좋았고, 마지막 라운드에서 힘들었지만 끝까지 완주했다!"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            inputProps={{ maxLength: 500 }}
                            helperText={`${notes.length}/500자`}
                        />
                    </Box>

                    {/* 공개 설정 */}
                    <Box>
                        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                공개 설정
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <LockIcon sx={{
                                    fontSize: 16,
                                    color: isPublic ? 'text.secondary' : (isDarkMode ? '#FFB74D' : '#9E9E9E')
                                }} />
                                <Switch
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    color="success"
                                    sx={{
                                        '& .MuiSwitch-thumb': {
                                            backgroundColor: isPublic ? '#4CAF50' : (isDarkMode ? '#FFB74D' : '#9E9E9E')
                                        },
                                        '& .MuiSwitch-track': {
                                            backgroundColor: isPublic
                                                ? 'rgba(76, 175, 80, 0.5)'
                                                : isDarkMode
                                                    ? 'rgba(255, 183, 77, 0.5)'
                                                    : 'rgba(158, 158, 158, 0.5)'
                                        }
                                    }}
                                />
                                <PublicIcon sx={{
                                    fontSize: 16,
                                    color: isPublic ? 'success.main' : 'text.secondary'
                                }} />
                            </Stack>
                        </Stack>

                        <Box sx={{
                            p: 2,
                            bgcolor: isPublic
                                ? 'success.50'
                                : isDarkMode
                                    ? 'rgba(255, 183, 77, 0.1)'
                                    : 'grey.50',
                            borderRadius: 2,
                            border: '1px solid',
                            borderColor: isPublic
                                ? 'success.200'
                                : isDarkMode
                                    ? 'rgba(255, 183, 77, 0.3)'
                                    : 'grey.200'
                        }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                                {isPublic ? (
                                    <PublicIcon sx={{ fontSize: 16, color: 'success.main' }} />
                                ) : (
                                    <LockIcon sx={{
                                        fontSize: 16,
                                        color: isDarkMode ? '#FFB74D' : 'grey.600'
                                    }} />
                                )}
                                <Typography variant="body1" sx={{
                                    fontWeight: 500,
                                    color: isPublic
                                        ? 'success.main'
                                        : isDarkMode
                                            ? '#FFB74D'
                                            : 'grey.600'
                                }}>
                                    {isPublic ? '다른 사용자에게 기록 공개' : '기록 비공개'}
                                </Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                                {isPublic
                                    ? '다른 사용자들이 이 프로그램의 기록을 볼 수 있습니다.'
                                    : '이 기록은 나만 볼 수 있습니다.'
                                }
                            </Typography>
                        </Box>
                    </Box>

                    {/* 도움말 */}
                    <Alert severity="info" icon={<InfoIcon />} sx={{ borderRadius: 2 }}>
                        <Typography variant="body2">
                            기록을 저장하면 나의 운동 통계와 개인 기록에 반영됩니다.
                        </Typography>
                    </Alert>
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
                        disabled={isLoading}
                        sx={{ flex: 1, borderRadius: 2 }}
                    >
                        취소
                    </Button>
                    <Button
                        onClick={handleSave}
                        variant="contained"
                        color="success"
                        startIcon={<SaveIcon />}
                        disabled={isLoading}
                        sx={{ flex: 1, borderRadius: 2 }}
                    >
                        {isLoading ? '저장 중...' : '기록 저장'}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default MuiWorkoutRecordModal;
