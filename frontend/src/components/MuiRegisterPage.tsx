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
} from './common/MuiComponents';
import { RegisterPageProps } from '../types';
import { userApi } from '../utils/api';
import { useTheme } from '../theme/ThemeProvider';
import WodyBodyLogo from './WodyBodyLogo';

const MuiRegisterPage: React.FC<RegisterPageProps> = ({ goLogin }) => {
    const { isDarkMode } = useTheme();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [name, setName] = useState<string>('');
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const validate = (): boolean => {
        if (!name.trim() || name.trim().length < 2) {
            setError('이름은 2자 이상 입력해주세요.');
            return false;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('올바른 이메일 형식을 입력해주세요.');
            return false;
        }
        if (!password || password.length < 6) {
            setError('비밀번호는 6자 이상 입력해주세요.');
            return false;
        }
        return true;
    };

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;
        setBusy(true);
        clearMessages();

        try {
            await userApi.register({ email, password, name });
            setSuccess(`${name}님, 회원가입이 완료되었습니다.`);

            setTimeout(() => {
                goLogin();
            }, 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';

            if (errorMessage.includes('이미 등록된')) {
                setError('이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.');
            } else if (errorMessage.includes('Failed to fetch')) {
                setError('서버와의 연결에 실패했습니다.');
            } else {
                setError(errorMessage);
            }
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
                        maxWidth: 400,
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
                            mb: 4
                        }}>
                            <WodyBodyLogo variant="detailed" size="large" />
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

                        {/* 회원가입 폼 */}
                        <Box component="form" onSubmit={submit} sx={{ mb: 3 }}>
                            <Stack spacing={3}>
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
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
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
                                            회원가입 중...
                                        </Box>
                                    ) : (
                                        '회원가입'
                                    )}
                                </Button>
                            </Stack>
                        </Box>

                        {/* 구분선 */}
                        <Divider sx={{ my: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                                또는
                            </Typography>
                        </Divider>

                        {/* 로그인 링크 */}
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
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default MuiRegisterPage;
