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
import { LoginPageProps, User } from '../types';
import { userApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import WodyBodyLogo from './WodyBodyLogo';

const MuiLoginPage: React.FC<LoginPageProps> = ({ setUser, goRegister, goPrograms }) => {
    const { setUser: setAuthUser } = useAuth();
    const { isDarkMode } = useTheme();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [busy, setBusy] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');

    const clearMessages = () => {
        setError('');
        setSuccess('');
    };

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);
        clearMessages();

        try {
            const data = await userApi.login({ email, password });

            // 토큰 저장 확인 (타이밍 이슈 방지)
            await new Promise(resolve => setTimeout(resolve, 100));
            const token = localStorage.getItem('access_token');
            console.log('[Login] Token saved:', token ? 'Yes' : 'No');

            if (!token) {
                console.warn('[Login] Token not saved, waiting...');
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const user: User = {
                id: data.user_id,
                email,
                name: data.name || ''
            };

            setAuthUser(user);
            setUser(user); // 기존 호환성을 위해 유지
            setSuccess(`${data.name || email}님, 환영합니다!`);

            setTimeout(() => {
                goPrograms();
            }, 1500);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';

            if (errorMessage.includes('이메일과 비밀번호가 필요합니다')) {
                setError('이메일과 비밀번호를 모두 입력해주세요.');
            } else if (errorMessage.includes('잘못된 인증정보')) {
                setError('이메일 또는 비밀번호가 올바르지 않습니다.');
            } else if (errorMessage.includes('등록되지 않은 이메일')) {
                setError('등록되지 않은 이메일입니다. 회원가입을 진행해주세요.');
            } else if (errorMessage.includes('Failed to fetch')) {
                setError('서버와의 연결에 실패했습니다. 네트워크를 확인하세요.');
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
                        {/* 헤더 */}
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

                        {/* 로그인 폼 */}
                        <Box component="form" onSubmit={submit} sx={{ mb: 3 }}>
                            <Stack spacing={3}>
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
                                            로그인 중...
                                        </Box>
                                    ) : (
                                        '로그인'
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

                        {/* 회원가입 링크 */}
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                계정이 없으신가요?
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={goRegister}
                                disabled={busy}
                                sx={{
                                    borderRadius: 2,
                                    px: 3,
                                    py: 1,
                                    fontWeight: 500,
                                }}
                            >
                                회원가입
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default MuiLoginPage;
