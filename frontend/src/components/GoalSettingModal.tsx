import React, { useState, useEffect } from 'react';
import { CreateGoalRequest } from '../types';
import { personalGoalsApi } from '../utils/api';
import './GoalSettingModal.css';

interface GoalSettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    programId: number;
    programTitle: string;
    currentBestTime: number;
}

const GoalSettingModal: React.FC<GoalSettingModalProps> = ({
    isOpen,
    onClose,
    onSave,
    programId,
    programTitle,
    currentBestTime
}) => {
    const [targetTime, setTargetTime] = useState<number>(0);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [timeInput, setTimeInput] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            // 현재 최고 기록의 90%를 기본 목표로 설정
            const suggestedTime = Math.max(1, Math.floor(currentBestTime * 0.9));
            setTargetTime(suggestedTime);
            setTimeInput(formatTimeInput(suggestedTime));
        }
    }, [isOpen, currentBestTime]);

    const formatTimeInput = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const parseTimeInput = (input: string): number => {
        const parts = input.split(':');
        if (parts.length === 2) {
            const minutes = parseInt(parts[0]) || 0;
            const seconds = parseInt(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
        return 0;
    };

    const handleTimeInputChange = (value: string): void => {
        setTimeInput(value);
        const seconds = parseTimeInput(value);
        if (seconds > 0) {
            setTargetTime(seconds);
        }
    };

    const handleSave = async (): Promise<void> => {
        if (targetTime <= 0) {
            window.alert('유효한 목표 시간을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            const data: CreateGoalRequest = {
                program_id: programId,
                target_time: targetTime
            };
            
            await personalGoalsApi.createGoal(data);
            onSave();
            window.alert('목표가 설정되었습니다!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '목표 설정 실패';
            window.alert(`목표 설정 중 오류가 발생했습니다: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getSuggestedTimes = (): number[] => {
        const suggestions = [];
        if (currentBestTime > 0) {
            suggestions.push(Math.floor(currentBestTime * 0.9)); // 90%
            suggestions.push(Math.floor(currentBestTime * 0.8)); // 80%
            suggestions.push(Math.floor(currentBestTime * 0.7)); // 70%
        }
        return suggestions.filter(time => time > 0);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay goal-setting-modal" onClick={onClose}>
            <div className="modal-content goal-setting-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>목표 설정</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="program-info">
                        <h4>{programTitle}</h4>
                        {currentBestTime > 0 && (
                            <div className="current-record">
                                <span className="record-label">현재 최고 기록:</span>
                                <span className="record-time">{formatTimeInput(currentBestTime)}</span>
                            </div>
                        )}
                    </div>

                    <div className="goal-setting">
                        <label htmlFor="target-time">목표 시간 (분:초)</label>
                        <input
                            id="target-time"
                            type="text"
                            value={timeInput}
                            onChange={(e) => handleTimeInputChange(e.target.value)}
                            placeholder="예: 5:30"
                            pattern="[0-9]+:[0-5][0-9]"
                            disabled={isSaving}
                        />
                        <div className="time-display">
                            목표: <span className="target-display">{formatTimeInput(targetTime)}</span>
                        </div>
                    </div>

                    {currentBestTime > 0 && (
                        <div className="suggestions">
                            <h5>추천 목표 시간</h5>
                            <div className="suggestion-buttons">
                                {getSuggestedTimes().map((time, index) => (
                                    <button
                                        key={time}
                                        className={`suggestion-button ${targetTime === time ? 'selected' : ''}`}
                                        onClick={() => {
                                            setTargetTime(time);
                                            setTimeInput(formatTimeInput(time));
                                        }}
                                        disabled={isSaving}
                                    >
                                        {formatTimeInput(time)}
                                        <span className="suggestion-percent">
                                            ({Math.floor((1 - time / currentBestTime) * 100)}% 개선)
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="goal-preview">
                        <div className="preview-item">
                            <span className="preview-label">현재 최고:</span>
                            <span className="preview-value">{formatTimeInput(currentBestTime || 0)}</span>
                        </div>
                        <div className="preview-item">
                            <span className="preview-label">목표 시간:</span>
                            <span className="preview-value target">{formatTimeInput(targetTime)}</span>
                        </div>
                        {currentBestTime > 0 && targetTime > 0 && (
                            <div className="preview-item">
                                <span className="preview-label">개선 필요:</span>
                                <span className={`preview-value ${targetTime < currentBestTime ? 'improvement' : 'no-improvement'}`}>
                                    {targetTime < currentBestTime 
                                        ? `-${formatTimeInput(currentBestTime - targetTime)}`
                                        : `+${formatTimeInput(targetTime - currentBestTime)}`
                                    }
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer">
                    <button 
                        className="modal-button cancel-button"
                        onClick={onClose}
                        disabled={isSaving}
                    >
                        취소
                    </button>
                    <button 
                        className="modal-button save-button"
                        onClick={handleSave}
                        disabled={isSaving || targetTime <= 0}
                    >
                        {isSaving ? '설정 중...' : '목표 설정'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoalSettingModal;
