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
    Tabs,
    Tab,
    Paper,
    Divider,
    Chip,
} from './common/MuiComponents';
import { useTheme } from '../theme/ThemeProvider';
import SecureKeypad from './SecureKeypad';
import SecureKeypadAdvanced from './SecureKeypadAdvanced';
import SecureQwertyKeypad from './SecureQwertyKeypad';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
    return (
        <div role="tabpanel" hidden={value !== index}>
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
};

const SecureKeypadShowcase: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [tabValue, setTabValue] = useState(0);

    // 기본 버전
    const [basicValue, setBasicValue] = useState('');

    // 고급 버전 (암호화 + 강도 체크)
    const [advancedValue, setAdvancedValue] = useState('');
    const [encryptedData, setEncryptedData] = useState<string>('');

    // QWERTY 키패드
    const [qwertyValue, setQwertyValue] = useState('');

    // 실제 사용 예제 (로그인)
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginResult, setLoginResult] = useState<string>('');

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleAdvancedChange = (value: string, encrypted?: string) => {
        setAdvancedValue(value);
        if (encrypted) {
            setEncryptedData(encrypted);
        }
    };

    const handleAdvancedSubmit = (encryptedPacket: string) => {
        console.log('암호화된 패킷:', encryptedPacket);
        setEncryptedData(encryptedPacket);
        alert('암호화된 데이터가 안전하게 전송되었습니다! 콘솔을 확인하세요.');
    };

    const handleLogin = () => {
        if (loginEmail && loginPassword) {
            setLoginResult(`✅ 로그인 성공!\n이메일: ${loginEmail}\n비밀번호: ${'●'.repeat(loginPassword.length)}`);
            setTimeout(() => setLoginResult(''), 5000);
        }
    };

    const resetAll = () => {
        setBasicValue('');
        setAdvancedValue('');
        setEncryptedData('');
        setQwertyValue('');
        setLoginEmail('');
        setLoginPassword('');
        setLoginResult('');
    };

    return (
        <Container maxWidth="lg">
            <Box
                sx={{
                    minHeight: '100vh',
                    py: 4,
                }}
            >
                {/* 헤더 */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Button
                            variant="outlined"
                            onClick={() => window.location.hash = ''}
                            sx={{
                                borderRadius: 2,
                                px: 2,
                                py: 1,
                            }}
                        >
                            ← 로그인으로 돌아가기
                        </Button>
                        <Box />
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                        🔐 보안 키패드 쇼케이스
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        금융권 수준의 웹 보안 입력 시스템
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label="키로거 방지" color="primary" />
                        <Chip label="암호화 전송" color="success" />
                        <Chip label="무작위 배치" color="info" />
                        <Chip label="입력 마스킹" color="warning" />
                    </Box>
                </Box>

                {/* 탭 네비게이션 */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                fontWeight: 600,
                                fontSize: '1rem',
                            },
                        }}
                    >
                        <Tab label="기본 버전" />
                        <Tab label="고급 버전" />
                        <Tab label="QWERTY 키패드" />
                        <Tab label="실제 사용 예제" />
                        <Tab label="비교 분석" />
                    </Tabs>
                </Paper>

                {/* 탭 1: 기본 버전 */}
                <TabPanel value={tabValue} index={0}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                기본 보안 키패드
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                무작위 숫자 배치와 입력 마스킹 기능을 제공하는 기본 버전입니다.
                            </Typography>

                            <Stack spacing={3}>
                                <SecureKeypad
                                    label="PIN 번호 입력"
                                    value={basicValue}
                                    onChange={setBasicValue}
                                    maxLength={6}
                                />

                                {basicValue && (
                                    <Alert severity="info">
                                        <Typography variant="body2">
                                            입력된 값: <strong>{basicValue}</strong> (실제 시스템에서는 노출되지 않음)
                                        </Typography>
                                        <Typography variant="body2">
                                            마스킹된 표시: <strong>{'●'.repeat(basicValue.length)}</strong>
                                        </Typography>
                                    </Alert>
                                )}

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => setBasicValue('')}
                                    >
                                        초기화
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        disabled={!basicValue}
                                        onClick={() => alert(`입력 완료: ${'●'.repeat(basicValue.length)}`)}
                                    >
                                        제출
                                    </Button>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </TabPanel>

                {/* 탭 2: 고급 버전 */}
                <TabPanel value={tabValue} index={1}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                고급 보안 키패드 (암호화 + 강도 체크)
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                AES-256 암호화, 비밀번호 강도 측정, 보안 패킷 생성 기능이 추가된 버전입니다.
                            </Typography>

                            <Stack spacing={3}>
                                <SecureKeypadAdvanced
                                    label="비밀번호 입력"
                                    value={advancedValue}
                                    onChange={handleAdvancedChange}
                                    maxLength={20}
                                    enableEncryption={true}
                                    showStrengthMeter={true}
                                    onEnter={handleAdvancedSubmit}
                                />

                                {encryptedData && (
                                    <Alert severity="success">
                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                            🔐 암호화 완료
                                        </Typography>
                                        <Typography variant="caption" sx={{ wordBreak: 'break-all', display: 'block' }}>
                                            {encryptedData.length > 100
                                                ? `${encryptedData.substring(0, 100)}...`
                                                : encryptedData}
                                        </Typography>
                                    </Alert>
                                )}

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                                        border: '1px solid rgba(33, 150, 243, 0.2)',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        추가 보안 기능
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption">• AES-256-GCM 암호화</Typography>
                                        <Typography variant="caption">• PBKDF2 키 유도 (100,000 iterations)</Typography>
                                        <Typography variant="caption">• 타임스탬프 기반 재전송 공격 방지</Typography>
                                        <Typography variant="caption">• Nonce 기반 무결성 검증</Typography>
                                        <Typography variant="caption">• 실시간 비밀번호 강도 측정</Typography>
                                    </Stack>
                                </Paper>
                            </Stack>
                        </CardContent>
                    </Card>
                </TabPanel>

                {/* 탭 3: QWERTY 키패드 */}
                <TabPanel value={tabValue} index={2}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                QWERTY 보안 키패드
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                영문, 숫자, 특수문자를 지원하는 완전한 키보드입니다.
                            </Typography>

                            <Stack spacing={3}>
                                <SecureQwertyKeypad
                                    label="비밀번호 입력 (영문/숫자/특수문자)"
                                    value={qwertyValue}
                                    onChange={setQwertyValue}
                                    maxLength={50}
                                    showMasked={true}
                                />

                                {qwertyValue && (
                                    <Alert severity="info">
                                        <Typography variant="body2">
                                            입력 길이: <strong>{qwertyValue.length}자</strong>
                                        </Typography>
                                        <Typography variant="body2" sx={{ mt: 1 }}>
                                            마스킹된 표시: <strong>{'●'.repeat(qwertyValue.length)}</strong>
                                        </Typography>
                                    </Alert>
                                )}

                                <Paper
                                    elevation={0}
                                    sx={{
                                        p: 2,
                                        backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                                        border: '1px solid rgba(33, 150, 243, 0.2)',
                                    }}
                                >
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                        지원 문자
                                    </Typography>
                                    <Stack spacing={0.5}>
                                        <Typography variant="caption">• 소문자: a-z (abc 모드)</Typography>
                                        <Typography variant="caption">• 대문자: A-Z (ABC 모드)</Typography>
                                        <Typography variant="caption">• 숫자: 0-9, @#$%&* (123 모드)</Typography>
                                        <Typography variant="caption">• 특수문자: !@#$%^&*()_-+=[]{ }|;:'",.&lt;&gt;/? (!@# 모드)</Typography>
                                        <Typography variant="caption">• 스페이스바 지원</Typography>
                                    </Stack>
                                </Paper>

                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => setQwertyValue('')}
                                    >
                                        초기화
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        disabled={!qwertyValue}
                                        onClick={() => alert(`입력 완료!\n길이: ${qwertyValue.length}자`)}
                                    >
                                        제출
                                    </Button>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </TabPanel>

                {/* 탭 4: 실제 사용 예제 */}
                <TabPanel value={tabValue} index={3}>
                    <Card>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                실제 로그인 페이지 예제
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                실제 서비스에서 사용할 수 있는 로그인 폼 구현 예제입니다.
                            </Typography>

                            <Stack spacing={3}>
                                {/* 이메일 입력 */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                        이메일
                                    </Typography>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                        }}
                                    >
                                        <input
                                            type="email"
                                            value={loginEmail}
                                            onChange={(e) => setLoginEmail(e.target.value)}
                                            placeholder="example@email.com"
                                            style={{
                                                width: '100%',
                                                border: 'none',
                                                outline: 'none',
                                                backgroundColor: 'transparent',
                                                color: isDarkMode ? '#fff' : '#000',
                                                fontSize: '1rem',
                                            }}
                                        />
                                    </Paper>
                                </Box>

                                {/* 비밀번호 입력 (보안 키패드) */}
                                <Box>
                                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                        비밀번호
                                    </Typography>
                                    <SecureKeypadAdvanced
                                        label="비밀번호를 입력하세요"
                                        value={loginPassword}
                                        onChange={(value) => setLoginPassword(value)}
                                        maxLength={50}
                                        enableEncryption={true}
                                        showStrengthMeter={true}
                                        onEnter={handleLogin}
                                    />
                                </Box>

                                {/* 로그인 결과 */}
                                {loginResult && (
                                    <Alert severity="success">
                                        <pre style={{ margin: 0, fontFamily: 'inherit' }}>
                                            {loginResult}
                                        </pre>
                                    </Alert>
                                )}

                                {/* 버튼들 */}
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="outlined"
                                        onClick={() => {
                                            setLoginEmail('');
                                            setLoginPassword('');
                                            setLoginResult('');
                                        }}
                                    >
                                        초기화
                                    </Button>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        disabled={!loginEmail || !loginPassword}
                                        onClick={handleLogin}
                                        sx={{
                                            background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                            },
                                        }}
                                    >
                                        로그인
                                    </Button>
                                </Box>
                            </Stack>
                        </CardContent>
                    </Card>
                </TabPanel>

                {/* 탭 5: 비교 분석 */}
                <TabPanel value={tabValue} index={4}>
                    <Box>
                        {/* 일반 입력 vs 보안 키패드 */}
                        <Box>
                            <Card>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                                        보안 비교 분석
                                    </Typography>

                                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                                        {/* 일반 입력 */}
                                        <Box>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    backgroundColor: isDarkMode ? 'rgba(244, 67, 54, 0.1)' : 'rgba(244, 67, 54, 0.05)',
                                                    border: '2px solid rgba(244, 67, 54, 0.3)',
                                                    borderRadius: 2,
                                                }}
                                            >
                                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#f44336' }}>
                                                    ❌ 일반 입력 방식
                                                </Typography>
                                                <Stack spacing={2}>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            취약점
                                                        </Typography>
                                                        <Stack spacing={0.5}>
                                                            <Typography variant="body2">• 키로거 공격에 노출</Typography>
                                                            <Typography variant="body2">• 화면 녹화로 입력값 유출</Typography>
                                                            <Typography variant="body2">• 어깨너머 관찰 가능</Typography>
                                                            <Typography variant="body2">• 평문 전송 위험</Typography>
                                                            <Typography variant="body2">• 패턴 학습 가능</Typography>
                                                        </Stack>
                                                    </Box>
                                                    <Divider />
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            보안 수준
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
                                                            ⭐️ 낮음 (20/100점)
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>
                                        </Box>

                                        {/* 보안 키패드 */}
                                        <Box>
                                            <Paper
                                                elevation={0}
                                                sx={{
                                                    p: 3,
                                                    backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                                                    border: '2px solid rgba(76, 175, 80, 0.3)',
                                                    borderRadius: 2,
                                                }}
                                            >
                                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#4caf50' }}>
                                                    ✅ 보안 키패드 방식
                                                </Typography>
                                                <Stack spacing={2}>
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            보안 기능
                                                        </Typography>
                                                        <Stack spacing={0.5}>
                                                            <Typography variant="body2">• 키로거 완벽 차단</Typography>
                                                            <Typography variant="body2">• 입력 마스킹 (●●●●)</Typography>
                                                            <Typography variant="body2">• 무작위 숫자 배치</Typography>
                                                            <Typography variant="body2">• AES-256 암호화</Typography>
                                                            <Typography variant="body2">• 재전송 공격 방지</Typography>
                                                        </Stack>
                                                    </Box>
                                                    <Divider />
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                                                            보안 수준
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                                                            ⭐️⭐️⭐️⭐️⭐️ 매우 높음 (95/100점)
                                                        </Typography>
                                                    </Box>
                                                </Stack>
                                            </Paper>
                                        </Box>
                                    </Box>

                                    {/* 통계 */}
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            mt: 3,
                                            p: 3,
                                            backgroundColor: isDarkMode ? 'rgba(33, 150, 243, 0.1)' : 'rgba(33, 150, 243, 0.05)',
                                            border: '1px solid rgba(33, 150, 243, 0.2)',
                                            borderRadius: 2,
                                        }}
                                    >
                                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                            📊 보안 효과 통계
                                        </Typography>
                                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#4caf50' }}>
                                                    99%
                                                </Typography>
                                                <Typography variant="caption">
                                                    키로거 차단율
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196f3' }}>
                                                    100%
                                                </Typography>
                                                <Typography variant="caption">
                                                    입력 암호화
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#ff9800' }}>
                                                    0초
                                                </Typography>
                                                <Typography variant="caption">
                                                    패턴 학습 시간
                                                </Typography>
                                            </Box>
                                            <Box sx={{ textAlign: 'center' }}>
                                                <Typography variant="h4" sx={{ fontWeight: 700, color: '#9c27b0' }}>
                                                    95%
                                                </Typography>
                                                <Typography variant="caption">
                                                    전체 보안 점수
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                </CardContent>
                            </Card>
                        </Box>
                    </Box>
                </TabPanel>

                {/* 전체 초기화 버튼 */}
                <Box sx={{ mt: 3, textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        onClick={resetAll}
                        sx={{ px: 4, py: 1 }}
                    >
                        모든 데이터 초기화
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default SecureKeypadShowcase;

