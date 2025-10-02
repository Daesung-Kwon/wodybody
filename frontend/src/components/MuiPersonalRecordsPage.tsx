import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Button, Stack, Paper, Card, CardContent,
    FormControl, InputLabel, Select, MenuItem, IconButton, Tooltip,
    Chip, Avatar
} from './common/MuiComponents';
import {
    Refresh as RefreshIcon,
    TrendingUp as TrendingUpIcon,
    BarChart as BarChartIcon,
    Flag as TargetIcon,
    FitnessCenter as FitnessCenterIcon
} from '@mui/icons-material';
import { WorkoutRecord, PersonalStats, PersonalGoal, ProgramRecordGroup } from '../types';
import { workoutRecordsApi, personalStatsApi, personalGoalsApi } from '../utils/api';
import MuiLoadingSpinner from './MuiLoadingSpinner';
import MuiPersonalStatsComponent from './MuiPersonalStatsComponent';
import MuiRecordCard from './MuiRecordCard';
import MuiGoalSettingModal from './MuiGoalSettingModal';
import { useTheme } from '../theme/ThemeProvider';

const MuiPersonalRecordsPage: React.FC = () => {
    const { isDarkMode } = useTheme();
    const [, setRecords] = useState<WorkoutRecord[]>([]);
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [, setGoals] = useState<PersonalGoal[]>([]);
    const [groupedRecords, setGroupedRecords] = useState<ProgramRecordGroup[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'time'>('date');

    const loadData = async (): Promise<void> => {
        setBusy(true);
        try {
            // 병렬로 데이터 로드
            const [recordsData, statsData, goalsData] = await Promise.all([
                workoutRecordsApi.getUserRecords(),
                personalStatsApi.getStats(),
                personalGoalsApi.getGoals()
            ]);

            setRecords(recordsData.records);
            setStats(statsData);
            setGoals(goalsData.goals);

            // 프로그램별로 기록 그룹화
            const grouped = groupRecordsByProgram(recordsData.records, goalsData.goals);
            setGroupedRecords(grouped);

        } catch (error) {
            console.error('데이터 로딩 실패:', error);
            window.alert('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            setBusy(false);
        }
    };

    const groupRecordsByProgram = (records: WorkoutRecord[], goals: PersonalGoal[]): ProgramRecordGroup[] => {
        const groups: { [key: number]: ProgramRecordGroup } = {};

        records.forEach(record => {
            const programId = record.program_id;
            if (!groups[programId]) {
                groups[programId] = {
                    program_id: programId,
                    program_title: record.program_title || 'Unknown Program',
                    records: [],
                    stats: {
                        count: 0,
                        best_time: 0,
                        average_time: 0
                    },
                    goal: goals.find(g => g.program_id === programId) || undefined
                };
            }

            groups[programId].records.push(record);
            groups[programId].stats.count++;

            // 최고 기록 계산
            if (record.completion_time) {
                const currentTime = record.completion_time;
                if (groups[programId].stats.best_time === 0 || currentTime < groups[programId].stats.best_time) {
                    groups[programId].stats.best_time = currentTime;
                }
            }

            // 평균 기록 계산
            const validTimes = groups[programId].records
                .map(r => r.completion_time)
                .filter(time => time > 0);

            if (validTimes.length > 0) {
                groups[programId].stats.average_time = validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;
            }
        });

        return Object.values(groups);
    };

    const handleSortChange = (newSortBy: 'date' | 'time') => {
        setSortBy(newSortBy);

        const sorted = [...groupedRecords].sort((a, b) => {
            switch (newSortBy) {
                case 'date':
                    return new Date(b.records[0]?.completed_at || 0).getTime() - new Date(a.records[0]?.completed_at || 0).getTime();
                case 'time':
                    if (a.stats.best_time === 0 && b.stats.best_time === 0) return 0;
                    if (a.stats.best_time === 0) return 1;
                    if (b.stats.best_time === 0) return -1;
                    return a.stats.best_time - b.stats.best_time;
                default:
                    return 0;
            }
        });

        setGroupedRecords(sorted);
    };

    const handleSetGoal = (programId: number) => {
        setSelectedProgramId(programId);
        setShowGoalModal(true);
    };

    const handleGoalSaved = () => {
        setShowGoalModal(false);
        setSelectedProgramId(null);
        loadData(); // 데이터 새로고침
    };

    useEffect(() => {
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (busy) return <MuiLoadingSpinner label="개인 기록 로딩 중..." />;

    return (
        <Box sx={{ p: 3 }}>
            {/* 헤더 */}
            <Box sx={{ mb: 4 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
                    <Typography
                        variant="h5"
                        component="h1"
                        sx={{
                            fontWeight: 'bold',
                            color: isDarkMode ? '#ffffff' : '#1976d2',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}
                    >
                        <TrendingUpIcon />
                        내 운동 기록
                    </Typography>
                    <Tooltip title="새로고침">
                        <IconButton
                            onClick={loadData}
                            disabled={busy}
                            sx={{
                                color: isDarkMode ? '#ffffff' : '#1976d2'
                            }}
                        >
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Stack>

                {/* 정렬 및 필터 */}
                <Paper sx={{ p: 3, borderRadius: 2 }}>
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>정렬</InputLabel>
                        <Select
                            value={sortBy}
                            label="정렬"
                            onChange={(e) => handleSortChange(e.target.value as 'date' | 'time')}
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="date">최신순</MenuItem>
                            <MenuItem value="time">기록순</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>
            </Box>

            {/* 개인 통계 */}
            {stats && (
                <Box sx={{ mb: 4 }}>
                    <MuiPersonalStatsComponent
                        stats={stats}
                        onSetGoal={handleSetGoal}
                    />
                </Box>
            )}

            {/* 기록 목록 */}
            {groupedRecords.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                    <Avatar
                        sx={{
                            width: 80,
                            height: 80,
                            mx: 'auto',
                            mb: 2,
                            bgcolor: 'primary.main',
                            fontSize: '2.5rem'
                        }}
                    >
                        <FitnessCenterIcon sx={{ fontSize: 40 }} />
                    </Avatar>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                        아직 운동 기록이 없습니다
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        프로그램에 참여하고 운동을 완료하면<br />여기에 기록이 표시됩니다.
                    </Typography>
                </Paper>
            ) : (
                <Box>
                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: 'text.primary', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BarChartIcon />
                        프로그램별 기록
                    </Typography>

                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, 1fr)',
                            lg: 'repeat(3, 1fr)'
                        },
                        gap: 3
                    }}>
                        {groupedRecords.map((group) => (
                            <Card
                                key={group.program_id}
                                sx={{
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        transform: 'translateY(-2px)',
                                        boxShadow: isDarkMode ? '0 8px 32px rgba(0, 0, 0, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
                                    },
                                }}
                            >
                                {/* 헤더 */}
                                <Box
                                    sx={{
                                        p: 2,
                                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        color: 'white',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                        {group.program_title}
                                    </Typography>
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        <Chip
                                            label={`${group.stats.count}회`}
                                            size="small"
                                            sx={{
                                                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                color: 'white',
                                                fontWeight: 600,
                                            }}
                                        />
                                        {group.stats.best_time && (
                                            <Chip
                                                label={`최고 ${Math.floor(group.stats.best_time / 60)}:${(group.stats.best_time % 60).toString().padStart(2, '0')}`}
                                                size="small"
                                                sx={{
                                                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                                                    color: 'white',
                                                    fontWeight: 600,
                                                }}
                                            />
                                        )}
                                    </Stack>
                                </Box>

                                <CardContent sx={{ p: 0 }}>
                                    {/* 통계 정보 */}
                                    <Box sx={{ p: 2 }}>
                                        <Stack spacing={2}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <BarChartIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                    <Typography variant="body2" color="text.secondary">
                                                        평균 기록:
                                                    </Typography>
                                                </Stack>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {group.stats.average_time
                                                        ? `${Math.floor(group.stats.average_time / 60)}:${(group.stats.average_time % 60).toString().padStart(2, '0')}`
                                                        : '-'
                                                    }
                                                </Typography>
                                            </Stack>


                                            <Divider />

                                            {/* 목표 설정 버튼 */}
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                startIcon={<TargetIcon />}
                                                onClick={() => handleSetGoal(group.program_id)}
                                                sx={{ borderRadius: 2 }}
                                            >
                                                목표 설정
                                            </Button>
                                        </Stack>
                                    </Box>

                                    {/* 기록 목록 */}
                                    <Box sx={{ p: 2, pt: 0 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            개별 기록
                                        </Typography>
                                        <Stack spacing={1}>
                                            {group.records.map((record, index) => (
                                                <MuiRecordCard
                                                    key={`${record.id}-${index}`}
                                                    record={record}
                                                />
                                            ))}
                                        </Stack>
                                    </Box>
                                </CardContent>
                            </Card>
                        ))}
                    </Box>
                </Box>
            )}

            {/* 목표 설정 모달 */}
            {showGoalModal && selectedProgramId && (
                <MuiGoalSettingModal
                    isOpen={showGoalModal}
                    onClose={() => {
                        setShowGoalModal(false);
                        setSelectedProgramId(null);
                    }}
                    onSave={handleGoalSaved}
                    programId={selectedProgramId}
                    programTitle={groupedRecords.find(g => g.program_id === selectedProgramId)?.program_title || ''}
                />
            )}
        </Box>
    );
};

export default MuiPersonalRecordsPage;
