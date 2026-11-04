import React from 'react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: 'primary' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
  children,
  disabled = false,
}) => (
  <div className="modal-back" onClick={onCancel}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <h2>{title}</h2>
      <p>{message}</p>
      {children}
      <div className="modal-foot">
        <button className="btn" type="button" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button
          className={confirmVariant === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
          type="button"
          disabled={disabled}
          onClick={onConfirm}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);
