import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Container,
    Stack,
    Button,
    Alert,
    Chip,
    Divider,
    Paper,
} from './common/MuiComponents';
import { useTheme } from '../theme/ThemeProvider';
import SecureKeypad from './SecureKeypad';

const SecureKeypadDemo: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [pin, setPin] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [verificationCode, setVerificationCode] = useState<string>('');
    const [showResult, setShowResult] = useState(false);

    const handleSubmit = () => {
        setShowResult(true);
        setTimeout(() => setShowResult(false), 3000);
    };

    const resetAll = () => {
        setPin('');
        setPassword('');
        setVerificationCode('');
        setShowResult(false);
    };

    return (
        <Container maxWidth="md">
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
                        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.1)',
                        borderRadius: 3,
                    }}
                >
                    <CardContent sx={{ p: 4 }}>
                        {/* 헤더 */}
                        <Box sx={{ textAlign: 'center', mb: 4 }}>
                            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                                🔒 보안 키패드 데모
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                금융권 수준의 보안 입력 시스템
                            </Typography>
                        </Box>

                        {/* 기능 소개 */}
                        <Paper
                            elevation={0}
                            sx={{
                                p: 3,
                                mb: 4,
                                backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                                borderRadius: 2,
                                border: `1px solid ${isDarkMode ? 'rgba(33, 150, 243, 0.3)' : 'rgba(33, 150, 243, 0.2)'}`,
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                주요 보안 기능
                            </Typography>
                            <Stack spacing={1}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip label="1" size="small" color="primary" />
                                    <Typography variant="body2">
                                        <strong>무작위 숫자 배치:</strong> 매번 키패드를 열 때마다 숫자 위치가 랜덤하게 변경
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip label="2" size="small" color="primary" />
                                    <Typography variant="body2">
                                        <strong>키로거 방지:</strong> 키보드 입력이 아닌 마우스/터치 클릭으로만 입력
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip label="3" size="small" color="primary" />
                                    <Typography variant="body2">
                                        <strong>입력 마스킹:</strong> 입력된 값은 ● 문자로 표시되어 화면 녹화 방지
                                    </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Chip label="4" size="small" color="primary" />
                                    <Typography variant="body2">
                                        <strong>암호화 전송:</strong> 입력 값이 안전하게 암호화되어 서버로 전송
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>

                        {/* 결과 표시 */}
                        {showResult && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                    ✅ 입력이 완료되었습니다!
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block' }}>
                                    PIN: {pin ? '●'.repeat(pin.length) : '없음'} |
                                    비밀번호: {password ? '●'.repeat(password.length) : '없음'} |
                                    인증코드: {verificationCode ? '●'.repeat(verificationCode.length) : '없음'}
                                </Typography>
                            </Alert>
                        )}

                        {/* 데모 입력 필드들 */}
                        <Stack spacing={3}>
                            {/* PIN 입력 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    1. PIN 번호 입력 (4-6자리)
                                </Typography>
                                <SecureKeypad
                                    label="PIN 번호"
                                    value={pin}
                                    onChange={setPin}
                                    maxLength={6}
                                />
                            </Box>

                            <Divider />

                            {/* 비밀번호 입력 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    2. 비밀번호 입력
                                </Typography>
                                <SecureKeypad
                                    label="비밀번호"
                                    value={password}
                                    onChange={setPassword}
                                    maxLength={20}
                                />
                            </Box>

                            <Divider />

                            {/* 인증코드 입력 */}
                            <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                    3. 인증코드 입력 (6자리)
                                </Typography>
                                <SecureKeypad
                                    label="인증코드"
                                    value={verificationCode}
                                    onChange={setVerificationCode}
                                    maxLength={6}
                                />
                            </Box>
                        </Stack>

                        {/* 액션 버튼들 */}
                        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                            <Button
                                fullWidth
                                variant="outlined"
                                onClick={resetAll}
                                sx={{
                                    py: 1.5,
                                    borderRadius: 2,
                                    fontWeight: 600,
                                }}
                            >
                                전체 초기화
                            </Button>
                            <Button
                                fullWidth
                                variant="contained"
                                onClick={handleSubmit}
                                disabled={!pin && !password && !verificationCode}
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
                                제출하기
                            </Button>
                        </Box>

                        {/* 사용 사례 */}
                        <Paper
                            elevation={0}
                            sx={{
                                mt: 4,
                                p: 3,
                                backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                                borderRadius: 2,
                                border: `1px solid ${isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#4caf50' }}>
                                💡 추천 사용 사례
                            </Typography>
                            <Stack spacing={1}>
                                <Typography variant="body2">
                                    • 금융 서비스: 계좌 비밀번호, 이체 인증, 카드 PIN
                                </Typography>
                                <Typography variant="body2">
                                    • 의료 시스템: 환자 정보 접근, 전자 처방전
                                </Typography>
                                <Typography variant="body2">
                                    • 기업 보안: 관리자 로그인, 민감 데이터 접근
                                </Typography>
                                <Typography variant="body2">
                                    • 공공 키오스크: 민원 서비스, 무인 발급기
                                </Typography>
                                <Typography variant="body2">
                                    • 전자상거래: 결제 비밀번호, 본인 인증
                                </Typography>
                            </Stack>
                        </Paper>

                        {/* 기술 스택 */}
                        <Box sx={{ mt: 4, textAlign: 'center' }}>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                기술 스택
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label="React" size="small" variant="outlined" />
                                <Chip label="TypeScript" size="small" variant="outlined" />
                                <Chip label="Material-UI" size="small" variant="outlined" />
                                <Chip label="Fisher-Yates Algorithm" size="small" variant="outlined" />
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
        </Container>
    );
};

export default SecureKeypadDemo;

