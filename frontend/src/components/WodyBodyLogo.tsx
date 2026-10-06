import React from 'react';
import { Box } from '@mui/material';
import { useTheme } from '../theme/ThemeProvider';
import logoDark from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';

interface WodyBodyLogoProps {
    variant?: 'simple' | 'detailed' | 'icon-only';
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'inherit';
}

const WodyBodyLogo: React.FC<WodyBodyLogoProps> = ({
    variant = 'simple',
    size = 'medium',
}) => {
    const { isDarkMode } = useTheme();

    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { height: 60 }; // 40 -> 60
            case 'large':
                return { height: 200 }; // 80 -> 200 (로그인 페이지용)
            default:
                return { height: 100 };
        }
    };

    // 로고 이미지 경로 (번들 import 사용: 안정적 캐싱/경로 처리)
    const logoSrc = isDarkMode ? logoDark : logoLight;

    const sizeStyles = getSizeStyles();

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: size === 'large' ? 420 : size === 'small' ? 220 : 320,
            }}
        >
            <img
                src={logoSrc}
                alt="WODYBODY"
                style={{
                    height: sizeStyles.height,
                    width: '100%',
                    objectFit: 'contain',
                }}
            />
        </Box>
    );
};

export default WodyBodyLogo;
