import React, { useState, useEffect } from 'react';
import { MyProgram, ModalState } from '../types';
import { programApi } from '../utils/api';
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

    const showModal = (title: string, msg: string, type: ModalState['type'] = 'info') =>
        setModal({ open: true, title, msg, type });

    const closeModal = () =>
        setModal({ open: false, title: '', msg: '', type: 'info' });

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
                showModal('결과 없음', '아직 신청자가 없습니다.', 'info');
                return;
            }

            const lines = data.results.map((result) => {
                const status = result.completed ? '완료' : '신청';
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
                                    <button
                                        className="results-button"
                                        onClick={() => results(program.id)}
                                    >
                                        참여자 결과 보기
                                    </button>
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
        </div>
    );
};

export default MyProgramsPage;
