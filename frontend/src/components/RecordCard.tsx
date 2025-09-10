import React, { useState } from 'react';
import { WorkoutRecord, PersonalGoal, UpdateWorkoutRecordRequest } from '../types';
import { workoutRecordsApi } from '../utils/api';
import './RecordCard.css';

interface RecordCardProps {
    record: WorkoutRecord;
    goal?: PersonalGoal;
    onUpdated: () => void;
}

const RecordCard: React.FC<RecordCardProps> = ({ record, goal, onUpdated }) => {
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [editData, setEditData] = useState<UpdateWorkoutRecordRequest>({
        completion_time: record.completion_time,
        notes: record.notes,
        is_public: record.is_public
    });
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getGoalStatus = (): { status: 'achieved' | 'missed' | 'none'; message: string } => {
        if (!goal) return { status: 'none', message: '' };
        
        if (record.completion_time <= goal.target_time) {
            return { 
                status: 'achieved', 
                message: `🎉 목표 달성! (목표: ${formatTime(goal.target_time)})` 
            };
        } else {
            const diff = record.completion_time - goal.target_time;
            return { 
                status: 'missed', 
                message: `목표보다 ${formatTime(diff)} 느림` 
            };
        }
    };

    const handleSave = async (): Promise<void> => {
        if (!editData.completion_time || editData.completion_time <= 0) {
            window.alert('유효한 완료 시간을 입력해주세요.');
            return;
        }

        setIsSaving(true);
        try {
            await workoutRecordsApi.updateRecord(record.id, editData);
            setIsEditing(false);
            onUpdated();
            window.alert('기록이 수정되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 수정 실패';
            window.alert(`기록 수정 중 오류가 발생했습니다: ${errorMessage}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!window.confirm('정말로 이 기록을 삭제하시겠습니까?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await workoutRecordsApi.deleteRecord(record.id);
            onUpdated();
            window.alert('기록이 삭제되었습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 삭제 실패';
            window.alert(`기록 삭제 중 오류가 발생했습니다: ${errorMessage}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const goalStatus = getGoalStatus();

    return (
        <div className={`record-card ${goalStatus.status}`}>
            <div className="record-header">
                <div className="record-time">
                    <span className="time-value">{formatTime(record.completion_time)}</span>
                    <span className="time-label">완료 시간</span>
                </div>
                <div className="record-date">
                    {formatDate(record.completed_at)}
                </div>
                <div className="record-actions">
                    <button 
                        className="action-button edit-button"
                        onClick={() => setIsEditing(!isEditing)}
                        disabled={isSaving || isDeleting}
                        title="수정"
                    >
                        ✏️
                    </button>
                    <button 
                        className="action-button delete-button"
                        onClick={handleDelete}
                        disabled={isSaving || isDeleting}
                        title="삭제"
                    >
                        🗑️
                    </button>
                </div>
            </div>

            {goalStatus.status !== 'none' && (
                <div className={`goal-status ${goalStatus.status}`}>
                    {goalStatus.message}
                </div>
            )}

            {isEditing ? (
                <div className="record-edit">
                    <div className="edit-field">
                        <label htmlFor={`time-${record.id}`}>완료 시간 (초)</label>
                        <input
                            id={`time-${record.id}`}
                            type="number"
                            value={editData.completion_time}
                            onChange={(e) => setEditData({
                                ...editData,
                                completion_time: parseInt(e.target.value) || 0
                            })}
                            min="1"
                            disabled={isSaving}
                        />
                    </div>
                    <div className="edit-field">
                        <label htmlFor={`notes-${record.id}`}>메모</label>
                        <textarea
                            id={`notes-${record.id}`}
                            value={editData.notes}
                            onChange={(e) => setEditData({
                                ...editData,
                                notes: e.target.value
                            })}
                            rows={2}
                            maxLength={500}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="edit-field">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={editData.is_public}
                                onChange={(e) => setEditData({
                                    ...editData,
                                    is_public: e.target.checked
                                })}
                                disabled={isSaving}
                            />
                            <span>다른 사용자에게 공개</span>
                        </label>
                    </div>
                    <div className="edit-actions">
                        <button 
                            className="edit-button save"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? '저장 중...' : '저장'}
                        </button>
                        <button 
                            className="edit-button cancel"
                            onClick={() => {
                                setIsEditing(false);
                                setEditData({
                                    completion_time: record.completion_time,
                                    notes: record.notes,
                                    is_public: record.is_public
                                });
                            }}
                            disabled={isSaving}
                        >
                            취소
                        </button>
                    </div>
                </div>
            ) : (
                <div className="record-content">
                    {record.notes && (
                        <div className="record-notes">
                            <span className="notes-label">메모:</span>
                            <span className="notes-content">{record.notes}</span>
                        </div>
                    )}
                    <div className="record-meta">
                        <span className={`privacy-status ${record.is_public ? 'public' : 'private'}`}>
                            {record.is_public ? '🌐 공개' : '🔒 비공개'}
                        </span>
                    </div>
                </div>
            )}

            {isDeleting && (
                <div className="deleting-overlay">
                    <span>삭제 중...</span>
                </div>
            )}
        </div>
    );
};

export default RecordCard;
