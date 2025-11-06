import React from 'react';
import { Box, keyframes } from '@mui/material';
import { useTheme } from '../theme/ThemeProvider';

interface WodyBodyLogoAnimatedProps {
    size?: 'small' | 'medium' | 'large';
    animate?: boolean;
}

// 페이드인 + 약간 위로 이동하는 애니메이션
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

// 펄스 효과 (로딩 중일 때)
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
`;

const WodyBodyLogoAnimated: React.FC<WodyBodyLogoAnimatedProps> = ({
    size = 'medium',
    animate = true,
}) => {
    const { isDarkMode } = useTheme();
    
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { height: 60 };
            case 'large':
                return { height: 200 };
            default:
                return { height: 100 };
        }
    };

    const logoSrc = isDarkMode ? '/logo-dark.png' : '/logo-light.png';
    const sizeStyles = getSizeStyles();

    return (
        <Box 
            sx={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                maxWidth: size === 'large' ? 400 : size === 'small' ? 200 : 300,
                animation: animate ? `${fadeInUp} 0.6s ease-out` : 'none',
                '&:hover': {
                    animation: animate ? `${pulse} 2s ease-in-out infinite` : 'none',
                }
            }}
        >
            <img
                src={logoSrc}
                alt="WODYBODY"
                style={{
                    height: sizeStyles.height,
                    width: '100%',
                    objectFit: 'contain',
                    imageRendering: 'crisp-edges',
                }}
            />
        </Box>
    );
};

export default WodyBodyLogoAnimated;

