import React from 'react';
import { PersonalStats } from '../types';
import './PersonalStatsComponent.css';

interface PersonalStatsComponentProps {
    stats: PersonalStats;
    onSetGoal: (programId: number) => void;
}

const PersonalStatsComponent: React.FC<PersonalStatsComponentProps> = ({ stats, onSetGoal }) => {
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    const getImprovementText = (improvement: number): string => {
        if (improvement > 0) {
            return `최근 ${improvement.toFixed(1)}% 개선됨! 🎉`;
        } else if (improvement < 0) {
            return `최근 ${Math.abs(improvement).toFixed(1)}% 느려짐`;
        } else {
            return '변화 없음';
        }
    };

    const getImprovementClass = (improvement: number): string => {
        if (improvement > 0) return 'improvement-positive';
        if (improvement < 0) return 'improvement-negative';
        return 'improvement-neutral';
    };

    return (
        <div className="personal-stats">
            <div className="stats-header">
                <h3>📊 개인 통계</h3>
            </div>
            
            <div className="stats-grid">
                <div className="stat-card total-workouts">
                    <div className="stat-icon">🏃‍♂️</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.total_workouts}</div>
                        <div className="stat-label">총 운동 횟수</div>
                    </div>
                </div>

                <div className="stat-card average-time">
                    <div className="stat-icon">⏱️</div>
                    <div className="stat-content">
                        <div className="stat-value">{formatTime(stats.average_time)}</div>
                        <div className="stat-label">평균 완료 시간</div>
                    </div>
                </div>

                <div className="stat-card best-time">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-content">
                        <div className="stat-value">{formatTime(stats.best_time)}</div>
                        <div className="stat-label">최고 기록</div>
                    </div>
                </div>

                <div className="stat-card programs-completed">
                    <div className="stat-icon">📋</div>
                    <div className="stat-content">
                        <div className="stat-value">{stats.programs_completed}</div>
                        <div className="stat-label">완료한 프로그램</div>
                    </div>
                </div>
            </div>

            {stats.recent_improvement !== 0 && (
                <div className={`improvement-notice ${getImprovementClass(stats.recent_improvement)}`}>
                    <span className="improvement-icon">
                        {stats.recent_improvement > 0 ? '📈' : '📉'}
                    </span>
                    <span className="improvement-text">
                        {getImprovementText(stats.recent_improvement)}
                    </span>
                </div>
            )}

            {stats.program_stats && Object.keys(stats.program_stats).length > 0 && (
                <div className="program-stats-section">
                    <h4>프로그램별 상세 통계</h4>
                    <div className="program-stats-list">
                        {Object.entries(stats.program_stats).map(([programId, programStat]) => (
                            <div key={programId} className="program-stat-item">
                                <div className="program-stat-header">
                                    <span className="program-name">{programStat.program_title}</span>
                                    <button 
                                        className="set-goal-mini-button"
                                        onClick={() => onSetGoal(parseInt(programId))}
                                        title="목표 설정"
                                    >
                                        🎯
                                    </button>
                                </div>
                                <div className="program-stat-details">
                                    <span className="program-stat-detail">
                                        <span className="detail-label">횟수:</span>
                                        <span className="detail-value">{programStat.count}회</span>
                                    </span>
                                    <span className="program-stat-detail">
                                        <span className="detail-label">평균:</span>
                                        <span className="detail-value">{formatTime(programStat.average_time)}</span>
                                    </span>
                                    <span className="program-stat-detail">
                                        <span className="detail-label">최고:</span>
                                        <span className="detail-value">{formatTime(programStat.best_time)}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonalStatsComponent;
