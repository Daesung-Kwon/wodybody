import React from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Stack,
    Divider,
    Avatar,
    Paper,
} from './common/MuiComponents';
import {
    FitnessCenter as FitnessCenterIcon,
    Group as GroupIcon,
    Favorite as FavoriteIcon,
    EmojiEvents as EmojiEventsIcon,
} from '@mui/icons-material';
import { useTheme } from '../theme/ThemeProvider';

const MuiAboutPage: React.FC = () => {
    const { isDarkMode } = useTheme();

    const contributors = [
        { name: '유성' },
        { name: '소원' },
        { name: '민기' },
        { name: '정기' },
        { name: '진태' },
        { name: '호진' },
    ];

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                maxWidth: 900,
                mx: 'auto',
                minHeight: 'calc(100vh - 200px)',
            }}
        >
            <Stack spacing={3}>
                {/* 헤더 */}
                <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 'bold',
                            mb: 1,
                            color: 'primary.main',
                        }}
                    >
                        WodyBody에 대해
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        크로스핏과 맨몸 운동을 사랑하는 사람들을 위한 서비스
                    </Typography>
                </Box>

                {/* 서비스 탄생 배경 */}
                <Card
                    sx={{
                        boxShadow: 3,
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={3}>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'primary.main',
                                            width: 48,
                                            height: 48,
                                        }}
                                    >
                                        <FitnessCenterIcon />
                                    </Avatar>
                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                        서비스 탄생 배경
                                    </Typography>
                                </Stack>
                            </Box>

                            <Divider />

                            <Stack spacing={2.5}>
                                <Box>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            lineHeight: 1.8,
                                            fontSize: '1.05rem',
                                            color: 'text.primary',
                                        }}
                                    >
                                        WodyBody는 회사 Gym의 GX/요가룸에서 시작된 작은 운동 모임에서
                                        탄생했습니다.
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            lineHeight: 1.8,
                                            fontSize: '1.05rem',
                                            color: 'text.primary',
                                        }}
                                    >
                                        맨몸 운동과 작은 기구를 이용한 크로스핏 운동을 하려고 그곳을 찾았을 때,
                                        비슷한 목적을 가진 분들을 만나게 되었습니다. 함께 운동할 수 있냐는 제안에
                                        흔쾌히 승낙해주신 분들과 함께, 매일매일 채팅방에서 "오늘 함께 운동 하실
                                        분~"이라고 모집하는 리더분의 운동 프로그램을 수행하며 시작되었습니다.
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography
                                        variant="body1"
                                        sx={{
                                            lineHeight: 1.8,
                                            fontSize: '1.05rem',
                                            color: 'text.primary',
                                        }}
                                    >
                                        운동 후 수행 결과(시간 또는 횟수)를 개별로 묻고 채팅방에 남기던 과정에서,
                                        지난 이력이나 어떤 운동을 참여했는지 궁금해하게 되었습니다. 그래서 오늘의
                                        운동 WOD 등록 및 관리 서비스를 만들어 우리끼리만이라도 잘 이용하고, 다른
                                        사람들에게도 확장할 수 있도록 하였습니다.
                                    </Typography>
                                </Box>

                                <Paper
                                    sx={{
                                        p: 3,
                                        bgcolor: isDarkMode
                                            ? 'rgba(25, 118, 210, 0.1)'
                                            : 'rgba(25, 118, 210, 0.05)',
                                        borderLeft: '4px solid',
                                        borderColor: 'primary.main',
                                        borderRadius: 2,
                                    }}
                                >
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <FavoriteIcon
                                            sx={{
                                                color: 'primary.main',
                                                mt: 0.5,
                                            }}
                                        />
                                        <Box>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    lineHeight: 1.8,
                                                    fontSize: '1.05rem',
                                                    fontWeight: 500,
                                                    color: 'text.primary',
                                                }}
                                            >
                                                큰 수익을 기대하거나 그런 목적이 아니라, 맨몸운동과 크로스핏을
                                                좋아하는 사람들이 "오늘은 어떤 운동을 할까"라는 큰 고민 없이 누구나
                                                WOD를 등록하고 공유하는 서비스로 건강하게 생활했으면 좋겠습니다.
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>

                {/* 감사 인사 */}
                <Card
                    sx={{
                        boxShadow: 3,
                        borderRadius: 3,
                        overflow: 'hidden',
                    }}
                >
                    <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                        <Stack spacing={3}>
                            <Box>
                                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                    <Avatar
                                        sx={{
                                            bgcolor: 'secondary.main',
                                            width: 48,
                                            height: 48,
                                        }}
                                    >
                                        <GroupIcon />
                                    </Avatar>
                                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                        감사 인사
                                    </Typography>
                                </Stack>
                            </Box>

                            <Divider />

                            <Box>
                                <Typography
                                    variant="body1"
                                    sx={{
                                        lineHeight: 1.8,
                                        fontSize: '1.05rem',
                                        color: 'text.primary',
                                        mb: 3,
                                    }}
                                >
                                    WodyBody 서비스 개발과 운영에 도움을 주신 분들께 진심으로 감사드립니다.
                                </Typography>

                                <Stack
                                    direction="row"
                                    flexWrap="wrap"
                                    spacing={2}
                                    sx={{
                                        justifyContent: { xs: 'center', md: 'flex-start' },
                                    }}
                                >
                                    {contributors.map((contributor, index) => (
                                        <Paper
                                            key={index}
                                            sx={{
                                                p: 2.5,
                                                minWidth: 120,
                                                textAlign: 'center',
                                                bgcolor: isDarkMode
                                                    ? 'rgba(156, 39, 176, 0.1)'
                                                    : 'rgba(156, 39, 176, 0.05)',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                borderRadius: 2,
                                                transition: 'all 0.2s',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: 2,
                                                },
                                            }}
                                        >
                                            <EmojiEventsIcon
                                                sx={{
                                                    color: 'secondary.main',
                                                    fontSize: 32,
                                                    mb: 1,
                                                }}
                                            />
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 'bold',
                                                    color: 'text.primary',
                                                }}
                                            >
                                                {contributor.name}
                                            </Typography>
                                        </Paper>
                                    ))}
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* 푸터 메시지 */}
                <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        함께 운동하며 건강한 하루하루를 만들어가요 💪
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
};

export default MuiAboutPage;

