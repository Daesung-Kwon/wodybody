import React from 'react';
import './ConfirmAlert.css';

interface ConfirmAlertProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'warning' | 'danger' | 'info';
}

const ConfirmAlert: React.FC<ConfirmAlertProps> = ({
    isOpen,
    title,
    message,
    confirmText = '확인',
    cancelText = '취소',
    onConfirm,
    onCancel,
    type = 'warning'
}) => {
    if (!isOpen) return null;

    return (
        <div className="confirm-alert-overlay" onClick={onCancel}>
            <div className="confirm-alert" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-alert-header">
                    <div className={`confirm-alert-icon ${type}`}>
                        {type === 'warning' && '⚠️'}
                        {type === 'danger' && '🗑️'}
                        {type === 'info' && 'ℹ️'}
                    </div>
                    <h3 className="confirm-alert-title">{title}</h3>
                </div>

                <div className="confirm-alert-body">
                    <p className="confirm-alert-message">{message}</p>
                </div>

                <div className="confirm-alert-footer">
                    <button
                        className="confirm-alert-button cancel-button"
                        onClick={onCancel}
                    >
                        {cancelText}
                    </button>
                    <button
                        className={`confirm-alert-button confirm-button ${type}`}
                        onClick={onConfirm}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmAlert;
