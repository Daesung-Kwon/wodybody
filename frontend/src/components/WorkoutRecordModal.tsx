import React, { useState } from 'react';
import { CreateWorkoutRecordRequest } from '../types';
import './WorkoutRecordModal.css';

interface WorkoutRecordModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateWorkoutRecordRequest) => void;
    completionTime: number;
    programTitle: string;
    isLoading?: boolean;
}

const WorkoutRecordModal: React.FC<WorkoutRecordModalProps> = ({
    isOpen,
    onClose,
    onSave,
    completionTime,
    programTitle,
    isLoading = false
}) => {
    const [notes, setNotes] = useState<string>('');
    const [isPublic, setIsPublic] = useState<boolean>(true);

    if (!isOpen) return null;

    const handleSave = () => {
        const data: CreateWorkoutRecordRequest = {
            completion_time: completionTime,
            notes: notes.trim(),
            is_public: isPublic
        };
        onSave(data);
    };

    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}분 ${remainingSeconds}초`;
    };

    return (
        <div className="modal-overlay workout-record-modal" onClick={onClose}>
            <div className="modal-content workout-record-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>운동 기록 저장</h3>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>
                
                <div className="modal-body">
                    <div className="record-summary">
                        <h4>{programTitle}</h4>
                        <div className="completion-time">
                            <span className="time-label">완료 시간:</span>
                            <span className="time-value">{formatTime(completionTime)}</span>
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">메모 (선택사항)</label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="운동 후 느낌이나 특이사항을 기록해보세요..."
                            rows={3}
                            maxLength={500}
                        />
                        <div className="char-count">{notes.length}/500</div>
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                            />
                            <span className="checkbox-text">다른 사용자에게 기록 공개</span>
                        </label>
                        <p className="help-text">
                            공개하면 다른 사용자들이 이 프로그램의 기록을 볼 수 있습니다.
                        </p>
                    </div>
                </div>

                <div className="modal-footer">
                    <button 
                        className="modal-button cancel-button"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        취소
                    </button>
                    <button 
                        className="modal-button save-button"
                        onClick={handleSave}
                        disabled={isLoading}
                    >
                        {isLoading ? '저장 중...' : '저장'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkoutRecordModal;
