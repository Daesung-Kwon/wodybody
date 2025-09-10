import React, { useState, useEffect } from 'react';
import { WorkoutRecord, PersonalStats, PersonalGoal, ProgramRecordGroup } from '../types';
import { workoutRecordsApi, personalStatsApi, personalGoalsApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import PersonalStatsComponent from './PersonalStatsComponent';
import RecordCard from './RecordCard';
import GoalSettingModal from './GoalSettingModal';
import './PersonalRecordsPage.css';

const PersonalRecordsPage: React.FC = () => {
    const [, setRecords] = useState<WorkoutRecord[]>([]);
    const [stats, setStats] = useState<PersonalStats | null>(null);
    const [, setGoals] = useState<PersonalGoal[]>([]);
    const [groupedRecords, setGroupedRecords] = useState<ProgramRecordGroup[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [showGoalModal, setShowGoalModal] = useState<boolean>(false);
    const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'program' | 'time'>('date');

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
                        average_time: 0,
                        best_time: 0
                    }
                };
            }
            groups[programId].records.push(record);
        });

        // 각 그룹의 통계 계산
        Object.values(groups).forEach(group => {
            const times = group.records.map(r => r.completion_time);
            group.stats = {
                count: times.length,
                average_time: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
                best_time: Math.min(...times)
            };

            // 목표 설정
            const goal = goals.find(g => g.program_id === group.program_id);
            if (goal) {
                group.goal = goal;
            }
        });

        return Object.values(groups);
    };

    const handleSortChange = (newSort: 'date' | 'program' | 'time'): void => {
        setSortBy(newSort);
        
        const sorted = [...groupedRecords].sort((a, b) => {
            switch (newSort) {
                case 'date':
                    return new Date(b.records[0]?.completed_at || 0).getTime() - new Date(a.records[0]?.completed_at || 0).getTime();
                case 'program':
                    return a.program_title.localeCompare(b.program_title);
                case 'time':
                    return a.stats.best_time - b.stats.best_time;
                default:
                    return 0;
            }
        });
        
        setGroupedRecords(sorted);
    };

    const handleSetGoal = (programId: number): void => {
        setSelectedProgramId(programId);
        setShowGoalModal(true);
    };

    const handleGoalSaved = (): void => {
        setShowGoalModal(false);
        setSelectedProgramId(null);
        loadData(); // 데이터 새로고침
    };

    const handleRecordUpdated = (): void => {
        loadData(); // 데이터 새로고침
    };

    useEffect(() => {
        loadData();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (busy) return <LoadingSpinner label="개인 기록 로딩 중..." />;

    return (
        <div className="personal-records-container">
            <div className="page-header">
                <h2>내 운동 기록</h2>
                <div className="header-actions">
                    <select 
                        value={sortBy} 
                        onChange={(e) => handleSortChange(e.target.value as 'date' | 'program' | 'time')}
                        className="sort-select"
                    >
                        <option value="date">최신순</option>
                        <option value="program">프로그램순</option>
                        <option value="time">기록순</option>
                    </select>
                    <button 
                        className="refresh-button"
                        onClick={loadData}
                        disabled={busy}
                        title="새로고침"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* 개인 통계 */}
            {stats && (
                <PersonalStatsComponent 
                    stats={stats} 
                    onSetGoal={handleSetGoal}
                />
            )}

            {/* 기록 목록 */}
            {groupedRecords.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🏃‍♂️</div>
                    <h3>아직 운동 기록이 없습니다</h3>
                    <p>프로그램에 참여하고 운동을 완료하면<br />여기에 기록이 표시됩니다.</p>
                </div>
            ) : (
                <div className="records-section">
                    <h3>프로그램별 기록</h3>
                    <div className="records-grid">
                        {groupedRecords.map((group) => (
                            <div key={group.program_id} className="program-group">
                                <div className="program-header">
                                    <h4>{group.program_title}</h4>
                                    <div className="program-stats">
                                        <span className="stat-item">
                                            <span className="stat-label">횟수:</span>
                                            <span className="stat-value">{group.stats.count}회</span>
                                        </span>
                                        <span className="stat-item">
                                            <span className="stat-label">평균:</span>
                                            <span className="stat-value">{Math.floor(group.stats.average_time / 60)}분 {group.stats.average_time % 60}초</span>
                                        </span>
                                        <span className="stat-item">
                                            <span className="stat-label">최고:</span>
                                            <span className="stat-value">{Math.floor(group.stats.best_time / 60)}분 {group.stats.best_time % 60}초</span>
                                        </span>
                                    </div>
                                    <button 
                                        className="set-goal-button"
                                        onClick={() => handleSetGoal(group.program_id)}
                                        title="목표 설정"
                                    >
                                        🎯 목표 설정
                                    </button>
                                </div>
                                
                                {group.goal && (
                                    <div className="goal-info">
                                        <span className="goal-label">목표:</span>
                                        <span className="goal-time">{Math.floor(group.goal.target_time / 60)}분 {group.goal.target_time % 60}초</span>
                                        {group.stats.best_time <= group.goal.target_time && (
                                            <span className="goal-achieved">🎉 달성!</span>
                                        )}
                                    </div>
                                )}

                                <div className="records-list">
                                    {group.records
                                        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime())
                                        .map((record) => (
                                            <RecordCard
                                                key={record.id}
                                                record={record}
                                                goal={group.goal}
                                                onUpdated={handleRecordUpdated}
                                            />
                                        ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 목표 설정 모달 */}
            {showGoalModal && selectedProgramId && (
                <GoalSettingModal
                    isOpen={showGoalModal}
                    onClose={() => {
                        setShowGoalModal(false);
                        setSelectedProgramId(null);
                    }}
                    onSave={handleGoalSaved}
                    programId={selectedProgramId}
                    programTitle={groupedRecords.find(g => g.program_id === selectedProgramId)?.program_title || ''}
                    currentBestTime={groupedRecords.find(g => g.program_id === selectedProgramId)?.stats.best_time || 0}
                />
            )}
        </div>
    );
};

export default PersonalRecordsPage;
