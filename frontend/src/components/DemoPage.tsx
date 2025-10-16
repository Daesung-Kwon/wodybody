/**
 * 개발 환경 전용 데모 페이지
 * 
 * 이 페이지는 process.env.NODE_ENV === 'development' 환경에서만 접근 가능합니다.
 * 프로덕션 빌드 시 자동으로 제외됩니다.
 * 
 * 접근 방법: http://localhost:3000/#demo
 */

import React, { useState } from 'react';
import {
    Container,
    Box,
    Card,
    CardContent,
    Typography,
    Button,
    Stack,
    Chip,
    Paper,
    Alert,
    Tabs,
    Tab,
} from './common/MuiComponents';
import { useTheme } from '../theme/ThemeProvider';
import SecureKeypad from './SecureKeypad';
import SecureKeypadAdvanced from './SecureKeypadAdvanced';
import SecureQwertyKeypad from './SecureQwertyKeypad';

const DemoPage: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [activeTab, setActiveTab] = useState(0);

    // 보안 키패드 상태
    const [basicValue, setBasicValue] = useState('');
    const [advancedValue, setAdvancedValue] = useState('');
    const [qwertyValue, setQwertyValue] = useState('');
    const [encryptedData, setEncryptedData] = useState('');

    const handleGoToLogin = () => {
        window.location.hash = '';
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
                            onClick={handleGoToLogin}
                            sx={{
                                borderRadius: 2,
                                px: 2,
                                py: 1,
                            }}
                        >
                            ← 로그인으로 돌아가기
                        </Button>
                        <Chip
                            label="개발 환경 전용"
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 600 }}
                        />
                    </Box>
                    <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                        🧪 개발자 데모 페이지
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
                        개발 및 테스트 전용 기능 모음
                    </Typography>
                </Box>

                {/* 환경 정보 */}
                <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                        ℹ️ 이 페이지는 개발 환경에서만 표시됩니다
                    </Typography>
                    <Typography variant="caption">
                        • NODE_ENV: {process.env.NODE_ENV}<br />
                        • 프로덕션 빌드 시 자동 제외됨<br />
                        • 접근 URL: http://localhost:3000/#demo
                    </Typography>
                </Alert>

                {/* 보안 키패드 데모 */}
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                            🔐 보안 키패드 데모
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                            랜덤 키 배치, 입력 마스킹, AES-256-GCM 암호화를 제공하는 보안 키패드입니다.
                        </Typography>

                        <Tabs
                            value={activeTab}
                            onChange={(_, newValue) => setActiveTab(newValue)}
                            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
                        >
                            <Tab label="기본 숫자 키패드" />
                            <Tab label="고급 숫자 키패드" />
                            <Tab label="QWERTY 키패드" />
                        </Tabs>

                        {activeTab === 0 && (
                            <Box>
                                <SecureKeypad
                                    label="기본 보안 키패드"
                                    value={basicValue}
                                    onChange={setBasicValue}
                                    maxLength={6}
                                    showMasked={true}
                                />
                                {basicValue && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        입력된 값: {basicValue}
                                    </Alert>
                                )}
                            </Box>
                        )}

                        {activeTab === 1 && (
                            <Box>
                                <SecureKeypadAdvanced
                                    label="고급 보안 키패드 (암호화 + 강도 측정)"
                                    value={advancedValue}
                                    onChange={setAdvancedValue}
                                    onEncrypted={setEncryptedData}
                                    maxLength={10}
                                    showMasked={true}
                                    showStrength={true}
                                />
                                {advancedValue && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        입력된 값: {advancedValue}
                                    </Alert>
                                )}
                                {encryptedData && (
                                    <Alert severity="success" sx={{ mt: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                            암호화된 데이터:
                                        </Typography>
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontFamily: 'monospace',
                                                wordBreak: 'break-all',
                                                display: 'block',
                                            }}
                                        >
                                            {encryptedData}
                                        </Typography>
                                    </Alert>
                                )}
                            </Box>
                        )}

                        {activeTab === 2 && (
                            <Box>
                                <SecureQwertyKeypad
                                    label="QWERTY 보안 키패드"
                                    value={qwertyValue}
                                    onChange={setQwertyValue}
                                    maxLength={50}
                                    showMasked={true}
                                />
                                {qwertyValue && (
                                    <Alert severity="info" sx={{ mt: 2 }}>
                                        입력된 값: {qwertyValue}
                                    </Alert>
                                )}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* 데모 기능 카드들 */}
                <Stack spacing={3}>
                    {/* WebSocket 디버거 */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                📡 WebSocket 디버거
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                실시간 WebSocket 연결 상태 및 메시지를 확인할 수 있습니다.
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                위치: 화면 우측 하단에 자동 표시됨
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* Theme Tester */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                🎨 테마 테스터
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                현재 테마: {isDarkMode ? '다크 모드 🌙' : '라이트 모드 ☀️'}
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 2,
                                }}
                            >
                                <Stack spacing={1}>
                                    <Typography variant="body2">
                                        Primary: <Box component="span" sx={{ color: 'primary.main', fontWeight: 600 }}>●</Box>
                                    </Typography>
                                    <Typography variant="body2">
                                        Secondary: <Box component="span" sx={{ color: 'secondary.main', fontWeight: 600 }}>●</Box>
                                    </Typography>
                                    <Typography variant="body2">
                                        Success: <Box component="span" sx={{ color: 'success.main', fontWeight: 600 }}>●</Box>
                                    </Typography>
                                    <Typography variant="body2">
                                        Warning: <Box component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>●</Box>
                                    </Typography>
                                    <Typography variant="body2">
                                        Error: <Box component="span" sx={{ color: 'error.main', fontWeight: 600 }}>●</Box>
                                    </Typography>
                                </Stack>
                            </Paper>
                        </CardContent>
                    </Card>

                    {/* 공유 URL 테스터 */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                🔗 공유 URL 테스터
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                프로그램 공유 기능을 테스트할 수 있습니다.
                            </Typography>
                            <Button
                                variant="outlined"
                                onClick={() => window.location.hash = '#share/1'}
                                sx={{ mr: 1 }}
                            >
                                테스트 공유 링크 열기
                            </Button>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                                예시: http://localhost:3000/#share/1
                            </Typography>
                        </CardContent>
                    </Card>

                    {/* 로컬 스토리지 뷰어 */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                💾 로컬 스토리지 뷰어
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                현재 저장된 로컬 스토리지 데이터:
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 2,
                                    maxHeight: 200,
                                    overflow: 'auto',
                                }}
                            >
                                <Stack spacing={0.5}>
                                    {Object.keys(localStorage).map((key) => (
                                        <Typography key={key} variant="caption" sx={{ fontFamily: 'monospace' }}>
                                            {key}: {localStorage.getItem(key)?.substring(0, 50)}
                                            {(localStorage.getItem(key)?.length || 0) > 50 ? '...' : ''}
                                        </Typography>
                                    ))}
                                    {Object.keys(localStorage).length === 0 && (
                                        <Typography variant="caption" color="text.secondary">
                                            저장된 데이터가 없습니다.
                                        </Typography>
                                    )}
                                </Stack>
                            </Paper>
                            <Button
                                size="small"
                                color="error"
                                onClick={() => {
                                    if (window.confirm('정말로 모든 로컬 스토리지를 삭제하시겠습니까?')) {
                                        localStorage.clear();
                                        window.location.reload();
                                    }
                                }}
                                sx={{ mt: 1 }}
                            >
                                전체 삭제
                            </Button>
                        </CardContent>
                    </Card>

                    {/* API 엔드포인트 테스터 */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                🌐 API 엔드포인트
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                현재 사용 중인 API 엔드포인트:
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 2,
                                }}
                            >
                                <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block' }}>
                                    {process.env.REACT_APP_API_URL || 'http://localhost:5000'}
                                </Typography>
                            </Paper>
                        </CardContent>
                    </Card>

                    {/* 브라우저 정보 */}
                    <Card>
                        <CardContent>
                            <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                                🖥️ 브라우저 정보
                            </Typography>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 2,
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                    borderRadius: 2,
                                }}
                            >
                                <Stack spacing={0.5}>
                                    <Typography variant="caption">
                                        User Agent: {navigator.userAgent}
                                    </Typography>
                                    <Typography variant="caption">
                                        화면 크기: {window.innerWidth} × {window.innerHeight}
                                    </Typography>
                                    <Typography variant="caption">
                                        언어: {navigator.language}
                                    </Typography>
                                    <Typography variant="caption">
                                        온라인 상태: {navigator.onLine ? '✅' : '❌'}
                                    </Typography>
                                </Stack>
                            </Paper>
                        </CardContent>
                    </Card>
                </Stack>

                {/* 푸터 */}
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        이 페이지는 개발 환경에서만 표시됩니다. 프로덕션에서는 자동으로 숨겨집니다.
                    </Typography>
                </Box>
            </Box>
        </Container>
    );
};

export default DemoPage;

