import React from 'react';
import { CustomModalProps } from '../types';

const CustomModal: React.FC<CustomModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info'
}) => {
    if (!isOpen) return null;

    const icons = {
        error: '❌',
        success: '✅',
        warning: '⚠️',
        info: 'ℹ️'
    };

    return (
        <div className="modal-overlay custom-modal-overlay" onClick={onClose}>
            <div className={`custom-modal ${type}`} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <span className="modal-icon">{icons[type] || 'ℹ️'}</span>
                    <h3 className="modal-title">{title}</h3>
                </div>
                <div className="modal-body">
                    <p className="modal-message">{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="modal-button primary" onClick={onClose}>
                        확인
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CustomModal;
