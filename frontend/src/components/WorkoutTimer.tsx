import React, { useState, useEffect, useRef } from 'react';
import './WorkoutTimer.css';

interface WorkoutTimerProps {
    onComplete: (completionTime: number) => void;
    onCancel: () => void;
    programTitle: string;
}

const WorkoutTimer: React.FC<WorkoutTimerProps> = ({ onComplete, onCancel, programTitle }) => {
    const [time, setTime] = useState<number>(0); // 초 단위
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [isPaused, setIsPaused] = useState<boolean>(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // 타이머 시작/일시정지/재개
    const toggleTimer = () => {
        if (!isRunning) {
            setIsRunning(true);
            setIsPaused(false);
        } else {
            setIsPaused(!isPaused);
        }
    };

    // 타이머 리셋
    const resetTimer = () => {
        setIsRunning(false);
        setIsPaused(false);
        setTime(0);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // 타이머 완료
    const completeWorkout = () => {
        setIsRunning(false);
        setIsPaused(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        onComplete(time);
    };

    // 타이머 취소
    const cancelWorkout = () => {
        resetTimer();
        onCancel();
    };

    // 시간 포맷팅 (MM:SS)
    const formatTime = (seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // 타이머 실행
    useEffect(() => {
        if (isRunning && !isPaused) {
            intervalRef.current = setInterval(() => {
                setTime(prevTime => prevTime + 1);
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [isRunning, isPaused]);

    return (
        <div className="workout-timer-container">
            <div className="timer-header">
                <h3>{programTitle}</h3>
                <p className="timer-subtitle">운동을 시작하세요!</p>
            </div>

            <div className="timer-display">
                <div className="time-circle">
                    <span className="time-text">{formatTime(time)}</span>
                </div>
            </div>

            <div className="timer-controls">
                {!isRunning ? (
                    <button 
                        className="timer-button start-button"
                        onClick={toggleTimer}
                    >
                        ▶️ 시작
                    </button>
                ) : (
                    <div className="running-controls">
                        <button 
                            className="timer-button pause-button"
                            onClick={toggleTimer}
                        >
                            {isPaused ? '▶️ 재개' : '⏸️ 일시정지'}
                        </button>
                        <button 
                            className="timer-button complete-button"
                            onClick={completeWorkout}
                        >
                            ✅ 완료
                        </button>
                    </div>
                )}
                
                <button 
                    className="timer-button reset-button"
                    onClick={resetTimer}
                    disabled={time === 0}
                >
                    🔄 리셋
                </button>
                
                <button 
                    className="timer-button cancel-button"
                    onClick={cancelWorkout}
                >
                    ❌ 취소
                </button>
            </div>

            <div className="timer-status">
                {!isRunning && time === 0 && (
                    <p className="status-text">운동을 시작하려면 시작 버튼을 누르세요</p>
                )}
                {isRunning && !isPaused && (
                    <p className="status-text running">운동 진행 중...</p>
                )}
                {isPaused && (
                    <p className="status-text paused">일시정지 중</p>
                )}
                {time > 0 && !isRunning && (
                    <p className="status-text completed">운동 완료! 기록을 저장하세요</p>
                )}
            </div>
        </div>
    );
};

export default WorkoutTimer;
