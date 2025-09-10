import React, { useState, useEffect } from 'react';
import { MyProgram, ModalState, ProgramParticipant } from '../types';
import { programApi, participationApi } from '../utils/api';
import LoadingSpinner from './LoadingSpinner';
import CustomModal from './CustomModal';

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

    const showModal = (title: string, msg: string, type: ModalState['type'] = 'info') =>
        setModal({ open: true, title, msg, type });

    const closeModal = () =>
        setModal({ open: false, title: '', msg: '', type: 'info' });

    const closeParticipantsModal = () =>
        setParticipantsModal({ open: false, programId: null, participants: [] });

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
                else if (result.status === 'left') status = '탈퇴함';
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

    const deleteProgram = async (id: number, title: string): Promise<void> => {
        if (!window.confirm(`"${title}" 프로그램을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
            return;
        }

        try {
            await programApi.deleteProgram(id);
            showModal('삭제 완료', '프로그램이 삭제되었습니다.', 'success');
            await load(); // 목록 새로고침
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '삭제 실패';
            showModal('오류', errorMessage, 'error');
        }
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
            showModal('처리 완료', `참여자가 ${action === 'approve' ? '승인' : '거부'}되었습니다.`, 'success');
            // 참여자 목록 새로고침
            const data = await participationApi.getProgramParticipants(programId);
            setParticipantsModal(prev => ({
                ...prev,
                participants: data.participants
            }));
        } catch (error) {
            let errorMessage = '처리 실패';
            if (error instanceof Error) {
                errorMessage = error.message;
                // 정원 초과 에러 메시지 개선
                if (errorMessage.includes('참여자 수가 가득 찼습니다')) {
                    errorMessage = '정원이 가득 찼습니다. 더 이상 참여자를 승인할 수 없습니다.';
                }
            }
            showModal('오류', errorMessage, 'error');
        }
    };

    if (busy) return <LoadingSpinner label="내 프로그램 로딩 중..." />;

    return (
        <div className="programs-container">
            <h2>내가 등록한 프로그램</h2>
            {mine.length === 0 ? (
                <p>등록한 프로그램이 없습니다.</p>
            ) : (
                <div className="programs-grid">
                    {mine.map((program) => (
                        <div key={program.id} className="program-card">
                            <h3>{program.title}</h3>
                            <p className="program-description">{program.description}</p>
                            <div className="program-details">
                                <p><strong>상태:</strong> {program.is_open ? '공개됨' : '비공개'}</p>
                                <p><strong>참여자:</strong> {program.participants}/{program.max_participants}명</p>
                                <p><strong>등록일:</strong> {program.created_at}</p>
                            </div>
                            <div className="program-actions">
                                {!program.is_open ? (
                                    <button
                                        className="open-button"
                                        onClick={() => open(program.id)}
                                    >
                                        프로그램 공개하기
                                    </button>
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
                                    onClick={() => deleteProgram(program.id, program.title)}
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
                <div className="modal-overlay" onClick={closeParticipantsModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>참여자 관리</h3>
                            <button className="close-button" onClick={closeParticipantsModal}>×</button>
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
                                                    {participant.status === 'left' && '탈퇴함'}
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
        </div>
    );
};

export default MyProgramsPage;
