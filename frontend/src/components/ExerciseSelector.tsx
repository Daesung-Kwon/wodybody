import React, { useState, useEffect } from 'react';
import { ExerciseCategory, Exercise, SelectedExercise } from '../types';
import { exerciseApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';

interface ExerciseSelectorProps {
    selectedExercises: SelectedExercise[];
    onExercisesChange: (exercises: SelectedExercise[]) => void;
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
    selectedExercises,
    onExercisesChange
}) => {
    const [categories, setCategories] = useState<ExerciseCategory[]>([]);
    const [exercises, setExercises] = useState<Exercise[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    // 카테고리 로드
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const data = await exerciseApi.getCategories();
                setCategories(data.categories);
                if (data.categories.length > 0) {
                    setSelectedCategoryId(data.categories[0].id);
                }
            } catch (error) {
                console.error('카테고리 로딩 실패:', error);
            }
        };
        loadCategories();
    }, []);

    // 선택된 카테고리의 운동들 로드
    useEffect(() => {
        if (selectedCategoryId) {
            const loadExercises = async () => {
                setLoading(true);
                try {
                    const data = await exerciseApi.getExercises(selectedCategoryId);
                    setExercises(data.exercises);
                } catch (error) {
                    console.error('운동 로딩 실패:', error);
                } finally {
                    setLoading(false);
                }
            };
            loadExercises();
        }
    }, [selectedCategoryId]);

    // 운동 추가
    const addExercise = (exercise: Exercise) => {
        const newExercise: SelectedExercise = {
            exercise_id: exercise.id,
            target_value: '',
            order: selectedExercises.length
        };
        onExercisesChange([...selectedExercises, newExercise]);
    };

    // 운동 제거
    const removeExercise = (index: number) => {
        const newExercises = selectedExercises.filter((_, i) => i !== index);
        // 순서 재정렬
        const reorderedExercises = newExercises.map((ex, i) => ({
            ...ex,
            order: i
        }));
        onExercisesChange(reorderedExercises);
    };

    // 목표값 변경
    const updateTargetValue = (index: number, targetValue: string) => {
        const newExercises = [...selectedExercises];
        newExercises[index].target_value = targetValue;
        onExercisesChange(newExercises);
    };

    // 운동 순서 변경
    const moveExercise = (index: number, direction: 'up' | 'down') => {
        const newExercises = [...selectedExercises];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newExercises.length) {
            [newExercises[index], newExercises[targetIndex]] = [newExercises[targetIndex], newExercises[index]];
            // 순서 재정렬
            const reorderedExercises = newExercises.map((ex, i) => ({
                ...ex,
                order: i
            }));
            onExercisesChange(reorderedExercises);
        }
    };

    return (
        <div className="exercise-selector">
            <h3>운동 선택</h3>

            {/* 카테고리 선택 */}
            <div className="category-selector">
                <label>카테고리:</label>
                <select
                    value={selectedCategoryId || ''}
                    onChange={(e) => setSelectedCategoryId(Number(e.target.value))}
                >
                    {categories.map(category => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 운동 목록 */}
            <div className="exercise-list">
                <h4>운동 종류</h4>
                {loading ? (
                    <LoadingSpinner label="운동 로딩 중..." />
                ) : (
                    <div className="exercise-grid">
                        {exercises.map(exercise => (
                            <div key={exercise.id} className="exercise-item">
                                <div className="exercise-info">
                                    <h5>{exercise.name}</h5>
                                    <p>{exercise.description}</p>
                                </div>
                                <button
                                    onClick={() => addExercise(exercise)}
                                    className="add-exercise-btn"
                                >
                                    추가
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 선택된 운동 목록 */}
            {selectedExercises.length > 0 && (
                <div className="selected-exercises">
                    <h4>선택된 운동</h4>
                    {selectedExercises.map((selectedEx, index) => {
                        const exercise = exercises.find(ex => ex.id === selectedEx.exercise_id);
                        return (
                            <div key={`${selectedEx.exercise_id}-${index}`} className="selected-exercise-item">
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
                                        disabled={index === selectedExercises.length - 1}
                                        className="order-btn"
                                    >
                                        ↓
                                    </button>
                                </div>

                                <div className="exercise-details">
                                    <h5>{exercise?.name || '알 수 없는 운동'}</h5>
                                    <input
                                        type="text"
                                        placeholder="목표값 (예: 20분, 100회, 3세트)"
                                        value={selectedEx.target_value}
                                        onChange={(e) => updateTargetValue(index, e.target.value)}
                                        className="target-input"
                                    />
                                </div>

                                <button
                                    onClick={() => removeExercise(index)}
                                    className="remove-btn"
                                >
                                    제거
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ExerciseSelector;
