import React, { useState, useEffect, useCallback } from 'react';
import { WorkoutPattern, ExerciseSet, WorkoutType, Exercise } from '../types';
import { exerciseApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

interface WODBuilderProps {
    workoutPattern: WorkoutPattern | null;
    onPatternChange: (pattern: WorkoutPattern | null) => void;
}

const WODBuilder: React.FC<WODBuilderProps> = ({ workoutPattern, onPatternChange }) => {
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [showBuilder, setShowBuilder] = useState<boolean>(false);

    // 운동 목록 로드
    useEffect(() => {
        const loadExercises = async () => {
            setLoading(true);
            try {
                const data = await exerciseApi.getExercises();
                setExercises(data.exercises);
            } catch (error) {
                console.error('운동 로딩 실패:', error);
            } finally {
                setLoading(false);
            }
        };
        loadExercises();
    }, []);

    // WOD 패턴 초기화
    const initializePattern = (type: WorkoutType) => {
        const pattern: WorkoutPattern = {
            type,
            total_rounds: 1,
            time_cap_per_round: type === 'time_cap' ? 1 : undefined,
            exercises: [],
            description: ''
        };
        onPatternChange(pattern);
    };

    // 운동 추가
    const addExercise = (exercise: Exercise) => {
        if (!workoutPattern) return;

        // 이미 추가된 운동인지 확인
        const isAlreadyAdded = workoutPattern.exercises.some(ex => ex.exercise_id === exercise.id);
        if (isAlreadyAdded) {
            alert('이미 추가된 운동입니다.');
            return;
        }

        const newExercise: ExerciseSet = {
            exercise_id: exercise.id,
            exercise_name: exercise.name,
            base_reps: 1,
            progression_type: 'fixed',
            progression_value: 0,
            order: workoutPattern.exercises.length
        };

        const updatedPattern = {
            ...workoutPattern,
            exercises: [...workoutPattern.exercises, newExercise]
        };
        onPatternChange(updatedPattern);
    };

    // 운동 제거
    const removeExercise = (index: number) => {
        if (!workoutPattern) return;

        const updatedExercises = workoutPattern.exercises.filter((_, i) => i !== index);
        const reorderedExercises = updatedExercises.map((ex, i) => ({
            ...ex,
            order: i
        }));

        const updatedPattern = {
            ...workoutPattern,
            exercises: reorderedExercises
        };
        onPatternChange(updatedPattern);
    };

    // 운동 설정 업데이트
    const updateExercise = (index: number, field: keyof ExerciseSet, value: any) => {
        if (!workoutPattern) return;

        const updatedExercises = [...workoutPattern.exercises];
        updatedExercises[index] = { ...updatedExercises[index], [field]: value };

        const updatedPattern = {
            ...workoutPattern,
            exercises: updatedExercises
        };
        onPatternChange(updatedPattern);
    };

    // 패턴 설정 업데이트
    const updatePattern = useCallback((field: keyof WorkoutPattern, value: any) => {
        if (!workoutPattern) return;

        const updatedPattern = {
            ...workoutPattern,
            [field]: value
        };
        onPatternChange(updatedPattern);
    }, [workoutPattern, onPatternChange]);

    // 운동 순서 변경
    const moveExercise = (index: number, direction: 'up' | 'down') => {
        if (!workoutPattern) return;

        const updatedExercises = [...workoutPattern.exercises];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < updatedExercises.length) {
            [updatedExercises[index], updatedExercises[targetIndex]] = [updatedExercises[targetIndex], updatedExercises[index]];
            const reorderedExercises = updatedExercises.map((ex, i) => ({
                ...ex,
                order: i
            }));

            const updatedPattern = {
                ...workoutPattern,
                exercises: reorderedExercises
            };
            onPatternChange(updatedPattern);
        }
    };

    // WOD 유형별 설명 생성
    const generateDescription = (pattern: WorkoutPattern) => {
        if (!pattern.exercises.length) return '';

        const exerciseNames = pattern.exercises.map(ex => ex.exercise_name).join(', ');
        const rounds = pattern.total_rounds;

        switch (pattern.type) {
            case 'fixed_reps':
                return `${exerciseNames} 총 ${rounds}라운드`;
            case 'ascending':
                return `${exerciseNames} 총 ${rounds}라운드 (라운드별로 횟수 증가)`;
            case 'descending':
                return `${exerciseNames} 총 ${rounds}라운드 (라운드별로 횟수 감소)`;
            case 'mixed_progression':
                return `${exerciseNames} 총 ${rounds}라운드 (혼합 진행 패턴)`;
            case 'time_cap':
                return `${exerciseNames} 총 ${rounds}라운드 (라운드당 ${pattern.time_cap_per_round}분 제한)`;
            default:
                return `${exerciseNames} 총 ${rounds}라운드`;
        }
    };

    // 설명 자동 업데이트
    useEffect(() => {
        if (workoutPattern) {
            const description = generateDescription(workoutPattern);
            if (description !== workoutPattern.description) {
                updatePattern('description', description);
            }
        }
    }, [workoutPattern?.exercises, workoutPattern?.total_rounds, workoutPattern?.type, updatePattern, workoutPattern]);

    if (loading) return <LoadingSpinner label="운동 로딩 중..." />;

    return (
        <div className="wod-builder">
            <div className="wod-header">
                <h3>WOD (Workout of the Day) 빌더</h3>
                <button
                    onClick={() => setShowBuilder(!showBuilder)}
                    className="toggle-builder-btn"
                >
                    {showBuilder ? '빌더 숨기기' : 'WOD 빌더 열기'}
                </button>
            </div>

            {showBuilder && (
                <div className="wod-content">
                    {/* WOD 유형 선택 */}
                    <div className="wod-type-selector">
                        <label>WOD 유형:</label>
                        <select
                            value={workoutPattern?.type || ''}
                            onChange={(e) => initializePattern(e.target.value as WorkoutType)}
                        >
                            <option value="">유형 선택</option>
                            <option value="fixed_reps">고정 횟수 (유형 2, 4)</option>
                            <option value="ascending">증가 패턴 (유형 3)</option>
                            <option value="descending">감소 패턴 (유형 1)</option>
                            <option value="mixed_progression">혼합 진행 (유형 1)</option>
                            <option value="time_cap">시간 제한 (유형 5)</option>
                        </select>
                    </div>

                    {workoutPattern && (
                        <>
                            {/* 기본 설정 */}
                            <div className="wod-settings">
                                <div className="setting-group">
                                    <label>총 라운드 수:</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={workoutPattern.total_rounds}
                                        onChange={(e) => updatePattern('total_rounds', parseInt(e.target.value) || 1)}
                                    />
                                </div>

                                {workoutPattern.type === 'time_cap' && (
                                    <div className="setting-group">
                                        <label>라운드당 시간 제한 (분):</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={workoutPattern.time_cap_per_round || 1}
                                            onChange={(e) => updatePattern('time_cap_per_round', parseInt(e.target.value) || 1)}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* 운동 선택 */}
                            <div className="exercise-selection">
                                <h4>운동 선택</h4>
                                <div className="exercise-grid">
                                    {exercises.map(exercise => {
                                        const isAlreadyAdded = workoutPattern?.exercises.some(ex => ex.exercise_id === exercise.id) || false;
                                        return (
                                            <div key={exercise.id} className={`exercise-item ${isAlreadyAdded ? 'added' : ''}`}>
                                                <div className="exercise-info">
                                                    <h5>{exercise.name}</h5>
                                                    <p>{exercise.description}</p>
                                                </div>
                                                <button
                                                    onClick={() => addExercise(exercise)}
                                                    className={`add-exercise-btn ${isAlreadyAdded ? 'added' : ''}`}
                                                    disabled={isAlreadyAdded}
                                                >
                                                    {isAlreadyAdded ? '추가됨' : '추가'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 선택된 운동들 */}
                            {workoutPattern.exercises.length > 0 && (
                                <div className="selected-exercises">
                                    <h4>선택된 운동</h4>
                                    {workoutPattern.exercises.map((exercise, index) => (
                                        <div key={index} className="selected-exercise-item">
                                            <div className="exercise-order">
                                                <button
                                                    onClick={() => moveExercise(index, 'up')}
                                                    disabled={index === 0}
                                                    className="order-btn"
                                                >
                                                    ↑
                                                </button>
                                                <span>{index + 1}</span>
                                                <button
                                                    onClick={() => moveExercise(index, 'down')}
                                                    disabled={index === workoutPattern.exercises.length - 1}
                                                    className="order-btn"
                                                >
                                                    ↓
                                                </button>
                                            </div>

                                            <div className="exercise-details">
                                                <h5>{exercise.exercise_name}</h5>
                                                <div className="exercise-settings">
                                                    <div className="setting-group">
                                                        <label>기본 횟수:</label>
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={exercise.base_reps}
                                                            onChange={(e) => updateExercise(index, 'base_reps', parseInt(e.target.value) || 1)}
                                                        />
                                                    </div>

                                                    <div className="setting-group">
                                                        <label>진행 방식:</label>
                                                        <select
                                                            value={exercise.progression_type}
                                                            onChange={(e) => updateExercise(index, 'progression_type', e.target.value)}
                                                        >
                                                            <option value="fixed">고정</option>
                                                            <option value="increase">증가</option>
                                                            <option value="decrease">감소</option>
                                                            <option value="mixed">혼합</option>
                                                        </select>
                                                    </div>

                                                    {(exercise.progression_type === 'increase' || exercise.progression_type === 'decrease') && (
                                                        <div className="setting-group">
                                                            <label>증가/감소 값:</label>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={exercise.progression_value || 1}
                                                                onChange={(e) => updateExercise(index, 'progression_value', parseInt(e.target.value) || 1)}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => removeExercise(index)}
                                                className="remove-btn"
                                            >
                                                제거
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* 미리보기 */}
                            <div className="wod-preview">
                                <h4>WOD 미리보기</h4>
                                <div className="preview-content">
                                    <p><strong>유형:</strong> {workoutPattern.type}</p>
                                    <p><strong>총 라운드:</strong> {workoutPattern.total_rounds}</p>
                                    {workoutPattern.time_cap_per_round && (
                                        <p><strong>라운드당 시간 제한:</strong> {workoutPattern.time_cap_per_round}분</p>
                                    )}
                                    <p><strong>설명:</strong> {workoutPattern.description}</p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default WODBuilder;
