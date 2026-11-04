import React from 'react';

interface ErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onRetry }) => {
  const msg = (() => {
    if (!error) return 'Đã xảy ra lỗi không xác định.';
    if (typeof error === 'object' && error !== null) {
      const e = error as Record<string, unknown>;
      if (e.status === 401) return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
      if (e.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
      if (e.status === 409) return 'Xung đột dữ liệu: ' + (e.detail || 'Vui lòng tải lại và thử lại.');
      if (e.detail) return String(e.detail);
      if (e.message) return String(e.message);
    }
    return String(error);
  })();

  return (
    <div className="notice" style={{ borderColor: '#f3d3d8', background: '#fff8f9', color: '#bd3347' }}>
      ⚠ {msg}
      {onRetry && (
        <button className="btn" type="button" style={{ marginLeft: 12, padding: '4px 8px' }} onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
};
