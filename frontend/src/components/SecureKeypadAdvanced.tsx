/**
 * 고급 보안 숫자 키패드 컴포넌트
 * 
 * 특징:
 * - 숫자 배치 랜덤화
 * - 입력 마스킹
 * - AES-256-GCM 암호화
 * - 비밀번호 강도 측정
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    LinearProgress,
} from './common/MuiComponents';
import { encryptData, measurePasswordStrength } from '../utils/secureKeypadCrypto';

interface SecureKeypadAdvancedProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    onEncrypted?: (encrypted: string) => void;
    maxLength?: number;
    disabled?: boolean;
    showMasked?: boolean;
    showStrength?: boolean;
}

const SecureKeypadAdvanced: React.FC<SecureKeypadAdvancedProps> = ({
    label = '비밀번호',
    value,
    onChange,
    onEncrypted,
    maxLength = 10,
    disabled = false,
    showMasked = true,
    showStrength = true,
}) => {
    const [shuffledNumbers, setShuffledNumbers] = useState<number[]>([]);
    const [encrypted, setEncrypted] = useState<string>('');
    const [encrypting, setEncrypting] = useState(false);

    // 비밀번호 강도 측정
    const strength = measurePasswordStrength(value);

    // Fisher-Yates 셔플 알고리즘
    const shuffleArray = useCallback((array: number[]): number[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // 컴포넌트 마운트 시 숫자 섞기
    useEffect(() => {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        setShuffledNumbers(shuffleArray(numbers));
    }, [shuffleArray]);

    // 숫자 클릭 핸들러
    const handleNumberClick = (num: number) => {
        if (value.length < maxLength) {
            onChange(value + num.toString());
        }
    };

    // 삭제 핸들러
    const handleBackspace = () => {
        onChange(value.slice(0, -1));
    };

    // 전체 삭제 핸들러
    const handleClear = () => {
        onChange('');
        setEncrypted('');
    };

    // 재배치 핸들러
    const handleReshuffle = () => {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        setShuffledNumbers(shuffleArray(numbers));
    };

    // 암호화 핸들러
    const handleEncrypt = async () => {
        if (!value) return;

        setEncrypting(true);
        try {
            const encryptionKey = 'demo-encryption-key-2024'; // 실제 환경에서는 환경 변수 사용
            const encryptedData = await encryptData(value, encryptionKey);
            setEncrypted(encryptedData);

            if (onEncrypted) {
                onEncrypted(encryptedData);
            }
        } catch (error) {
            console.error('암호화 실패:', error);
        } finally {
            setEncrypting(false);
        }
    };

    return (
        <Paper
            elevation={8}
            sx={{
                mt: 2,
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(145deg, rgba(156,39,176,0.03) 0%, rgba(233,30,99,0.03) 100%)',
                border: '1px solid rgba(156,39,176,0.2)',
                boxShadow: '0 8px 32px rgba(156,39,176,0.15)',
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'secondary.main',
                }}
            >
                🔒 {label}
            </Typography>

            {/* 마스킹된 입력 표시 */}
            <TextField
                fullWidth
                value={showMasked ? '●'.repeat(value.length) : value}
                label={`${value.length} / ${maxLength}`}
                variant="outlined"
                disabled
                sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                        fontSize: '1.5rem',
                        textAlign: 'center',
                        letterSpacing: '0.5rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    },
                }}
            />

            {/* 비밀번호 강도 */}
            {showStrength && value.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption">강도</Typography>
                        <Typography variant="caption" sx={{ color: strength.color, fontWeight: 600 }}>
                            {strength.label}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={(strength.score / 5) * 100}
                        sx={{
                            height: 8,
                            borderRadius: 1,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            '& .MuiLinearProgress-bar': {
                                backgroundColor: strength.color,
                                borderRadius: 1,
                            },
                        }}
                    />
                </Box>
            )}

            {/* 숫자 키패드 */}
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
                        color="secondary"
                        onClick={() => handleNumberClick(num)}
                        disabled={disabled || value.length >= maxLength}
                        sx={{
                            height: 60,
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            borderRadius: 2,
                            background: 'linear-gradient(145deg, #9c27b0 0%, #7b1fa2 100%)',
                            boxShadow: '0 4px 12px rgba(156,39,176,0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                background: 'linear-gradient(145deg, #7b1fa2 0%, #6a1b9a 100%)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(156,39,176,0.4)',
                            },
                            '&:active': {
                                transform: 'translateY(0)',
                            },
                            '&:disabled': {
                                background: 'linear-gradient(145deg, #e0e0e0 0%, #bdbdbd 100%)',
                                color: '#9e9e9e',
                            },
                        }}
                    >
                        {num}
                    </Button>
                ))}
            </Box>

            {/* 컨트롤 버튼 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                <Button
                    variant="outlined"
                    onClick={handleReshuffle}
                    disabled={disabled}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        py: 1.5,
                    }}
                >
                    🔀 재배치
                </Button>
                <Button
                    variant="outlined"
                    color="warning"
                    onClick={handleBackspace}
                    disabled={disabled || value.length === 0}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        py: 1.5,
                    }}
                >
                    ← 삭제
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClear}
                    disabled={disabled || value.length === 0}
                    sx={{
                        borderRadius: 2,
                        fontWeight: 600,
                        py: 1.5,
                    }}
                >
                    ✕ 전체삭제
                </Button>
            </Box>

            {/* 암호화 버튼 */}
            <Button
                fullWidth
                variant="contained"
                color="success"
                onClick={handleEncrypt}
                disabled={disabled || value.length === 0 || encrypting}
                sx={{
                    borderRadius: 2,
                    fontWeight: 600,
                    py: 1.5,
                    mb: encrypted ? 2 : 0,
                }}
            >
                {encrypting ? '암호화 중...' : '🔐 암호화'}
            </Button>

            {/* 암호화된 데이터 */}
            {encrypted && (
                <Paper
                    elevation={0}
                    sx={{
                        p: 2,
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        borderRadius: 2,
                        border: '1px solid rgba(76, 175, 80, 0.3)',
                    }}
                >
                    <Typography variant="caption" sx={{ fontWeight: 600, color: 'success.main', display: 'block', mb: 1 }}>
                        ✅ 암호화 완료
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{
                            fontFamily: 'monospace',
                            wordBreak: 'break-all',
                            display: 'block',
                            maxHeight: 100,
                            overflow: 'auto',
                        }}
                    >
                        {encrypted}
                    </Typography>
                </Paper>
            )}
        </Paper>
    );
};

export default SecureKeypadAdvanced;
