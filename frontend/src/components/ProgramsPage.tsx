import React, { useState, useEffect } from 'react';
import { Program, ProgramWithParticipation, CreateWorkoutRecordRequest } from '../types';
import { programApi, participationApi, workoutRecordsApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import WorkoutTimer from './WorkoutTimer';
import WorkoutRecordModal from './WorkoutRecordModal';

const ProgramsPage: React.FC = () => {
    const [programs, setPrograms] = useState<ProgramWithParticipation[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [actionBusyId, setActionBusyId] = useState<number | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [showModal, setShowModal] = useState<boolean>(false);

    // 운동 타이머 관련 상태
    const [showTimer, setShowTimer] = useState<boolean>(false);
    const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
    const [completionTime, setCompletionTime] = useState<number>(0);
    const [isSavingRecord, setIsSavingRecord] = useState<boolean>(false);

    const load = async (): Promise<void> => {
        setBusy(true);
        try {
            const data = await programApi.getPrograms();
            setPrograms(data.programs || []);
        } catch (error) {
            console.error('프로그램 로딩 실패:', error);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const joinProgram = async (id: number): Promise<void> => {
        setActionBusyId(id);
        try {
            await participationApi.joinProgram(id);
            await load(); // 최신 참가자 수/상태 반영
            window.alert('참여 신청이 완료되었습니다!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '참여 신청 실패';
            window.alert(errorMessage);
        } finally {
            setActionBusyId(null);
        }
    };

    const leaveProgram = async (id: number): Promise<void> => {
        setActionBusyId(id);
        try {
            await participationApi.leaveProgram(id);
            await load();
            window.alert('WOD에서 신청 취소했습니다.');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '신청 취소 실패';
            window.alert(errorMessage);
        } finally {
            setActionBusyId(null);
        }
    };

    const getParticipationButton = (program: ProgramWithParticipation) => {
        const { participation_status, participants, max_participants } = program;

        if (participation_status === 'pending') {
            return (
                <button
                    className="register-button pending"
                    disabled={true}
                    title="참여 신청이 대기 중입니다"
                >
                    대기 중...
                </button>
            );
        }

        if (participation_status === 'approved') {
            return (
                <div className="approved-actions">
                    <button
                        className="register-button start-workout-button"
                        onClick={(e) => {
                            e.stopPropagation();
                            startWorkout(program);
                        }}
                        title="운동을 시작합니다"
                    >
                        🏃‍♂️ 운동 시작
                    </button>
                    <button
                        className="register-button approved"
                        onClick={(e) => {
                            e.stopPropagation();
                            leaveProgram(program.id);
                        }}
                        disabled={actionBusyId === program.id}
                        title="WOD에서 신청 취소합니다"
                    >
                        {actionBusyId === program.id ? '취소 중...' : '참여 취소'}
                    </button>
                </div>
            );
        }

        if (participation_status === 'rejected') {
            return (
                <button
                    className="register-button rejected"
                    disabled={true}
                    title="참여가 거부되었습니다"
                >
                    거부됨
                </button>
            );
        }

        // 참여하지 않은 상태
        return (
            <button
                className="register-button"
                onClick={(e) => {
                    e.stopPropagation();
                    joinProgram(program.id);
                }}
                disabled={actionBusyId === program.id || participants >= max_participants}
                title="프로그램에 참여 신청합니다"
            >
                {actionBusyId === program.id
                    ? '신청 중...'
                    : (participants >= max_participants ? '정원 마감' : '참여 신청')
                }
            </button>
        );
    };

    const openModal = (program: Program): void => {
        setSelectedProgram(program);
        setShowModal(true);
    };

    const closeModal = (): void => {
        setShowModal(false);
        setSelectedProgram(null);
    };

    const handleCardClick = (e: React.MouseEvent, program: Program): void => {
        // 버튼 클릭이 아닌 경우에만 모달 열기
        if (!(e.target as HTMLElement).closest('button')) {
            openModal(program);
        }
    };

    // 운동 시작
    const startWorkout = (program: Program): void => {
        setSelectedProgram(program);
        setShowTimer(true);
    };

    // 운동 완료
    const handleWorkoutComplete = (time: number): void => {
        setCompletionTime(time);
        setShowTimer(false);
        setShowRecordModal(true);
    };

    // 운동 취소
    const handleWorkoutCancel = (): void => {
        setShowTimer(false);
        setSelectedProgram(null);
    };

    // 기록 저장
    const handleSaveRecord = async (data: CreateWorkoutRecordRequest): Promise<void> => {
        if (!selectedProgram) return;

        setIsSavingRecord(true);
        try {
            await workoutRecordsApi.createRecord(selectedProgram.id, data);
            setShowRecordModal(false);
            setSelectedProgram(null);
            window.alert('운동 기록이 저장되었습니다!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '기록 저장 실패';
            window.alert(`기록 저장 중 오류가 발생했습니다: ${errorMessage}`);
        } finally {
            setIsSavingRecord(false);
        }
    };

    // 기록 모달 닫기
    const closeRecordModal = (): void => {
        setShowRecordModal(false);
        setSelectedProgram(null);
    };

    if (busy) return <LoadingSpinner label="프로그램 로딩 중..." />;

    return (
        <div className="programs-container">
            <div className="page-header">
                <h2>공개된 크로스핏 WOD</h2>
                <button
                    className="refresh-button"
                    onClick={load}
                    disabled={busy}
                    title="목록 새로고침"
                >
                    🔄
                </button>
            </div>
            {programs.length === 0 ? (
                <p>현재 공개된 WOD가 없습니다.</p>
            ) : (
                <div className="programs-grid">
                    {programs.map((program) => (
                        <div
                            key={program.id}
                            className="program-card clickable"
                            onClick={(e) => handleCardClick(e, program)}
                        >
                            <div className="program-header">
                                <h3>{program.title}</h3>
                                <div className="program-badge">
                                    {program.workout_type === 'wod' ? 'WOD' :
                                        program.workout_type === 'time_based' ? '시간 기반' : '횟수 기반'}
                                </div>
                            </div>

                            <p className="program-description">{program.description}</p>

                            <div className="program-summary">
                                <div className="program-info">
                                    <span className="creator">👤 {program.creator_name}</span>
                                    <span className="difficulty">💪 {program.difficulty}</span>
                                    <span className="participants">👥 {program.participants}/{program.max_participants}명</span>
                                </div>

                                {/* 간략한 운동 정보 */}
                                <div className="exercise-preview">
                                    {/* WOD 패턴이 있을 때는 WOD 패턴 운동 표시, 없을 때는 기존 방식 운동 표시 */}
                                    {program.workout_pattern && program.workout_pattern.exercises && program.workout_pattern.exercises.length > 0 ? (
                                        <div className="exercise-tags">
                                            {program.workout_pattern.exercises.slice(0, 3).map((exercise, index) => (
                                                <span key={index} className="exercise-tag">
                                                    {exercise.exercise_name}
                                                </span>
                                            ))}
                                            {program.workout_pattern.exercises.length > 3 && (
                                                <span className="exercise-tag more">
                                                    +{program.workout_pattern.exercises.length - 3}개 더
                                                </span>
                                            )}
                                        </div>
                                    ) : program.exercises && program.exercises.length > 0 ? (
                                        <div className="exercise-tags">
                                            {program.exercises.slice(0, 3).map((exercise, index) => (
                                                <span key={index} className="exercise-tag">
                                                    {exercise.name}
                                                </span>
                                            ))}
                                            {program.exercises.length > 3 && (
                                                <span className="exercise-tag more">
                                                    +{program.exercises.length - 3}개 더
                                                </span>
                                            )}
                                        </div>
                                    ) : null}

                                    {program.workout_pattern && (
                                        <div className="wod-preview">
                                            <span className="wod-tag">
                                                {program.workout_pattern.type} • {program.workout_pattern.total_rounds}라운드
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="program-actions">
                                {getParticipationButton(program)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* 상세 모달 */}
            {showModal && selectedProgram && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{selectedProgram.title}</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body program-detail-body">
                            <div className="program-details">
                                <div className="program-description">
                                    <h3>설명</h3>
                                    <p>{selectedProgram.description}</p>
                                </div>

                                {/* 기본 정보를 그리드 형태로 표시 */}
                                <div className="program-info-grid">
                                    <div className="info-item">
                                        <div className="info-icon">👤</div>
                                        <div className="info-content">
                                            <span className="info-label">작성자</span>
                                            <span className="info-value">{selectedProgram.creator_name}</span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">🏃‍♂️</div>
                                        <div className="info-content">
                                            <span className="info-label">운동 타입</span>
                                            <span className="info-value">
                                                {selectedProgram.workout_type === 'wod' ? 'WOD 패턴' :
                                                    selectedProgram.workout_type === 'time_based' ? '시간 기반' : '횟수 기반'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">🎯</div>
                                        <div className="info-content">
                                            <span className="info-label">목표</span>
                                            <span className="info-value">{selectedProgram.target_value}</span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">💪</div>
                                        <div className="info-content">
                                            <span className="info-label">난이도</span>
                                            <span className="info-value">
                                                {selectedProgram.difficulty === 'beginner' ? '초급' :
                                                    selectedProgram.difficulty === 'intermediate' ? '중급' : '고급'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">👥</div>
                                        <div className="info-content">
                                            <span className="info-label">참여자</span>
                                            <span className="info-value">{selectedProgram.participants}/{selectedProgram.max_participants}명</span>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">📅</div>
                                        <div className="info-content">
                                            <span className="info-label">등록일</span>
                                            <span className="info-value">{selectedProgram.created_at}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 운동 정보를 태그 형태로 표시 */}
                                {/* WOD 패턴이 없을 때만 기존 방식 운동 표시 */}
                                {!selectedProgram.workout_pattern && selectedProgram.exercises && selectedProgram.exercises.length > 0 && (
                                    <div className="exercises-section">
                                        <h3>포함된 운동</h3>
                                        <div className="exercise-tags">
                                            {selectedProgram.exercises.map((exercise, index) => (
                                                <div key={index} className="exercise-tag">
                                                    <span className="tag-name">{exercise.name}</span>
                                                    {exercise.target_value && (
                                                        <span className="tag-value">{exercise.target_value}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* WOD 패턴을 시각적으로 개선 */}
                                {selectedProgram.workout_pattern && (
                                    <div className="wod-section">
                                        <h3>WOD 패턴</h3>
                                        <div className="wod-pattern-card">
                                            <div className="wod-pattern-header">
                                                <div className="wod-pattern-type">{selectedProgram.workout_pattern.type}</div>
                                                <div className="wod-pattern-rounds">{selectedProgram.workout_pattern.total_rounds}라운드</div>
                                                {selectedProgram.workout_pattern.time_cap_per_round && (
                                                    <div className="wod-pattern-time">{selectedProgram.workout_pattern.time_cap_per_round}분 제한</div>
                                                )}
                                            </div>

                                            {selectedProgram.workout_pattern.description && (
                                                <div className="wod-pattern-description">
                                                    {selectedProgram.workout_pattern.description}
                                                </div>
                                            )}

                                            {selectedProgram.workout_pattern.exercises && selectedProgram.workout_pattern.exercises.length > 0 && (
                                                <div className="wod-pattern-exercises">
                                                    <h4>포함된 운동</h4>
                                                    <div className="wod-exercise-list">
                                                        {selectedProgram.workout_pattern.exercises.map((exercise, index) => (
                                                            <div key={index} className="wod-exercise-item">
                                                                <div className="wod-exercise-info">
                                                                    <span className="wod-exercise-name">{exercise.exercise_name}</span>
                                                                    <span className="wod-exercise-reps">{exercise.base_reps}회</span>
                                                                </div>
                                                                <div className="wod-exercise-progression">
                                                                    {exercise.progression_type === 'fixed' ? '고정' :
                                                                        exercise.progression_type === 'increase' ? `+${exercise.progression_value}회씩 증가` :
                                                                            exercise.progression_type === 'decrease' ? `-${exercise.progression_value}회씩 감소` :
                                                                                '혼합'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* 운동 타이머 */}
            {showTimer && selectedProgram && (
                <div className="modal-overlay timer-modal">
                    <div className="modal-content timer-content">
                        <WorkoutTimer
                            onComplete={handleWorkoutComplete}
                            onCancel={handleWorkoutCancel}
                            programTitle={selectedProgram.title}
                        />
                    </div>
                </div>
            )}

            {/* 운동 기록 저장 모달 */}
            {showRecordModal && selectedProgram && (
                <WorkoutRecordModal
                    isOpen={showRecordModal}
                    onClose={closeRecordModal}
                    onSave={handleSaveRecord}
                    completionTime={completionTime}
                    programTitle={selectedProgram.title}
                    isLoading={isSavingRecord}
                />
            )}
        </div>
    );
};

export default ProgramsPage;
