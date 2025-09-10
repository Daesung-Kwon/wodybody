import React, { useState } from 'react';
import { LoginPageProps, User, ModalState } from '../types';
import { userApi } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import CustomModal from './CustomModal';

const LoginPage: React.FC<LoginPageProps> = ({ setUser, goRegister, goPrograms }) => {
    const { setUser: setAuthUser } = useAuth();
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [busy, setBusy] = useState<boolean>(false);
    const [modal, setModal] = useState<ModalState>({
        open: false,
        title: '',
        msg: '',
        type: 'info'
    });

    const show = (title: string, msg: string, type: ModalState['type'] = 'info') =>
        setModal({ open: true, title, msg, type });

    const close = () =>
        setModal({ open: false, title: '', msg: '', type: 'info' });

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setBusy(true);

        try {
            const data = await userApi.login({ email, password });
            const user: User = {
                id: data.user_id,
                email,
                name: data.name || ''
            };

            setAuthUser(user);
            setUser(user); // 기존 호환성을 위해 유지
            show('로그인 성공', `${data.name || email}님, 환영합니다!`, 'success');
            setTimeout(() => {
                close();
                goPrograms();
            }, 1000);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';

            if (errorMessage.includes('이메일과 비밀번호가 필요합니다')) {
                show('입력 오류', '이메일과 비밀번호를 모두 입력해주세요.', 'warning');
            } else if (errorMessage.includes('잘못된 인증정보')) {
                show('인증 실패', '이메일 또는 비밀번호가 올바르지 않습니다.', 'error');
            } else if (errorMessage.includes('등록되지 않은 이메일')) {
                show('계정 없음', '등록되지 않은 이메일입니다. 회원가입을 진행해주세요.', 'error');
            } else if (errorMessage.includes('Failed to fetch')) {
                show('연결 오류', '서버와의 연결에 실패했습니다. 네트워크를 확인하세요.', 'error');
            } else {
                show('오류', errorMessage, 'error');
            }
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <h2>크로스핏 프로그램 관리 시스템</h2>
                <form onSubmit={submit}>
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={busy}>
                        {busy ? '로그인 중...' : '로그인'}
                    </button>
                </form>
                <p>
                    계정이 없으신가요?{' '}
                    <button className="link-button" onClick={goRegister}>
                        회원가입
                    </button>
                </p>
            </div>
            <CustomModal
                isOpen={modal.open}
                onClose={close}
                title={modal.title}
                message={modal.msg}
                type={modal.type}
            />
        </div>
    );
};

export default LoginPage;
