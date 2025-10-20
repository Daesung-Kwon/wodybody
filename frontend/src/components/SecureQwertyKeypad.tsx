/**
 * QWERTY 보안 키패드 컴포넌트
 * 
 * 특징:
 * - 4가지 모드 (소문자, 대문자, 숫자, 특수문자)
 * - 각 모드별 키 배치 랜덤화
 * - 입력 마스킹
 * - 모바일 최적화 (최소 375px)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    TextField,
    Paper,
    Typography,
    ToggleButtonGroup,
    ToggleButton,
} from './common/MuiComponents';

interface SecureQwertyKeypadProps {
    label?: string;
    value: string;
    onChange: (value: string) => void;
    maxLength?: number;
    disabled?: boolean;
    showMasked?: boolean;
}

type KeyboardMode = 'lower' | 'upper' | 'number' | 'symbol';

const SecureQwertyKeypad: React.FC<SecureQwertyKeypadProps> = ({
    label = '비밀번호',
    value,
    onChange,
    maxLength = 50,
    disabled = false,
    showMasked = true,
}) => {
    const [mode, setMode] = useState<KeyboardMode>('lower');
    const [shuffledKeyboard, setShuffledKeyboard] = useState<string[][]>([]);

    // 키보드 레이아웃
    const keyboards: Record<KeyboardMode, string[][]> = {
        lower: [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
        ],
        upper: [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
        ],
        number: [
            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
            ['-', '=', '[', ']', '\\', ';', "'"],
            [',', '.', '/'],
        ],
        symbol: [
            ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
            ['_', '+', '{', '}', '|', ':', '"'],
            ['<', '>', '?'],
        ],
    };

    // Fisher-Yates 셔플 알고리즘
    const shuffleArray = useCallback((array: string[]): string[] => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }, []);

    // 키보드 섞기
    const shuffleKeyboard = useCallback(() => {
        const currentLayout = keyboards[mode];
        const shuffled = currentLayout.map(row => shuffleArray(row));
        setShuffledKeyboard(shuffled);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, shuffleArray]);

    // 모드 변경 시 키보드 재배치
    useEffect(() => {
        shuffleKeyboard();
    }, [shuffleKeyboard]);

    // 키 클릭 핸들러
    const handleKeyClick = (key: string) => {
        if (value.length < maxLength) {
            onChange(value + key);
        }
    };

    // 스페이스바 핸들러
    const handleSpace = () => {
        if (value.length < maxLength) {
            onChange(value + ' ');
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

    return (
        <Paper
            elevation={8}
            sx={{
                mt: 2,
                p: { xs: 1.5, sm: 3 },
                borderRadius: 3,
                background: 'linear-gradient(145deg, rgba(255,152,0,0.03) 0%, rgba(255,87,34,0.03) 100%)',
                border: '1px solid rgba(255,152,0,0.2)',
                boxShadow: '0 8px 32px rgba(255,152,0,0.15)',
                maxWidth: '100%',
                overflow: 'hidden',
            }}
        >
            <Typography
                variant="h6"
                sx={{
                    mb: 2,
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'warning.main',
                    fontSize: { xs: '1rem', sm: '1.25rem' },
                }}
            >
                ⌨️ {label}
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
                        fontSize: { xs: '1.2rem', sm: '1.5rem' },
                        textAlign: 'center',
                        letterSpacing: '0.3rem',
                        fontWeight: 600,
                        backgroundColor: 'rgba(0, 0, 0, 0.02)',
                    },
                }}
            />

            {/* 모드 선택 */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: { xs: 1.5, sm: 2 } }}>
                <ToggleButtonGroup
                    value={mode}
                    exclusive
                    onChange={(_, newMode) => newMode && setMode(newMode)}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            fontSize: { xs: '0.7rem', sm: '0.875rem' },
                            px: { xs: 1, sm: 2 },
                            py: { xs: 0.5, sm: 1 },
                        },
                    }}
                >
                    <ToggleButton value="lower">소문자</ToggleButton>
                    <ToggleButton value="upper">대문자</ToggleButton>
                    <ToggleButton value="number">숫자</ToggleButton>
                    <ToggleButton value="symbol">특수문자</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* QWERTY 키보드 */}
            <Box sx={{ mb: { xs: 1, sm: 2 } }}>
                {shuffledKeyboard.map((row, rowIndex) => (
                    <Box
                        key={rowIndex}
                        sx={{
                            display: 'flex',
                            justifyContent: 'center',
                            gap: { xs: 0.3, sm: 0.5 },
                            mb: { xs: 0.3, sm: 0.5 },
                        }}
                    >
                        {row.map((key, keyIndex) => (
                            <Button
                                key={`${rowIndex}-${keyIndex}`}
                                variant="contained"
                                onClick={() => handleKeyClick(key)}
                                disabled={disabled || value.length >= maxLength}
                                sx={{
                                    minWidth: { xs: 28, sm: 40 },
                                    maxWidth: { xs: 32, sm: 45 },
                                    height: { xs: 38, sm: 45 },
                                    fontSize: { xs: '0.85rem', sm: '1rem' },
                                    fontWeight: 600,
                                    borderRadius: { xs: 1, sm: 1.5 },
                                    padding: { xs: '4px', sm: '8px' },
                                    background: 'linear-gradient(145deg, #ff9800 0%, #f57c00 100%)',
                                    boxShadow: '0 2px 8px rgba(255,152,0,0.3)',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        background: 'linear-gradient(145deg, #f57c00 0%, #ef6c00 100%)',
                                        transform: 'translateY(-1px)',
                                        boxShadow: '0 4px 12px rgba(255,152,0,0.4)',
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
                                {key}
                            </Button>
                        ))}
                    </Box>
                ))}
            </Box>

            {/* 스페이스바 및 컨트롤 버튼 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: { xs: 0.5, sm: 1 }, mb: { xs: 1, sm: 2 } }}>
                <Button
                    variant="outlined"
                    onClick={handleBackspace}
                    disabled={disabled || value.length === 0}
                    sx={{
                        borderRadius: { xs: 1, sm: 2 },
                        fontWeight: 600,
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                >
                    ← 삭제
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSpace}
                    disabled={disabled || value.length >= maxLength}
                    sx={{
                        borderRadius: { xs: 1, sm: 2 },
                        fontWeight: 600,
                        py: { xs: 1, sm: 1.5 },
                        background: 'linear-gradient(145deg, #9e9e9e 0%, #757575 100%)',
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        '&:hover': {
                            background: 'linear-gradient(145deg, #757575 0%, #616161 100%)',
                        },
                    }}
                >
                    스페이스
                </Button>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={handleClear}
                    disabled={disabled || value.length === 0}
                    sx={{
                        borderRadius: { xs: 1, sm: 2 },
                        fontWeight: 600,
                        py: { xs: 1, sm: 1.5 },
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    }}
                >
                    ✕ 전체
                </Button>
            </Box>

            {/* 재배치 버튼 */}
            <Button
                fullWidth
                variant="outlined"
                onClick={shuffleKeyboard}
                disabled={disabled}
                sx={{
                    borderRadius: { xs: 1, sm: 2 },
                    fontWeight: 600,
                    py: { xs: 1, sm: 1.5 },
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                }}
            >
                🔀 키 재배치
            </Button>
        </Paper>
    );
};

export default SecureQwertyKeypad;
