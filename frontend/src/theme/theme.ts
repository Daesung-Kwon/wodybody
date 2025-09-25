import { createTheme } from '@mui/material/styles';

// CrossFit 브랜드 색상 팔레트
const crossfitColors = {
    primary: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
    },
    secondary: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
    },
    success: {
        50: '#f0fdf4',
        100: '#dcfce7',
        200: '#bbf7d0',
        300: '#86efac',
        400: '#4ade80',
        500: '#22c55e',
        600: '#16a34a',
        700: '#15803d',
        800: '#166534',
        900: '#14532d',
    },
    warning: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        300: '#fcd34d',
        400: '#fbbf24',
        500: '#f59e0b',
        600: '#d97706',
        700: '#b45309',
        800: '#92400e',
        900: '#78350f',
    },
    error: {
        50: '#fef2f2',
        100: '#fee2e2',
        200: '#fecaca',
        300: '#fca5a5',
        400: '#f87171',
        500: '#ef4444',
        600: '#dc2626',
        700: '#b91c1c',
        800: '#991b1b',
        900: '#7f1d1d',
    },
};

// Material Design 3 테마 생성
export const crossfitTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: crossfitColors.primary[600],
            light: crossfitColors.primary[400],
            dark: crossfitColors.primary[800],
            contrastText: '#ffffff',
        },
        secondary: {
            main: crossfitColors.secondary[600],
            light: crossfitColors.secondary[400],
            dark: crossfitColors.secondary[800],
            contrastText: '#ffffff',
        },
        success: {
            main: crossfitColors.success[600],
            light: crossfitColors.success[400],
            dark: crossfitColors.success[800],
            contrastText: '#ffffff',
        },
        warning: {
            main: crossfitColors.warning[600],
            light: crossfitColors.warning[400],
            dark: crossfitColors.warning[800],
            contrastText: '#ffffff',
        },
        error: {
            main: crossfitColors.error[600],
            light: crossfitColors.error[400],
            dark: crossfitColors.error[800],
            contrastText: '#ffffff',
        },
        background: {
            default: '#fafafa',
            paper: '#ffffff',
        },
        text: {
            primary: crossfitColors.secondary[900],
            secondary: crossfitColors.secondary[600],
            disabled: crossfitColors.secondary[400],
        },
        divider: crossfitColors.secondary[200],
    },
    typography: {
        fontFamily: [
            'Noto Sans KR',
            '-apple-system',
            'BlinkMacSystemFont',
            'Segoe UI',
            'Roboto',
            'Oxygen',
            'Ubuntu',
            'Cantarell',
            'sans-serif',
        ].join(','),
        h1: {
            fontSize: '2.25rem', // 36px
            fontWeight: 700,
            lineHeight: 1.25,
        },
        h2: {
            fontSize: '1.875rem', // 30px
            fontWeight: 700,
            lineHeight: 1.25,
        },
        h3: {
            fontSize: '1.5rem', // 24px
            fontWeight: 600,
            lineHeight: 1.25,
        },
        h4: {
            fontSize: '1.25rem', // 20px
            fontWeight: 600,
            lineHeight: 1.25,
        },
        h5: {
            fontSize: '1.125rem', // 18px
            fontWeight: 600,
            lineHeight: 1.25,
        },
        h6: {
            fontSize: '1rem', // 16px
            fontWeight: 600,
            lineHeight: 1.25,
        },
        body1: {
            fontSize: '1rem', // 16px
            lineHeight: 1.5,
        },
        body2: {
            fontSize: '0.875rem', // 14px
            lineHeight: 1.5,
        },
        button: {
            fontSize: '1rem',
            fontWeight: 500,
            textTransform: 'none', // Material Design 3에서는 기본적으로 텍스트 변환하지 않음
        },
    },
    shape: {
        borderRadius: 12, // Material Design 3의 기본 border radius
    },
    spacing: 8, // 8px 기본 간격
    components: {
        // 버튼 컴포넌트 커스터마이징
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    textTransform: 'none',
                    fontWeight: 500,
                    minHeight: 44, // 터치 친화적 최소 높이
                    padding: '12px 24px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    },
                },
                contained: {
                    '&:hover': {
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    },
                },
            },
        },
        // 카드 컴포넌트 커스터마이징
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
                    },
                },
            },
        },
        // 텍스트 필드 컴포넌트 커스터마이징
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 12,
                        minHeight: 44,
                    },
                },
            },
        },
        // 모달 컴포넌트 커스터마이징
        MuiModal: {
            styleOverrides: {
                root: {
                    '& .MuiBackdrop-root': {
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        backdropFilter: 'blur(4px)',
                    },
                },
            },
        },
        // 앱바 컴포넌트 커스터마이징
        MuiAppBar: {
            styleOverrides: {
                root: {
                    backgroundColor: '#ffffff',
                    color: crossfitColors.secondary[900],
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                },
            },
        },
    },
});

// 다크 모드 테마 (향후 확장용)
export const crossfitDarkTheme = createTheme({
    ...crossfitTheme,
    palette: {
        mode: 'dark',
        primary: {
            main: crossfitColors.primary[400],
            light: crossfitColors.primary[300],
            dark: crossfitColors.primary[600],
            contrastText: '#000000',
        },
        secondary: {
            main: crossfitColors.secondary[400],
            light: crossfitColors.secondary[300],
            dark: crossfitColors.secondary[600],
            contrastText: '#000000',
        },
        background: {
            default: crossfitColors.secondary[900],
            paper: crossfitColors.secondary[800],
        },
        text: {
            primary: crossfitColors.secondary[100],
            secondary: crossfitColors.secondary[300],
            disabled: crossfitColors.secondary[500],
        },
        divider: crossfitColors.secondary[700],
    },
});
