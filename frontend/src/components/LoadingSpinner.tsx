import React from 'react';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Đang tải...' }) => (
  <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
    <div style={{ fontSize: 24, marginBottom: 12 }}>⏳</div>
    <div>{message}</div>
  </div>
);
