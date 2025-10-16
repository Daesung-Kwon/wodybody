/**
 * 보안 숫자 키패드 컴포넌트
 * 
 * 특징:
 * - 숫자 배치 랜덤화 (Fisher-Yates 알고리즘)
 * - 입력 마스킹 (●●●● 형태)
 * - 터치 전용 입력 (키보드 입력 차단)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
} from './common/MuiComponents';

interface SecureKeypadProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    disabled?: boolean;
    showMasked?: boolean;
}

const SecureKeypad: React.FC<SecureKeypadProps> = ({
    label = '비밀번호',
    value,
    onChange,
    maxLength = 6,
    disabled = false,
    showMasked = true,
}) => {
    const [shuffledNumbers, setShuffledNumbers] = useState<number[]>([]);

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
    };

    // 재배치 핸들러
    const handleReshuffle = () => {
        const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
        setShuffledNumbers(shuffleArray(numbers));
    };

    return (
        <Paper
            elevation={8}
            sx={{
                mt: 2,
                p: 3,
                borderRadius: 3,
                background: 'linear-gradient(145deg, rgba(33,150,243,0.03) 0%, rgba(156,39,176,0.03) 100%)',
                border: '1px solid rgba(33,150,243,0.2)',
                boxShadow: '0 8px 32px rgba(33,150,243,0.15)',
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'primary.main',
                }}
            >
                🔐 {label}
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
                        onClick={() => handleNumberClick(num)}
                        disabled={disabled || value.length >= maxLength}
                        sx={{
                            height: 60,
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            borderRadius: 2,
                            background: 'linear-gradient(145deg, #2196f3 0%, #1976d2 100%)',
                            boxShadow: '0 4px 12px rgba(33,150,243,0.3)',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                                background: 'linear-gradient(145deg, #1976d2 0%, #1565c0 100%)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 6px 16px rgba(33,150,243,0.4)',
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
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
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
        </Paper>
    );
};

export default SecureKeypad;
