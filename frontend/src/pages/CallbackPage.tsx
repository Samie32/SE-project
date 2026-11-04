import React, { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../api/client';

export const CallbackPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.access_token) {
      setToken(auth.user.access_token);
      navigate('/patient', { replace: true });
    }
  }, [auth.isAuthenticated, auth.user, navigate]);

  if (auth.error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', fontSize: 16 }}>
          ⚠ Lỗi xác thực: {auth.error.message}
        </p>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate('/login')}
          style={{ marginTop: 12 }}
        >
          Quay lại đăng nhập
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
      <p>Đang hoàn tất đăng nhập an toàn từ Keycloak...</p>
    </div>
  );
};
