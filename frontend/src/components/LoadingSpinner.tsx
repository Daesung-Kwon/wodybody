import React from 'react';
import { LoadingSpinnerProps } from '../types';

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ label = '로딩 중...' }) => {
    return (
        <div className="loading-container">
            <div className="loading-spinner" />
            <p>{label}</p>
        </div>
    );
};

export default LoadingSpinner;
