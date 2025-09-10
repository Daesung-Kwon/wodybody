import React, { useState } from 'react';
import { RegisterPageProps, ModalState } from '../types';
import { userApi } from '../utils/api';
import CustomModal from './CustomModal';

const RegisterPage: React.FC<RegisterPageProps> = ({ goLogin }) => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [name, setName] = useState<string>('');
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

    const validate = (): boolean => {
        if (!name.trim() || name.trim().length < 2) {
            show('입력 오류', '이름은 2자 이상 입력해주세요.', 'warning');
            return false;
        }
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            show('입력 오류', '올바른 이메일 형식을 입력해주세요.', 'warning');
            return false;
        }
        if (!password || password.length < 6) {
            show('입력 오류', '비밀번호는 6자 이상 입력해주세요.', 'warning');
            return false;
        }
        return true;
    };

    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!validate()) return;
        setBusy(true);

        try {
            await userApi.register({ email, password, name });
            show('회원가입 완료', `${name}님, 회원가입이 완료되었습니다.`, 'success');
            setTimeout(() => {
                close();
                goLogin();
            }, 1200);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';

            if (errorMessage.includes('이미 등록된')) {
                show('중복 계정', '이미 등록된 이메일입니다. 다른 이메일을 사용해주세요.', 'error');
            } else if (errorMessage.includes('Failed to fetch')) {
                show('연결 오류', '서버와의 연결에 실패했습니다.', 'error');
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
                <h2>회원가입</h2>
                <form onSubmit={submit}>
                    <input
                        type="text"
                        placeholder="이름 (2자 이상)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호 (6자 이상)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" disabled={busy}>
                        {busy ? '회원가입 중...' : '회원가입'}
                    </button>
                </form>
                <p>
                    이미 계정이 있으신가요?{' '}
                    <button className="link-button" onClick={goLogin}>
                        로그인
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

export default RegisterPage;
