import React, { useState, useEffect } from 'react';
import { MyProgram, ModalState, ProgramParticipant, CreateProgramForm } from '../types';
import { programApi, participationApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import CustomModal from './CustomModal';
import ConfirmAlert from './ConfirmAlert';

const MyProgramsPage: React.FC = () => {
    const [mine, setMine] = useState<MyProgram[]>([]);
    const [busy, setBusy] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>({
        open: false,
        title: '',
        msg: '',
        type: 'info'
    });
    const [participantsModal, setParticipantsModal] = useState<{
        open: boolean;
        programId: number | null;
        participants: ProgramParticipant[];
        maxParticipants?: number;
        approvedCount?: number;
    }>({
        open: false,
        programId: null,
        participants: []
    });
    const [confirmAlert, setConfirmAlert] = useState<{
        open: boolean;
        title: string;
        message: string;
        programId: number | null;
    }>({
        open: false,
        title: '',
        message: '',
        programId: null
    });

    const [editModal, setEditModal] = useState<{
        open: boolean;
        program: MyProgram | null;
        formData: CreateProgramForm;
    }>({
        open: false,
        program: null,
        formData: {
            title: '',
            description: '',
            workout_type: 'time_based',
            target_value: '',
            difficulty: 'beginner',
            max_participants: 20,
            selected_exercises: [],
            workout_pattern: null
        }
    });

    const showModal = (title: string, msg: string, type: ModalState['type'] = 'info') =>
        setModal({ open: true, title, msg, type });

    const closeModal = () =>
        setModal({ open: false, title: '', msg: '', type: 'info' });

    const closeParticipantsModal = () =>
        setParticipantsModal({ open: false, programId: null, participants: [] });

    const openEditModal = async (program: MyProgram) => {
        try {
            // 프로그램 상세 정보를 가져와서 운동 정보를 로드
            const response = await programApi.getProgramDetail(program.id);
            const programDetail = response.program;

            setEditModal({
                open: true,
                program,
                formData: {
                    title: program.title,
                    description: program.description,
                    workout_type: program.workout_type,
                    target_value: program.target_value,
                    difficulty: program.difficulty,
                    max_participants: program.max_participants,
                    selected_exercises: programDetail.exercises.map(ex => ({
                        exercise_id: ex.id,
                        name: ex.name,
                        target_value: ex.target_value,
                        order: ex.order
                    })),
                    workout_pattern: programDetail.workout_pattern || null
                }
            });
        } catch (error) {
            console.error('프로그램 상세 정보 로드 실패:', error);
            // 오류 메시지 표시
            showModal('오류', '프로그램 상세 정보를 불러올 수 없습니다. 잠시 후 다시 시도해주세요.', 'error');
        }
    };

    const closeEditModal = () =>
        setEditModal({
            open: false, program: null, formData: {
                title: '',
                description: '',
                workout_type: 'time_based',
                target_value: '',
                difficulty: 'beginner',
                max_participants: 20,
                selected_exercises: [],
                workout_pattern: null
            }
        });

    const updateProgram = async (): Promise<void> => {
        if (!editModal.program) return;

        try {
            await programApi.updateProgram(editModal.program.id, editModal.formData);
            await load();
            closeEditModal();
            showModal('성공', '프로그램이 성공적으로 수정되었습니다.', 'success');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '프로그램 수정 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const load = async (): Promise<void> => {
        setBusy(true);
        try {
            const data = await programApi.getMyPrograms();
            setMine(data.programs || []);
        } catch (error) {
            console.error('내 프로그램 로딩 실패:', error);
        } finally {
            setBusy(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const open = async (id: number): Promise<void> => {
        try {
            await programApi.openProgram(id);
            await load();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '프로그램 공개 실패';
            window.alert(errorMessage);
        }
    };

    const results = async (id: number): Promise<void> => {
        try {
            const data = await programApi.getProgramResults(id);

            if (!data.results || data.results.length === 0) {
                showModal('결과 없음', '아직 참여자가 없습니다.', 'info');
                return;
            }

            const lines = data.results.map((result) => {
                let status = '';
                if (result.status === 'pending') status = '대기 중';
                else if (result.status === 'approved') status = '승인됨';
                else if (result.status === 'rejected') status = '거부됨';
                else if (result.status === 'left') status = '신청 취소함';
                else status = result.completed ? '완료' : '신청';

                const resultText = result.result ? ` - 결과: ${result.result}` : '';
                return `${result.user_name} (${status})${resultText}`;
            });

            showModal('참여자 결과', lines.join('\n'), 'info');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '결과 조회 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const showDeleteConfirm = (id: number, title: string): void => {
        setConfirmAlert({
            open: true,
            title: 'WOD 삭제 확인',
            message: `"${title}" WOD를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
            programId: id
        });
    };

    const deleteProgram = async (): Promise<void> => {
        if (!confirmAlert.programId) return;

        try {
            await programApi.deleteProgram(confirmAlert.programId);
            showModal('삭제 완료', 'WOD가 삭제되었습니다.', 'success');
            await load(); // 목록 새로고침
            setConfirmAlert({ open: false, title: '', message: '', programId: null });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '삭제 실패';
            showModal('오류', errorMessage, 'error');
            setConfirmAlert({ open: false, title: '', message: '', programId: null });
        }
    };

    const cancelDelete = (): void => {
        setConfirmAlert({ open: false, title: '', message: '', programId: null });
    };

    const manageParticipants = async (programId: number): Promise<void> => {
        try {
            const data = await participationApi.getProgramParticipants(programId);
            // 현재 프로그램 정보도 함께 가져와서 정원 정보 확인
            const program = mine.find(p => p.id === programId);
            setParticipantsModal({
                open: true,
                programId,
                participants: data.participants,
                maxParticipants: program?.max_participants || 0,
                approvedCount: data.approved_count
            });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '참여자 목록 조회 실패';
            showModal('오류', errorMessage, 'error');
        }
    };

    const approveParticipant = async (programId: number, userId: number, action: 'approve' | 'reject'): Promise<void> => {
        try {
            await participationApi.approveParticipant(programId, userId, action);

            // 참여자 목록 새로고침 (성공 시)
            const data = await participationApi.getProgramParticipants(programId);
            setParticipantsModal(prev => ({
                ...prev,
                participants: data.participants,
                approvedCount: data.approved_count
            }));

            // 성공 메시지 표시 (모달 위에 표시되도록 z-index 높게)
            showModal('처리 완료', `참여자가 ${action === 'approve' ? '승인' : '거부'}되었습니다.`, 'success');

        } catch (error) {
            let errorMessage = '처리 실패';
            if (error instanceof Error) {
                errorMessage = error.message;
                // 정원 초과 에러 메시지 개선
                if (errorMessage.includes('정원이 가득 찼습니다')) {
                    errorMessage = '정원이 가득 찼습니다. 더 이상 참여자를 승인할 수 없습니다.';
                }
            }
            // 에러 메시지 표시 (모달 위에 표시되도록 z-index 높게)
            showModal('오류', errorMessage, 'error');
        }
    };

    if (busy) return <LoadingSpinner label="내 프로그램 로딩 중..." />;

    return (
        <div className="programs-container">
            <div className="page-header">
                <h2>내가 등록한 WOD</h2>
                <button
                    className="refresh-button"
                    onClick={load}
                    disabled={busy}
                    title="목록 새로고침"
                >
                    🔄
                </button>
            </div>
            {mine.length === 0 ? (
                <p>등록한 WOD가 없습니다.</p>
            ) : (
                <div className="programs-grid">
                    {mine.map((program) => (
                        <div key={program.id} className="program-card">
                            <h3>{program.title}</h3>
                            <p className="program-description">{program.description}</p>

                            {/* 운동 정보를 태그 형태로 표시 */}
                            {program.exercises && program.exercises.length > 0 && (
                                <div className="exercises-section">
                                    <h4>포함된 운동</h4>
                                    <div className="exercise-tags">
                                        {program.exercises.map((exercise, index) => (
                                            <span key={index} className="exercise-tag">
                                                {exercise.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="program-details">
                                <p><strong>상태:</strong> {program.is_open ? '공개됨' : '비공개'}</p>
                                <p><strong>참여자:</strong> {program.participants}/{program.max_participants}명</p>
                                <p><strong>등록일:</strong> {program.created_at}</p>
                            </div>
                            <div className="program-actions">
                                {!program.is_open ? (
                                    <>
                                        <button
                                            className="edit-button"
                                            onClick={() => openEditModal(program)}
                                        >
                                            수정
                                        </button>
                                        <button
                                            className="open-button"
                                            onClick={() => open(program.id)}
                                        >
                                            프로그램 공개하기
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="results-button"
                                            onClick={() => results(program.id)}
                                        >
                                            참여자 결과 보기
                                        </button>
                                        <button
                                            className="manage-button"
                                            onClick={() => manageParticipants(program.id)}
                                        >
                                            참여자 관리
                                        </button>
                                    </>
                                )}

                                <button
                                    className="delete-button"
                                    onClick={() => showDeleteConfirm(program.id, program.title)}
                                >
                                    삭제
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <CustomModal
                isOpen={modal.open}
                onClose={closeModal}
                title={modal.title}
                message={modal.msg}
                type={modal.type}
            />

            {/* 참여자 관리 모달 */}
            {participantsModal.open && (
                <div className="modal-overlay participants-modal" onClick={closeParticipantsModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>참여자 관리</h3>
                            <div className="modal-header-actions">
                                <button
                                    className="refresh-button"
                                    onClick={() => participantsModal.programId && manageParticipants(participantsModal.programId)}
                                    title="참여자 목록 새로고침"
                                >
                                    🔄
                                </button>
                                <button className="close-button" onClick={closeParticipantsModal}>×</button>
                            </div>
                        </div>
                        <div className="modal-body">
                            {participantsModal.participants.length === 0 ? (
                                <p>참여자가 없습니다.</p>
                            ) : (
                                <div className="participants-list">
                                    {participantsModal.participants.map((participant) => (
                                        <div key={participant.id} className="participant-item">
                                            <div className="participant-info">
                                                <strong>{participant.user_name}</strong>
                                                <span className={`status status-${participant.status}`}>
                                                    {participant.status === 'pending' && '대기 중'}
                                                    {participant.status === 'approved' && '승인됨'}
                                                    {participant.status === 'rejected' && '거부됨'}
                                                    {participant.status === 'left' && '신청 취소함'}
                                                </span>
                                                <small>신청일: {new Date(participant.joined_at).toLocaleDateString()}</small>
                                            </div>
                                            {participant.status === 'pending' && (
                                                <div className="participant-actions">
                                                    <button
                                                        className={`approve-button ${(participantsModal.approvedCount || 0) >= (participantsModal.maxParticipants || 0) ? 'disabled' : ''}`}
                                                        onClick={() => approveParticipant(participantsModal.programId!, participant.user_id, 'approve')}
                                                        disabled={(participantsModal.approvedCount || 0) >= (participantsModal.maxParticipants || 0)}
                                                        title={(participantsModal.approvedCount || 0) >= (participantsModal.maxParticipants || 0) ? '정원이 가득 찼습니다' : ''}
                                                    >
                                                        승인
                                                    </button>
                                                    <button
                                                        className="reject-button"
                                                        onClick={() => approveParticipant(participantsModal.programId!, participant.user_id, 'reject')}
                                                    >
                                                        거부
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 프로그램 수정 모달 - 공개된 WOD 상세 보기와 동일한 디자인 */}
            {editModal.open && (
                <div className="modal-overlay edit-modal" onClick={closeEditModal}>
                    <div className="modal-content program-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>WOD 수정</h2>
                            <button className="modal-close" onClick={closeEditModal}>×</button>
                        </div>
                        <div className="modal-body program-detail-body">
                            <div className="program-details">
                                {/* 프로그램 설명 */}
                                <div className="program-description">
                                    <h3>설명</h3>
                                    <textarea
                                        value={editModal.formData.description}
                                        onChange={(e) => setEditModal({
                                            ...editModal,
                                            formData: { ...editModal.formData, description: e.target.value }
                                        })}
                                        className="description-textarea"
                                        placeholder="WOD에 대한 설명을 입력하세요"
                                    />
                                </div>

                                {/* 기본 정보를 그리드 형태로 표시 */}
                                <div className="program-info-grid">
                                    <div className="info-item">
                                        <div className="info-icon">📝</div>
                                        <div className="info-content">
                                            <div className="info-label">제목</div>
                                            <input
                                                type="text"
                                                value={editModal.formData.title}
                                                onChange={(e) => setEditModal({
                                                    ...editModal,
                                                    formData: { ...editModal.formData, title: e.target.value }
                                                })}
                                                className="info-input"
                                                placeholder="WOD 제목을 입력하세요"
                                            />
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">⏱️</div>
                                        <div className="info-content">
                                            <div className="info-label">목표 값</div>
                                            <input
                                                type="text"
                                                value={editModal.formData.target_value}
                                                onChange={(e) => setEditModal({
                                                    ...editModal,
                                                    formData: { ...editModal.formData, target_value: e.target.value }
                                                })}
                                                className="info-input"
                                                placeholder="예: 20분, 100회, 3라운드"
                                            />
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">🏃</div>
                                        <div className="info-content">
                                            <div className="info-label">운동 유형</div>
                                            <div className="info-value disabled">
                                                {editModal.formData.workout_type === 'time_based' ? '시간 기반' :
                                                    editModal.formData.workout_type === 'rep_based' ? '횟수 기반' : 'WOD'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">📊</div>
                                        <div className="info-content">
                                            <div className="info-label">난이도</div>
                                            <div className="info-value disabled">
                                                {editModal.formData.difficulty === 'beginner' ? '초급' :
                                                    editModal.formData.difficulty === 'intermediate' ? '중급' : '고급'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="info-item">
                                        <div className="info-icon">👥</div>
                                        <div className="info-content">
                                            <div className="info-label">최대 참여자 수</div>
                                            <input
                                                type="text"
                                                value={editModal.formData.max_participants}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    // 숫자만 입력 허용
                                                    if (value === '' || /^\d+$/.test(value)) {
                                                        const numValue = value === '' ? 1 : parseInt(value);
                                                        if (numValue >= 1 && numValue <= 100) {
                                                            setEditModal({
                                                                ...editModal,
                                                                formData: { ...editModal.formData, max_participants: numValue }
                                                            });
                                                        }
                                                    }
                                                }}
                                                className="info-input"
                                                placeholder="1-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* 운동 정보를 공개 WOD 상세 보기와 동일한 형태로 표시 */}
                                {editModal.formData.selected_exercises.length > 0 && (
                                    <div className="exercises-section">
                                        <h3>운동 구성</h3>
                                        <div className="wod-exercise-list">
                                            {editModal.formData.selected_exercises.map((exercise, index) => (
                                                <div key={index} className="wod-exercise-item">
                                                    <div className="wod-exercise-info">
                                                        <span className="wod-exercise-name">{exercise.name || `운동 ${index + 1}`}</span>
                                                        <div className="wod-exercise-target-edit">
                                                            <label>목표값:</label>
                                                            <input
                                                                type="text"
                                                                value={exercise.target_value}
                                                                onChange={(e) => {
                                                                    const newExercises = [...editModal.formData.selected_exercises];
                                                                    newExercises[index].target_value = e.target.value;
                                                                    setEditModal({
                                                                        ...editModal,
                                                                        formData: { ...editModal.formData, selected_exercises: newExercises }
                                                                    });
                                                                }}
                                                                className="wod-exercise-input"
                                                                placeholder="예: 10회, 20분"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <small className="form-hint">운동의 목표 값만 수정할 수 있습니다</small>
                                    </div>
                                )}

                                {/* WOD 패턴을 시각적으로 개선 */}
                                {editModal.formData.workout_pattern && (
                                    <div className="wod-section">
                                        <h3>WOD 패턴</h3>
                                        <div className="wod-pattern-card">
                                            <div className="wod-pattern-header">
                                                <span className="wod-pattern-type">
                                                    {editModal.formData.workout_pattern.type === 'time_cap' ? '시간 제한' : '라운드 제한'}
                                                </span>
                                                <span className="wod-pattern-rounds">
                                                    {editModal.formData.workout_pattern.total_rounds}라운드
                                                </span>
                                                {editModal.formData.workout_pattern.time_cap_per_round && (
                                                    <span className="wod-pattern-time">
                                                        {editModal.formData.workout_pattern.time_cap_per_round}분/라운드
                                                    </span>
                                                )}
                                            </div>
                                            <div className="wod-pattern-description">
                                                {editModal.formData.workout_pattern.description}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-button primary" onClick={updateProgram}>
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 커스텀 컨펌 알럿 */}
            <ConfirmAlert
                isOpen={confirmAlert.open}
                title={confirmAlert.title}
                message={confirmAlert.message}
                confirmText="삭제"
                cancelText="취소"
                onConfirm={deleteProgram}
                onCancel={cancelDelete}
                type="danger"
            />
        </div>
    );
};

export default MyProgramsPage;
