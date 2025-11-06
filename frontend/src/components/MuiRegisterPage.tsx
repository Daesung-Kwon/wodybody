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
    Divider,
    Stepper,
    Step,
    StepLabel,
} from './common/MuiComponents';
import { RegisterPageProps } from '../types';
import { userApi, emailVerificationApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';
import WodyBodyLogo from './WodyBodyLogo';

const MuiRegisterPage: React.FC<RegisterPageProps> = ({ goLogin }) => {
    const { isDarkMode } = useTheme();

    // 단계별 상태
    const [activeStep, setActiveStep] = useState<number>(0);
    const steps = ['이메일 인증', '정보 입력', '완료'];

    // 폼 상태
    const [email, setEmail] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [verificationId, setVerificationId] = useState<number | null>(null);
    const [password, setPassword] = useState<string>('');
    const [name, setName] = useState<string>('');

    // UI 상태
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [emailSent, setEmailSent] = useState<boolean>(false);

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    // Step 1: 이메일 인증번호 전송
    const handleRequestVerification = async () => {
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('올바른 이메일 형식을 입력해주세요.');
            return;
        }

        setBusy(true);
        clearMessages();

        try {
            await emailVerificationApi.requestVerification(email);
            setSuccess('인증번호가 이메일로 전송되었습니다. (10분간 유효)');
            setEmailSent(true);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '인증번호 전송 중 오류가 발생했습니다.';

            if (errorMessage.includes('이미 등록된')) {
                setError('이미 등록된 이메일입니다. 로그인을 진행해주세요.');
            } else {
                setError(errorMessage);
            }
        } finally {
            setBusy(false);
        }
    };

    // Step 2: 인증번호 확인
    const handleVerifyCode = async () => {
        if (!verificationCode.trim() || verificationCode.length !== 6) {
            setError('6자리 인증번호를 입력해주세요.');
            return;
        }

        setBusy(true);
        clearMessages();

        try {
            const response = await emailVerificationApi.verifyCode(email, verificationCode);
            setVerificationId(response.verification_id);
            setSuccess('이메일 인증이 완료되었습니다!');

            setTimeout(() => {
                setActiveStep(1);
                clearMessages();
            }, 1000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '인증번호 확인 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    // Step 3: 회원가입 완료
    const handleRegister = async () => {
        if (!name.trim() || name.trim().length < 2) {
            setError('이름은 2자 이상 입력해주세요.');
            return;
        }
        if (!password || password.length < 6) {
            setError('비밀번호는 6자 이상 입력해주세요.');
            return;
        }
        if (!verificationId) {
            setError('이메일 인증을 먼저 완료해주세요.');
            return;
        }

        setBusy(true);
        clearMessages();

        try {
            await userApi.register({
                email,
                password,
                name,
                verification_id: verificationId
            });
            setSuccess(`${name}님, 회원가입이 완료되었습니다!`);
            setActiveStep(2);

            setTimeout(() => {
                goLogin();
            }, 2000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';
            setError(errorMessage);
        } finally {
            setBusy(false);
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
                        {/* 브랜드 로고 */}
                        <Box sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            mb: 3
                        }}>
                            <WodyBodyLogo variant="detailed" size="large" />
                        </Box>

                        <Typography
                            variant="h5"
                            sx={{
                                textAlign: 'center',
                                mb: 3,
                                fontWeight: 600
                            }}
                        >
                            회원가입
                        </Typography>

                        {/* Stepper */}
                        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                            {steps.map((label) => (
                                <Step key={label}>
                                    <StepLabel>{label}</StepLabel>
                                </Step>
                            ))}
                        </Stepper>

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

                        {/* Step 0: 이메일 인증 */}
                        {activeStep === 0 && (
                            <Stack spacing={3}>
                                <TextField
                                    fullWidth
                                    label="이메일"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={busy || emailSent}
                                    variant="outlined"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                />

                                {!emailSent ? (
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        onClick={handleRequestVerification}
                                        disabled={busy}
                                        sx={{
                                            py: 1.5,
                                            borderRadius: 2,
                                            fontSize: '1.1rem',
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
                                ) : (
                                    <>
                                        <TextField
                                            fullWidth
                                            label="인증번호 (6자리)"
                                            type="text"
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            disabled={busy}
                                            variant="outlined"
                                            inputProps={{ maxLength: 6, inputMode: 'numeric', pattern: '[0-9]*' }}
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
                                                size="large"
                                                onClick={() => {
                                                    setEmailSent(false);
                                                    setVerificationCode('');
                                                    clearMessages();
                                                }}
                                                disabled={busy}
                                                sx={{
                                                    py: 1.5,
                                                    borderRadius: 2,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                다시 전송
                                            </Button>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                onClick={handleVerifyCode}
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
                                                    <CircularProgress size={20} color="inherit" />
                                                ) : (
                                                    '인증 확인'
                                                )}
                                            </Button>
                                        </Stack>
                                    </>
                                )}
                            </Stack>
                        )}

                        {/* Step 1: 정보 입력 */}
                        {activeStep === 1 && (
                            <Stack spacing={3}>
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    이메일 인증이 완료되었습니다. 추가 정보를 입력해주세요.
                                </Alert>

                                <TextField
                                    fullWidth
                                    label="이름"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={busy}
                                    variant="outlined"
                                    helperText="2자 이상 입력해주세요"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label="비밀번호"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={busy}
                                    variant="outlined"
                                    helperText="6자 이상 입력해주세요"
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: 2,
                                        },
                                    }}
                                />

                                <Button
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    onClick={handleRegister}
                                    disabled={busy}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        fontSize: '1.1rem',
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
                                            가입 중...
                                        </Box>
                                    ) : (
                                        '회원가입 완료'
                                    )}
                                </Button>
                            </Stack>
                        )}

                        {/* Step 2: 완료 */}
                        {activeStep === 2 && (
                            <Box sx={{ textAlign: 'center', py: 3 }}>
                                <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                                    🎉 회원가입이 완료되었습니다!
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    로그인 페이지로 이동합니다...
                                </Typography>
                            </Box>
                        )}

                        {/* 구분선 및 로그인 링크 (완료 단계가 아닐 때만 표시) */}
                        {activeStep !== 2 && (
                            <>
                                <Divider sx={{ my: 3 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        또는
                                    </Typography>
                                </Divider>

                                <Box sx={{ textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        이미 계정이 있으신가요?
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        onClick={goLogin}
                                        disabled={busy}
                                        sx={{
                                            borderRadius: 2,
                                            px: 3,
                                            py: 1,
                                            fontWeight: 500,
                                        }}
                                    >
                                        로그인
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default MuiRegisterPage;
