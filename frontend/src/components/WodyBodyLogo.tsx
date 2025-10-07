import React from 'react';
import { Box, Typography } from '@mui/material';

interface WodyBodyLogoProps {
    variant?: 'simple' | 'detailed' | 'icon-only';
    size?: 'small' | 'medium' | 'large';
    color?: 'primary' | 'secondary' | 'inherit';
}

const WodyBodyLogo: React.FC<WodyBodyLogoProps> = ({
    variant = 'simple',
    size = 'medium',
    color = 'primary'
}) => {
    const getSizeStyles = () => {
        switch (size) {
            case 'small':
                return { width: 'auto', height: 'auto', minWidth: 0 };
            case 'large':
                return { width: 240, height: 72 };
            default:
                return { width: 180, height: 54 };
        }
    };

    const getColorStyles = () => {
        switch (color) {
            case 'secondary':
                return { color: '#64748b' };
            case 'inherit':
                return { color: 'inherit' };
            default:
                return { color: '#0284c7' };
        }
    };

    const renderLogo = () => {
        switch (variant) {
            case 'icon-only':
                return (
                    <Box
                        sx={{
                            width: size === 'small' ? 32 : size === 'large' ? 48 : 40,
                            height: size === 'small' ? 32 : size === 'large' ? 48 : 40,
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 'bold',
                            fontSize: size === 'small' ? '12px' : size === 'large' ? '20px' : '16px',
                        }}
                    >
                        WB
                    </Box>
                );

            case 'detailed':
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                        {/* WODY BODY */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography
                                sx={{
                                    fontSize: size === 'small' ? '20px' : size === 'large' ? '32px' : '24px',
                                    fontWeight: 500,
                                    color: '#0284c7',
                                    lineHeight: 1,
                                    fontFamily: 'Arial, sans-serif',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                WODY
                            </Typography>

                            <Typography
                                sx={{
                                    fontSize: size === 'small' ? '20px' : size === 'large' ? '32px' : '24px',
                                    fontWeight: 500,
                                    color: '#0284c7',
                                    lineHeight: 1,
                                    fontFamily: 'Arial, sans-serif',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                BODY
                            </Typography>
                        </Box>

                        {/* CrossFit - 크기 두 배로 증가 */}
                        <Typography
                            variant={size === 'small' ? 'caption' : 'body2'}
                            sx={{
                                color: '#64748b',
                                fontSize: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
                                letterSpacing: '2px',
                                fontFamily: 'Arial, sans-serif',
                                fontWeight: 400,
                            }}
                        >
                            CrossFit
                        </Typography>
                    </Box>
                );

            default: // simple
                return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {/* WODY */}
                        <Typography
                            sx={{
                                fontSize: size === 'small' ? '18px' : size === 'large' ? '28px' : '22px',
                                fontWeight: 500,
                                color: '#0284c7',
                                lineHeight: 1,
                                fontFamily: 'Arial, sans-serif',
                                letterSpacing: '0.5px',
                            }}
                        >
                            WODY
                        </Typography>

                        {/* BODY */}
                        <Typography
                            sx={{
                                fontSize: size === 'small' ? '18px' : size === 'large' ? '28px' : '22px',
                                fontWeight: 500,
                                color: '#0284c7',
                                lineHeight: 1,
                                fontFamily: 'Arial, sans-serif',
                                letterSpacing: '0.5px',
                            }}
                        >
                            BODY
                        </Typography>
                    </Box>
                );
        }
    };

    return (
        <Box sx={{ ...getSizeStyles(), ...getColorStyles() }}>
            {renderLogo()}
        </Box>
    );
};

export default WodyBodyLogo;
