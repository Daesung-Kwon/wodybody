import React from 'react';
import { Box, Typography, CircularProgress, Stack } from './common/MuiComponents';
import { LoadingSpinnerProps } from '../types';

const MuiLoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = '로딩 중...' }) => {
    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '200px',
                gap: 2
            }}
        >
            <CircularProgress size={48} />
            <Typography variant="body1" color="text.secondary">
                {label}
            </Typography>
        </Box>
    );
};

export default MuiLoadingSpinner;
