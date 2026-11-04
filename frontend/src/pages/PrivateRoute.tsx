import React from 'react';
import { useAuth } from 'react-oidc-context';
import { Navigate } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { setToken, getToken } from '../api/client';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const auth = useAuth();
  const existingToken = getToken();

  // Sync token to sessionStorage on login
  if (auth.user?.access_token) {
    setToken(auth.user.access_token);
  }

  if (auth.isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingSpinner message="Đang kiểm tra phiên đăng nhập..." />
      </div>
    );
  }

  // Cho phép đăng nhập qua Keycloak OIDC hoặc qua chế độ demo token
  if (!auth.isAuthenticated && !existingToken) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
