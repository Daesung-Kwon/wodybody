import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Container,
    Stack,
    Alert,
    CircularProgress,
    Stepper,
    Step,
    StepLabel,
} from './common/MuiComponents';
import { passwordResetApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';
import WodyBodyLogo from './WodyBodyLogo';

interface PasswordResetPageProps {
    goLogin: () => void;
}

type ResetStep = 'email' | 'verify' | 'reset';

const MuiPasswordResetPage: React.FC<PasswordResetPageProps> = ({ goLogin }) => {
    const { isDarkMode } = useTheme();

    // 단계 관리
    const [step, setStep] = useState<ResetStep>('email');
    const [activeStepIndex, setActiveStepIndex] = useState(0);

    // 폼 데이터
    const [email, setEmail] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [newPassword, setNewPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');

    // 상태 관리
    const [resetId, setResetId] = useState<number | null>(null);
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const steps = ['이메일 인증', '인증번호 확인', '비밀번호 재설정'];

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    // Step 1: 이메일로 인증번호 전송
    const handleRequestReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        clearMessages();

        try {
            const data = await passwordResetApi.requestReset(email);
            setSuccess(data.message);
            setStep('verify');
            setActiveStepIndex(1);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '인증번호 전송 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    // Step 2: 인증번호 확인
    const handleVerifyCode = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        clearMessages();

        if (verificationCode.length !== 6) {
            setError('인증번호는 6자리입니다.');
            setBusy(false);
            return;
        }

        try {
            const data = await passwordResetApi.verifyCode(email, verificationCode);
            if (data.verified) {
                setResetId(data.reset_id);
                setSuccess(data.message);
                setStep('reset');
                setActiveStepIndex(2);
            } else {
                setError('인증에 실패했습니다.');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '인증번호 확인 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    // Step 3: 비밀번호 재설정
    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        clearMessages();

        // 비밀번호 유효성 검사
        if (newPassword.length < 8) {
            setError('비밀번호는 최소 8자 이상이어야 합니다.');
            setBusy(false);
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('비밀번호가 일치하지 않습니다.');
            setBusy(false);
            return;
        }

        if (!resetId) {
            setError('재설정 정보가 없습니다. 처음부터 다시 시도해주세요.');
            setBusy(false);
            return;
        }

        try {
            const data = await passwordResetApi.resetPassword(email, resetId, newPassword);
            if (data.success) {
                setSuccess(data.message + ' 로그인 화면으로 이동합니다.');
                setTimeout(() => {
                    goLogin();
                }, 2000);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '비밀번호 재설정 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    // 이전 단계로 돌아가기
    const handleBack = () => {
        clearMessages();
        if (step === 'verify') {
            setStep('email');
            setActiveStepIndex(0);
            setVerificationCode('');
        } else if (step === 'reset') {
            setStep('verify');
            setActiveStepIndex(1);
            setNewPassword('');
            setConfirmPassword('');
        }
    };

    return (
        <Container maxWidth="sm">
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 4,
                }}
            >
                <Card
                    sx={{
                        width: '100%',
                        maxWidth: 500,
                        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                        borderRadius: 3,
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* 헤더 */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            mb: 3
                        }}>
                            <WodyBodyLogo variant="detailed" size="medium" />
                        </Box>

                        <Typography variant="h5" align="center" gutterBottom fontWeight={600}>
                            비밀번호 재설정
                        </Typography>

                        {/* 진행 단계 표시 */}
                        <Box sx={{ mb: 4, mt: 3 }}>
                            <Stepper activeStep={activeStepIndex} alternativeLabel>
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Box>

                        {/* 성공 메시지 */}
                        {success && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {success}
                            </Alert>
                        )}

                        {/* 오류 메시지 */}
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        {/* Step 1: 이메일 입력 */}
                        {step === 'email' && (
                            <Box component="form" onSubmit={handleRequestReset}>
                                <Stack spacing={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        가입하신 이메일 주소를 입력하세요. 비밀번호 재설정을 위한 6자리 인증번호를 보내드립니다.
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="이메일"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={busy}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={goLogin}
                                            disabled={busy}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                            }}
                                        >
                                            취소
                                        </Button>
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            disabled={busy}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                                },
                                            }}
                                        >
                                            {busy ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CircularProgress size={20} color="inherit" />
                                                    전송 중...
                                                </Box>
                                            ) : (
                                                '인증번호 전송'
                                            )}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        )}

                        {/* Step 2: 인증번호 입력 */}
                        {step === 'verify' && (
                            <Box component="form" onSubmit={handleVerifyCode}>
                                <Stack spacing={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        {email}로 전송된 6자리 인증번호를 입력하세요.
                                        <br />
                                        (인증번호는 10분간 유효합니다)
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="인증번호 (6자리)"
                                        value={verificationCode}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setVerificationCode(value);
                                        }}
                                        required
                                        disabled={busy}
                                        variant="outlined"
                                        inputProps={{
                                            maxLength: 6,
                                            pattern: '[0-9]{6}',
                                            inputMode: 'numeric'
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                            '& input': {
                                                fontSize: '1.5rem',
                                                letterSpacing: '0.5rem',
                                                textAlign: 'center',
                                                fontWeight: 600,
                                            }
                                        }}
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={handleBack}
                                            disabled={busy}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                            }}
                                        >
                                            이전
                                        </Button>
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            disabled={busy || verificationCode.length !== 6}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                                },
                                            }}
                                        >
                                            {busy ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CircularProgress size={20} color="inherit" />
                                                    확인 중...
                                                </Box>
                                            ) : (
                                                '인증 확인'
                                            )}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        )}

                        {/* Step 3: 새 비밀번호 입력 */}
                        {step === 'reset' && (
                            <Box component="form" onSubmit={handleResetPassword}>
                                <Stack spacing={3}>
                                    <Typography variant="body2" color="text.secondary">
                                        새로운 비밀번호를 설정하세요.
                                        <br />
                                        (최소 8자 이상)
                                    </Typography>
                                    <TextField
                                        fullWidth
                                        label="새 비밀번호"
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                        disabled={busy}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                    <TextField
                                        fullWidth
                                        label="비밀번호 확인"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        disabled={busy}
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                            },
                                        }}
                                    />
                                    <Stack direction="row" spacing={2}>
                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            onClick={handleBack}
                                            disabled={busy}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                            }}
                                        >
                                            이전
                                        </Button>
                                        <Button
                                            type="submit"
                                            fullWidth
                                            variant="contained"
                                            disabled={busy}
                                            sx={{
                                                py: 1.5,
                                                borderRadius: 2,
                                                fontWeight: 600,
                                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                                },
                                            }}
                                        >
                                            {busy ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <CircularProgress size={20} color="inherit" />
                                                    재설정 중...
                                                </Box>
                                            ) : (
                                                '비밀번호 재설정'
                                            )}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default MuiPasswordResetPage;

