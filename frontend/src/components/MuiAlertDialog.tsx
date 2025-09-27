import React from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box, Stack, Alert
} from './common/MuiComponents';
import {
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

interface MuiAlertDialogProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    confirmText?: string;
    showCancel?: boolean;
    cancelText?: string;
}

const MuiAlertDialog: React.FC<MuiAlertDialogProps> = ({
    open,
    onClose,
    title,
    message,
    type = 'info',
    confirmText = '확인',
    showCancel = false,
    cancelText = '취소'
}) => {
    const { isDarkMode } = useTheme();

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon sx={{ color: 'success.main' }} />;
            case 'error':
                return <ErrorIcon sx={{ color: 'error.main' }} />;
            case 'warning':
                return <WarningIcon sx={{ color: 'warning.main' }} />;
            default:
                return <InfoIcon sx={{ color: 'info.main' }} />;
        }
    };

    const getSeverity = (): 'success' | 'error' | 'warning' | 'info' => {
        return type;
    };

    return (
        <Dialog
            open={open}
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
                    background: type === 'success'
                        ? 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'
                        : type === 'error'
                            ? 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)'
                            : type === 'warning'
                                ? 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)'
                                : 'linear-gradient(135deg, #2196F3 0%, #42A5F5 100%)',
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
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {getIcon()}
                    </Box>
                    <Box>
                        <Typography variant="h6" component="h1" sx={{ fontWeight: 700 }}>
                            {title || (type === 'success' ? '성공' : type === 'error' ? '오류' : type === 'warning' ? '경고' : '알림')}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                            {type === 'success' ? '작업이 완료되었습니다' : '확인해주세요'}
                        </Typography>
                    </Box>
                </Stack>
            </Box>

            <DialogContent sx={{ p: 3 }}>
                <Alert severity={getSeverity()} sx={{ borderRadius: 2 }}>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                        {message}
                    </Typography>
                </Alert>
            </DialogContent>

            <DialogActions sx={{
                p: 3,
                backgroundColor: isDarkMode ? 'grey.900' : 'grey.50',
                borderTop: '1px solid',
                borderColor: isDarkMode ? 'grey.700' : 'grey.200',
            }}>
                <Stack direction="row" spacing={2} width="100%" justifyContent="flex-end">
                    {showCancel && (
                        <Button
                            onClick={onClose}
                            variant="outlined"
                            sx={{ borderRadius: 2 }}
                        >
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        onClick={onClose}
                        variant="contained"
                        color={type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'primary'}
                        sx={{ borderRadius: 2 }}
                    >
                        {confirmText}
                    </Button>
                </Stack>
            </DialogActions>
        </Dialog>
    );
};

export default MuiAlertDialog;
