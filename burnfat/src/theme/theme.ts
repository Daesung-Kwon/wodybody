import { createTheme } from '@mui/material/styles';

// BurnFat 컬러 (crossfit-system 참조 - 체지방/다이어트 강조)
const burnfatColors = {
  primary: {
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
};

export const burnfatTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: burnfatColors.primary[600],
      light: burnfatColors.primary[400],
      dark: burnfatColors.primary[800],
      contrastText: '#ffffff',
    },
    secondary: {
      main: burnfatColors.secondary[600],
      light: burnfatColors.secondary[400],
      dark: burnfatColors.secondary[800],
      contrastText: '#ffffff',
    },
    success: {
      main: burnfatColors.success[600],
      light: burnfatColors.success[400],
      dark: burnfatColors.success[800],
      contrastText: '#ffffff',
    },
    error: {
      main: burnfatColors.error[600],
      light: burnfatColors.error[400],
      dark: burnfatColors.error[800],
      contrastText: '#ffffff',
    },
    warning: {
      main: burnfatColors.warning[600],
      light: burnfatColors.warning[400],
      dark: burnfatColors.warning[800],
      contrastText: '#ffffff',
    },
    background: {
      default: '#fafafa',
      paper: '#ffffff',
    },
    text: {
      primary: burnfatColors.secondary[900],
      secondary: burnfatColors.secondary[600],
      disabled: burnfatColors.secondary[400],
    },
    divider: burnfatColors.secondary[200],
  },
  typography: {
    fontFamily: ['Noto Sans KR', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'].join(','),
    h1: { fontSize: '2.25rem', fontWeight: 700, lineHeight: 1.25 },
    h2: { fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.25 },
    h3: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.25 },
    h4: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.25 },
    h5: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.25 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.25 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { fontSize: '1rem', fontWeight: 500, textTransform: 'none' },
  },
  shape: { borderRadius: 12 },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          textTransform: 'none',
          fontWeight: 500,
          minHeight: 44,
          padding: '12px 24px',
          boxShadow: 'none',
          '&:hover': { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)' },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          '&:hover': { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': { borderRadius: 12, minHeight: 44 },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  },
});
