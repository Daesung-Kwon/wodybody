import React, { useState } from 'react';
import { CreateProgramPageProps, CreateProgramForm, SelectedExercise, WorkoutPattern } from '../types';
import { programApi } from '../utils/api';
import ExerciseSelector from './ExerciseSelector';
import WODBuilder from './WODBuilder';

const CreateProgramPage: React.FC<CreateProgramPageProps> = ({ goMy, goPrograms }) => {
    const [form, setForm] = useState<CreateProgramForm>({
        title: '',
        description: '',
        workout_type: 'time_based',
        target_value: '',  // 기존 호환성을 위해 유지
        difficulty: 'beginner',
        max_participants: 20,
        selected_exercises: [],  // 기존 운동 선택
        workout_pattern: null  // 새로운 WOD 패턴
    });
    const [busy, setBusy] = useState<boolean>(false);

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: name === 'max_participants' ? parseInt(value) || 20 : value
        }));
    };

    const handleExercisesChange = (exercises: SelectedExercise[]) => {
        setForm(prev => ({
            ...prev,
            selected_exercises: exercises
        }));
    };

    const handleWorkoutPatternChange = (pattern: WorkoutPattern | null) => {
        setForm(prev => ({
            ...prev,
            workout_pattern: pattern
        }));
    };

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);

        try {
            await programApi.createProgram(form);
            window.alert('WOD가 등록되었습니다');
            goMy();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '등록 실패';
            window.alert(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="create-program-container">
            <h2>새 크로스핏 WOD 등록</h2>
            <form onSubmit={submit} className="create-program-form">
                <input
                    name="title"
                    placeholder="WOD 제목"
                    value={form.title}
                    onChange={onChange}
                    required
                />
                <textarea
                    name="description"
                    placeholder="WOD 설명"
                    value={form.description}
                    onChange={onChange}
                    rows={4}
                />
                <select
                    name="workout_type"
                    value={form.workout_type}
                    onChange={onChange}
                >
                    <option value="time_based">시간 기반</option>
                    <option value="rep_based">횟수 기반</option>
                </select>
                <input
                    name="target_value"
                    placeholder="목표 (예: 20분, 100회)"
                    value={form.target_value}
                    onChange={onChange}
                />
                <select
                    name="difficulty"
                    value={form.difficulty}
                    onChange={onChange}
                >
                    <option value="beginner">초급</option>
                    <option value="intermediate">중급</option>
                    <option value="advanced">고급</option>
                </select>
                <input
                    type="number"
                    name="max_participants"
                    min="1"
                    max="200"
                    value={form.max_participants === 0 ? '' : form.max_participants}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === '') {
                            setForm(prev => ({ ...prev, max_participants: 0 }));
                        } else {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue) && numValue >= 1 && numValue <= 200) {
                                setForm(prev => ({ ...prev, max_participants: numValue }));
                            }
                        }
                    }}
                    onBlur={(e) => {
                        const value = e.target.value;
                        if (value === '' || parseInt(value) < 1) {
                            setForm(prev => ({ ...prev, max_participants: 20 }));
                        }
                    }}
                />

                {/* 운동 선택기 (기존 방식) */}
                <ExerciseSelector
                    selectedExercises={form.selected_exercises}
                    onExercisesChange={handleExercisesChange}
                />

                {/* WOD 빌더 (새로운 방식) */}
                <WODBuilder
                    workoutPattern={form.workout_pattern}
                    onPatternChange={handleWorkoutPatternChange}
                />

                <div className="form-buttons">
                    <button type="submit" disabled={busy}>
                        {busy ? '등록 중...' : 'WOD 등록'}
                    </button>
                    <button type="button" onClick={goPrograms}>
                        취소
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CreateProgramPage;
