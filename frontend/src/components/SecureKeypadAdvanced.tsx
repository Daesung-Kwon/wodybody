import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Paper,
    Typography,
    LinearProgress,
    Chip,
    Alert,
} from './common/MuiComponents';
import { useTheme } from '../theme/ThemeProvider';
import { SecureKeypadCrypto } from '../utils/secureKeypadCrypto';

interface SecureKeypadAdvancedProps {
    label?: string;
    value: string;
    onChange: (value: string, encrypted?: string) => void;
    maxLength?: number;
    disabled?: boolean;
    onEnter?: (encrypted: string) => void;
    autoFocus?: boolean;
    enableEncryption?: boolean;
    showStrengthMeter?: boolean;
    encryptionKey?: string;
}

const SecureKeypadAdvanced: React.FC<SecureKeypadAdvancedProps> = ({
    label = '보안 입력',
    value,
    onChange,
    maxLength = 20,
    disabled = false,
    onEnter,
    autoFocus = false,
    enableEncryption = true,
    showStrengthMeter = false,
    encryptionKey,
}) => {
    const { isDarkMode } = useTheme();
    const [shuffledNumbers, setShuffledNumbers] = useState<number[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [sessionKey, setSessionKey] = useState<string>('');
    const [encryptedValue, setEncryptedValue] = useState<string>('');
    const [strength, setStrength] = useState<{
        score: number;
        feedback: string;
        strength: string;
    } | null>(null);

    // 세션 키 생성
    useEffect(() => {
        if (enableEncryption) {
            const key = encryptionKey || SecureKeypadCrypto.generateKey();
            setSessionKey(key);
        }
    }, [enableEncryption, encryptionKey]);

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

    // 키패드 열릴 때 숫자 섞기
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

    // 값이 변경될 때 암호화 및 강도 체크
    useEffect(() => {
        const updateEncryption = async () => {
            if (value && enableEncryption && sessionKey) {
                try {
                    const encrypted = SecureKeypadCrypto.encrypt(value, sessionKey);
                    setEncryptedValue(encrypted);
                } catch (error) {
                    console.error('Encryption error:', error);
                }
            }

            if (showStrengthMeter && value) {
                const result = SecureKeypadCrypto.checkPasswordStrength(value);
                setStrength(result);
            } else {
                setStrength(null);
            }
        };

        updateEncryption();
    }, [value, enableEncryption, sessionKey, showStrengthMeter]);

    // 숫자 버튼 클릭 핸들러
    const handleNumberClick = (num: number) => {
        if (disabled || value.length >= maxLength) return;
        const newValue = value + num.toString();
        onChange(newValue, encryptedValue);
    };

    // 삭제 버튼 핸들러
    const handleBackspace = () => {
        if (disabled || value.length === 0) return;
        const newValue = value.slice(0, -1);
        onChange(newValue, encryptedValue);
    };

    // 전체 삭제 버튼 핸들러
    const handleClear = () => {
        if (disabled) return;
        onChange('', '');
        setEncryptedValue('');
        setStrength(null);
    };

    // 확인 버튼 핸들러
    const handleConfirm = async () => {
        if (disabled) return;
        setIsOpen(false);

        if (onEnter) {
            if (enableEncryption && sessionKey) {
                try {
                    // 보안 패킷 생성
                    const packet = await SecureKeypadCrypto.createSecurePacket(value, sessionKey);
                    // 패킷을 JSON 문자열로 변환하여 전달
                    onEnter(JSON.stringify(packet));
                } catch (error) {
                    console.error('Secure packet creation error:', error);
                    onEnter(value);
                }
            } else {
                onEnter(value);
            }
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

    // 강도 점수에 따른 색상
    const getStrengthColor = () => {
        if (!strength) return 'grey';
        switch (strength.strength) {
            case 'very-weak': return '#f44336';
            case 'weak': return '#ff9800';
            case 'medium': return '#ffc107';
            case 'strong': return '#8bc34a';
            case 'very-strong': return '#4caf50';
            default: return 'grey';
        }
    };

    // 강도 레이블
    const getStrengthLabel = () => {
        if (!strength) return '';
        switch (strength.strength) {
            case 'very-weak': return '매우 약함';
            case 'weak': return '약함';
            case 'medium': return '보통';
            case 'strong': return '강함';
            case 'very-strong': return '매우 강함';
            default: return '';
        }
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
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography
                        variant="caption"
                        sx={{
                            color: isOpen ? '#1976d2' : 'text.secondary',
                            fontWeight: 500,
                        }}
                    >
                        {label}
                    </Typography>
                    {enableEncryption && (
                        <Chip
                            label="암호화"
                            size="small"
                            icon={<span>🔐</span>}
                            sx={{
                                height: 20,
                                fontSize: '0.7rem',
                                backgroundColor: 'rgba(76, 175, 80, 0.2)',
                                color: '#4caf50',
                            }}
                        />
                    )}
                </Box>
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

                {/* 강도 미터 */}
                {showStrengthMeter && strength && (
                    <Box sx={{ mt: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">
                                강도
                            </Typography>
                            <Typography variant="caption" sx={{ color: getStrengthColor(), fontWeight: 600 }}>
                                {getStrengthLabel()}
                            </Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={(strength.score / 4) * 100}
                            sx={{
                                height: 4,
                                borderRadius: 2,
                                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                                '& .MuiLinearProgress-bar': {
                                    backgroundColor: getStrengthColor(),
                                    borderRadius: 2,
                                },
                            }}
                        />
                        {strength.feedback && strength.score < 4 && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                {strength.feedback}
                            </Typography>
                        )}
                    </Box>
                )}
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
                            🔒 보안 연결 활성화 • 키로거 방지 • {enableEncryption ? 'AES-256 암호화' : '암호화 비활성화'}
                        </Typography>
                    </Box>

                    {/* 디버그 정보 (개발 환경에서만) */}
                    {process.env.NODE_ENV === 'development' && enableEncryption && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all' }}>
                                <strong>디버그:</strong> 세션 키 = {sessionKey.substring(0, 8)}...
                            </Typography>
                            {encryptedValue && (
                                <Typography variant="caption" sx={{ display: 'block', wordBreak: 'break-all', mt: 0.5 }}>
                                    <strong>암호화된 값:</strong> {encryptedValue.substring(0, 20)}...
                                </Typography>
                            )}
                        </Alert>
                    )}
                </Paper>
            )}
        </Box>
    );
};

export default SecureKeypadAdvanced;

