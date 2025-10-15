import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Paper,
    Typography,
} from './common/MuiComponents';
import { useTheme } from '../theme/ThemeProvider';

interface SecureKeypadProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    disabled?: boolean;
    onEnter?: () => void;
    autoFocus?: boolean;
}

const SecureKeypad: React.FC<SecureKeypadProps> = ({
    label = '보안 입력',
    value,
    onChange,
    maxLength = 20,
    disabled = false,
    onEnter,
    autoFocus = false,
}) => {
    const { isDarkMode } = useTheme();
    const [shuffledNumbers, setShuffledNumbers] = useState<number[]>([]);
    const [isOpen, setIsOpen] = useState(false);

    // 숫자 배열을 무작위로 섞는 함수
    const shuffleNumbers = useCallback(() => {
        const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const shuffled = [...numbers];

        // Fisher-Yates 알고리즘을 사용한 무작위 섞기
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setShuffledNumbers(shuffled);
    }, []);

    // 컴포넌트 마운트 시 및 키패드 열릴 때 숫자 섞기
    useEffect(() => {
        if (isOpen) {
            shuffleNumbers();
        }
    }, [isOpen, shuffleNumbers]);

    useEffect(() => {
        if (autoFocus) {
            setIsOpen(true);
        }
    }, [autoFocus]);

    // 숫자 버튼 클릭 핸들러
    const handleNumberClick = (num: number) => {
        if (disabled || value.length >= maxLength) return;
        onChange(value + num.toString());
    };

    // 삭제 버튼 핸들러
    const handleBackspace = () => {
        if (disabled || value.length === 0) return;
        onChange(value.slice(0, -1));
    };

    // 전체 삭제 버튼 핸들러
    const handleClear = () => {
        if (disabled) return;
        onChange('');
    };

    // 확인 버튼 핸들러
    const handleConfirm = () => {
        if (disabled) return;
        setIsOpen(false);
        if (onEnter) {
            onEnter();
        }
    };

    // 키패드 토글
    const toggleKeypad = () => {
        if (disabled) return;
        setIsOpen(!isOpen);
    };

    // 마스킹된 값 표시
    const getMaskedValue = () => {
        return '●'.repeat(value.length);
    };

    return (
        <Box sx={{ width: '100%' }}>
            {/* 입력 필드 표시 */}
            <Paper
                onClick={toggleKeypad}
                sx={{
                    p: 2,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                    border: `2px solid ${isOpen ? '#1976d2' : 'transparent'}`,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                        border: `2px solid ${isOpen ? '#1976d2' : isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    },
                }}
            >
                <Typography
                    variant="caption"
                    sx={{
                        display: 'block',
                        mb: 0.5,
                        color: isOpen ? '#1976d2' : 'text.secondary',
                        fontWeight: 500,
                    }}
                >
                    {label}
                </Typography>
                <Typography
                    variant="h6"
                    sx={{
                        minHeight: 32,
                        display: 'flex',
                        alignItems: 'center',
                        letterSpacing: 4,
                        color: value.length > 0 ? 'text.primary' : 'text.disabled',
                    }}
                >
                    {value.length > 0 ? getMaskedValue() : '보안 키패드를 클릭하세요'}
                </Typography>
            </Paper>

            {/* 보안 키패드 */}
            {isOpen && (
                <Paper
                    elevation={8}
                    sx={{
                        mt: 2,
                        p: 3,
                        backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(10px)',
                        borderRadius: 3,
                        animation: 'slideDown 0.3s ease',
                        '@keyframes slideDown': {
                            from: {
                                opacity: 0,
                                transform: 'translateY(-10px)',
                            },
                            to: {
                                opacity: 1,
                                transform: 'translateY(0)',
                            },
                        },
                    }}
                >
                    {/* 숫자 그리드 */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 1.5,
                            mb: 2,
                        }}
                    >
                        {shuffledNumbers.map((num) => (
                            <Button
                                key={num}
                                fullWidth
                                variant="contained"
                                onClick={() => handleNumberClick(num)}
                                disabled={disabled || value.length >= maxLength}
                                sx={{
                                    height: 60,
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    borderRadius: 2,
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                                    color: isDarkMode ? '#fff' : '#000',
                                    '&:hover': {
                                        backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                                    },
                                    '&:active': {
                                        transform: 'scale(0.95)',
                                        transition: 'transform 0.1s',
                                    },
                                }}
                            >
                                {num}
                            </Button>
                        ))}
                    </Box>

                    {/* 컨트롤 버튼들 */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleBackspace}
                            disabled={disabled || value.length === 0}
                            sx={{
                                height: 50,
                                fontWeight: 600,
                                borderRadius: 2,
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                color: isDarkMode ? '#fff' : '#000',
                                '&:hover': {
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                },
                            }}
                        >
                            ← 삭제
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={handleClear}
                            disabled={disabled || value.length === 0}
                            sx={{
                                height: 50,
                                fontWeight: 600,
                                borderRadius: 2,
                                borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                                color: isDarkMode ? '#fff' : '#000',
                                '&:hover': {
                                    borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.4)',
                                    backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                                },
                            }}
                        >
                            전체삭제
                        </Button>
                        <Button
                            fullWidth
                            variant="contained"
                            onClick={handleConfirm}
                            disabled={disabled || value.length === 0}
                            sx={{
                                height: 50,
                                fontWeight: 600,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
                                },
                            }}
                        >
                            확인
                        </Button>
                    </Box>

                    {/* 보안 정보 표시 */}
                    <Box
                        sx={{
                            mt: 2,
                            p: 1.5,
                            backgroundColor: isDarkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
                            borderRadius: 2,
                            border: `1px solid ${isDarkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                color: isDarkMode ? '#81c784' : '#388e3c',
                            }}
                        >
                            <Box
                                component="span"
                                sx={{
                                    display: 'inline-block',
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    backgroundColor: '#4caf50',
                                    animation: 'pulse 2s infinite',
                                    '@keyframes pulse': {
                                        '0%, 100%': { opacity: 1 },
                                        '50%': { opacity: 0.5 },
                                    },
                                }}
                            />
                            🔒 보안 연결 활성화 • 키로거 방지 • 암호화 전송
                        </Typography>
                    </Box>
                </Paper>
            )}
        </Box>
    );
};

export default SecureKeypad;

