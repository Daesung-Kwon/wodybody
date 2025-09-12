import React, { useState } from 'react';
import { CreateProgramPageProps, CreateProgramForm, SelectedExercise, WorkoutPattern } from '../types';
import { programApi } from '../utils/api';
import ExerciseSelector from './ExerciseSelector';
import WODBuilder from './WODBuilder';

type ExerciseMode = 'simple' | 'wod' | null;

interface StepData {
    // 1단계: 기본 정보
    title: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    max_participants: number;

    // 2단계: 운동 방식
    exercise_mode: ExerciseMode;

    // 3단계: 운동 설정 (조건부)
    selected_exercises: SelectedExercise[];
    workout_pattern: WorkoutPattern | null;
    target_value: string; // 간단한 방식용
}

const StepBasedCreateProgramPage: React.FC<CreateProgramPageProps> = ({ goMy, goPrograms }) => {
    const [currentStep, setCurrentStep] = useState<number>(1);
    const [busy, setBusy] = useState<boolean>(false);
    const [stepData, setStepData] = useState<StepData>({
        title: '',
        description: '',
        difficulty: 'beginner',
        max_participants: 20,
        exercise_mode: null,
        selected_exercises: [],
        workout_pattern: null,
        target_value: ''
    });

    const totalSteps = 4;

    const updateStepData = (updates: Partial<StepData>) => {
        setStepData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const canProceedToNext = (): boolean => {
        switch (currentStep) {
            case 1:
                return stepData.title.trim() !== '' && stepData.description.trim() !== '';
            case 2:
                return stepData.exercise_mode !== null;
            case 3:
                if (stepData.exercise_mode === 'simple') {
                    return stepData.selected_exercises.length > 0 && stepData.target_value.trim() !== '';
                } else if (stepData.exercise_mode === 'wod') {
                    return stepData.workout_pattern !== null && stepData.workout_pattern.exercises.length > 0;
                }
                return false;
            case 4:
                return true;
            default:
                return false;
        }
    };

    const submit = async () => {
        setBusy(true);
        try {
            const formData: CreateProgramForm = {
                title: stepData.title,
                description: stepData.description,
                difficulty: stepData.difficulty,
                max_participants: stepData.max_participants,
                workout_type: stepData.exercise_mode === 'wod' ? 'wod' : 'time_based',
                target_value: stepData.target_value,
                selected_exercises: stepData.selected_exercises,
                workout_pattern: stepData.workout_pattern
            };

            await programApi.createProgram(formData);
            window.alert('WOD가 등록되었습니다');
            goMy();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '등록 실패';
            window.alert(errorMessage);
        } finally {
            setBusy(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="step-indicator">
            {Array.from({ length: totalSteps }, (_, index) => (
                <div key={index} className={`step ${index + 1 <= currentStep ? 'active' : ''}`}>
                    <div className="step-number">{index + 1}</div>
                    <div className="step-label">
                        {index === 0 && '기본 정보'}
                        {index === 1 && '운동 방식'}
                        {index === 2 && '운동 설정'}
                        {index === 3 && '최종 확인'}
                    </div>
                </div>
            ))}
        </div>
    );

    const renderStep1 = () => (
        <div className="step-content">
            <h3>기본 정보 입력</h3>
            <div className="form-group">
                <label>WOD 제목 *</label>
                <input
                    type="text"
                    placeholder="예: 아침 크로스핏 클래스"
                    value={stepData.title}
                    onChange={(e) => updateStepData({ title: e.target.value })}
                    required
                />
            </div>
            <div className="form-group">
                <label>WOD 설명 *</label>
                <textarea
                    placeholder="WOD에 대한 자세한 설명을 입력하세요"
                    value={stepData.description}
                    onChange={(e) => updateStepData({ description: e.target.value })}
                    rows={4}
                />
            </div>
            <div className="form-row">
                <div className="form-group">
                    <label>난이도</label>
                    <select
                        value={stepData.difficulty}
                        onChange={(e) => updateStepData({ difficulty: e.target.value as 'beginner' | 'intermediate' | 'advanced' })}
                    >
                        <option value="beginner">초급</option>
                        <option value="intermediate">중급</option>
                        <option value="advanced">고급</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>최대 참가자 수</label>
                    <input
                        type="number"
                        min="1"
                        max="200"
                        value={stepData.max_participants}
                        onChange={(e) => updateStepData({ max_participants: parseInt(e.target.value) || 20 })}
                    />
                </div>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="step-content">
            <h3>운동 방식 선택</h3>
            <div className="exercise-mode-selection">
                <div
                    className={`mode-card ${stepData.exercise_mode === 'simple' ? 'selected' : ''}`}
                    onClick={() => updateStepData({ exercise_mode: 'simple' })}
                >
                    <div className="mode-icon">🏃‍♂️</div>
                    <h4>간단한 운동</h4>
                    <p>기본적인 운동 목록과 목표값을 설정하는 방식입니다.</p>
                    <ul>
                        <li>운동 종류 선택</li>
                        <li>목표 시간/횟수 설정</li>
                        <li>빠른 설정 가능</li>
                    </ul>
                </div>
                <div
                    className={`mode-card ${stepData.exercise_mode === 'wod' ? 'selected' : ''}`}
                    onClick={() => updateStepData({ exercise_mode: 'wod' })}
                >
                    <div className="mode-icon">💪</div>
                    <h4>WOD (Workout of the Day)</h4>
                    <p>복잡한 운동 패턴과 라운드 시스템을 설정하는 방식입니다.</p>
                    <ul>
                        <li>다양한 운동 패턴</li>
                        <li>라운드별 설정</li>
                        <li>진행 방식 커스터마이징</li>
                    </ul>
                </div>
            </div>
        </div>
    );

    const renderStep3 = () => {
        if (stepData.exercise_mode === 'simple') {
            return (
                <div className="step-content">
                    <h3>간단한 운동 설정</h3>
                    <div className="form-group">
                        <label>목표값 *</label>
                        <input
                            type="text"
                            placeholder="예: 20분, 100회, 5km"
                            value={stepData.target_value}
                            onChange={(e) => updateStepData({ target_value: e.target.value })}
                        />
                    </div>
                    <ExerciseSelector
                        selectedExercises={stepData.selected_exercises}
                        onExercisesChange={(exercises) => updateStepData({ selected_exercises: exercises })}
                    />
                </div>
            );
        } else if (stepData.exercise_mode === 'wod') {
            return (
                <div className="step-content">
                    <h3>WOD 패턴 설정</h3>
                    <WODBuilder
                        workoutPattern={stepData.workout_pattern}
                        onPatternChange={(pattern) => updateStepData({ workout_pattern: pattern })}
                    />
                </div>
            );
        }
        return null;
    };

    const renderStep4 = () => (
        <div className="step-content">
            <h3>최종 확인</h3>
            <div className="review-card">
                <h4>WOD 정보</h4>
                <div className="review-section">
                    <strong>제목:</strong> {stepData.title}
                </div>
                <div className="review-section">
                    <strong>설명:</strong> {stepData.description}
                </div>
                <div className="review-section">
                    <strong>난이도:</strong> {
                        stepData.difficulty === 'beginner' ? '초급' :
                            stepData.difficulty === 'intermediate' ? '중급' : '고급'
                    }
                </div>
                <div className="review-section">
                    <strong>최대 참가자:</strong> {stepData.max_participants}명
                </div>
                <div className="review-section">
                    <strong>운동 방식:</strong> {
                        stepData.exercise_mode === 'simple' ? '간단한 운동' : 'WOD 패턴'
                    }
                </div>

                {stepData.exercise_mode === 'simple' && (
                    <div className="review-section">
                        <strong>목표값:</strong> {stepData.target_value}
                        <br />
                        <strong>선택된 운동:</strong> {stepData.selected_exercises.length}개
                    </div>
                )}

                {stepData.exercise_mode === 'wod' && stepData.workout_pattern && (
                    <div className="review-section">
                        <strong>WOD 패턴:</strong>
                        <div className="wod-preview">
                            {stepData.workout_pattern.description}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    const renderCurrentStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return null;
        }
    };

    return (
        <div className="step-based-create-container">
            <div className="create-header">
                <h2>새 크로스핏 WOD 등록</h2>
                {renderStepIndicator()}
            </div>

            <div className="step-container">
                {renderCurrentStep()}
            </div>

            <div className="step-navigation">
                {currentStep > 1 && (
                    <button
                        type="button"
                        onClick={prevStep}
                        className="nav-button prev"
                    >
                        이전
                    </button>
                )}

                {currentStep < totalSteps ? (
                    <button
                        type="button"
                        onClick={nextStep}
                        disabled={!canProceedToNext()}
                        className="nav-button next"
                    >
                        다음
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={submit}
                        disabled={!canProceedToNext() || busy}
                        className="nav-button submit"
                    >
                        {busy ? '등록 중...' : 'WOD 등록'}
                    </button>
                )}

                <button
                    type="button"
                    onClick={goPrograms}
                    className="nav-button cancel"
                >
                    취소
                </button>
            </div>
        </div>
    );
};

export default StepBasedCreateProgramPage;
