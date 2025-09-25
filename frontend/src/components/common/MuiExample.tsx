import React from 'react';
import {
    Button,
    Card,
    CardContent,
    CardHeader,
    Typography,
    Box,
    Stack,
    Chip,
    Fab,
    IconButton,
    Badge,
    Avatar,
    Paper,
    Alert,
    CircularProgress,
    LinearProgress,
    Switch,
    FormControlLabel,
    AddIcon,
    NotificationsIcon,
    FitnessCenterIcon,
    TimerIcon,
    TrendingUpIcon,
} from './MuiComponents';
import { useTheme } from '../../theme/ThemeProvider';

const MuiExample: React.FC = () => {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Material Design 컴포넌트 예제
            </Typography>

            <Stack spacing={3}>
                {/* 테마 토글 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        테마 설정
                    </Typography>
                    <FormControlLabel
                        control={<Switch checked={isDarkMode} onChange={toggleTheme} />}
                        label={isDarkMode ? '다크 모드' : '라이트 모드'}
                    />
                </Paper>

                {/* 버튼 예제 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        버튼 컴포넌트
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                        <Button variant="contained" color="primary">
                            Primary
                        </Button>
                        <Button variant="contained" color="secondary">
                            Secondary
                        </Button>
                        <Button variant="outlined" color="primary">
                            Outlined
                        </Button>
                        <Button variant="text" color="primary">
                            Text
                        </Button>
                        <Button variant="contained" color="success">
                            Success
                        </Button>
                        <Button variant="contained" color="warning">
                            Warning
                        </Button>
                        <Button variant="contained" color="error">
                            Error
                        </Button>
                    </Stack>
                </Paper>

                {/* 카드 예제 */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                        <Card>
                            <CardHeader
                                avatar={<Avatar sx={{ bgcolor: 'primary.main' }}>CF</Avatar>}
                                title="CrossFit 프로그램"
                                subheader="2024년 1월 15일"
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    이 프로그램은 CrossFit 기초를 다지는 데 도움이 됩니다.
                                </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <Chip label="초급" size="small" color="primary" />
                                    <Chip label="30분" size="small" color="secondary" />
                                    <Chip label="전신" size="small" color="success" />
                                </Stack>
                            </CardContent>
                        </Card>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                        <Card>
                            <CardHeader
                                avatar={<Avatar sx={{ bgcolor: 'success.main' }}>PR</Avatar>}
                                title="개인 기록"
                                subheader="최근 업데이트"
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    새로운 개인 기록을 달성했습니다!
                                </Typography>
                                <Box sx={{ mt: 2 }}>
                                    <Typography variant="h6" color="success.main">
                                        15:30
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        이전 기록: 16:45
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                </Box>

                {/* 알림 및 진행률 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        알림 및 진행률
                    </Typography>
                    <Stack spacing={2}>
                        <Alert severity="success">
                            운동이 성공적으로 완료되었습니다!
                        </Alert>
                        <Alert severity="info">
                            새로운 프로그램이 추가되었습니다.
                        </Alert>
                        <Alert severity="warning">
                            목표 시간을 달성하기 위해 더 노력해보세요.
                        </Alert>
                        <Alert severity="error">
                            운동 중 오류가 발생했습니다.
                        </Alert>

                        <Box>
                            <Typography variant="body2" gutterBottom>
                                운동 진행률
                            </Typography>
                            <LinearProgress variant="determinate" value={75} />
                        </Box>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CircularProgress size={40} />
                            <Typography variant="body2">
                                운동 데이터를 불러오는 중...
                            </Typography>
                        </Box>
                    </Stack>
                </Paper>

                {/* FAB 예제 */}
                <Box sx={{ position: 'relative', height: 200 }}>
                    <Fab
                        color="primary"
                        sx={{
                            position: 'absolute',
                            bottom: 16,
                            right: 16,
                        }}
                    >
                        <AddIcon />
                    </Fab>
                </Box>

                {/* 아이콘 버튼 예제 */}
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        아이콘 버튼
                    </Typography>
                    <Stack direction="row" spacing={1}>
                        <IconButton color="primary">
                            <Badge badgeContent={4} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>
                        <IconButton color="secondary">
                            <FitnessCenterIcon />
                        </IconButton>
                        <IconButton color="success">
                            <TimerIcon />
                        </IconButton>
                        <IconButton color="warning">
                            <TrendingUpIcon />
                        </IconButton>
                    </Stack>
                </Paper>
            </Stack>
        </Box>
    );
};

export default MuiExample;
