import React, { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';
import { setToken, getToken } from '../api/client';

export const LoginPage: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('patient');
  const [password, setPassword] = useState('demo123');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated || getToken()) {
      navigate('/patient');
    }
  }, [auth.isAuthenticated, navigate]);

  const handleOidcLogin = () => {
    auth.signinRedirect().catch((err) => {
      console.warn('OIDC redirect failed:', err);
      setDemoNotice('Không kết nối được Keycloak local (cổng 8180). Bạn có thể dùng chế độ đăng nhập giả lập demo bên dưới.');
    });
  };

  const handleDemoLogin = (roleUser: string) => {
    // Lưu một access token demo để test giao diện offline nếu Keycloak chưa bật
    const fakeToken = `demo_token_${roleUser}_${Date.now()}`;
    setToken(fakeToken);
    navigate('/patient');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        padding: '20px 0',
      }}
    >
      <div
        style={{
          width: 'min(440px, 100%)',
          background: '#fff',
          border: '1px solid var(--line)',
          borderRadius: 18,
          padding: 30,
          boxShadow: '0 8px 24px #20385d0a',
          margin: '0 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            className="logo"
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: '#3978f6',
              display: 'grid',
              placeItems: 'center',
              color: '#fff',
              fontSize: 20,
            }}
          >
            ✚
          </div>
          <span style={{ fontSize: 21, fontWeight: 800, color: 'var(--navy)' }}>
            ClinicCare<span style={{ color: '#3978f6' }}>.</span>
          </span>
        </div>

        <h1 style={{ fontSize: 24, margin: '0 0 7px' }}>Đăng nhập hệ thống</h1>
        <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 20px' }}>
          Sử dụng tài khoản bệnh nhân để vào cổng dịch vụ y tế.
        </p>

        {demoNotice && (
          <div
            className="notice"
            style={{
              borderColor: '#f3d3d8',
              background: '#fff8f9',
              color: '#bd3347',
              marginBottom: 16,
            }}
          >
            ⚠ {demoNotice}
          </div>
        )}

        <div className="formfield" style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#40516a' }}>
            Tài khoản bệnh nhân
          </label>
          <input
            className="field"
            style={{ width: '100%' }}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="patient"
          />
        </div>

        <div className="formfield" style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 6, color: '#40516a' }}>
            Mật khẩu
          </label>
          <input
            className="field"
            type="password"
            style={{ width: '100%' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="demo123"
          />
        </div>

        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: 14, marginBottom: 10 }}
          onClick={handleOidcLogin}
          type="button"
          disabled={auth.isLoading}
        >
          {auth.isLoading ? '⏳ Đang chuyển hướng...' : '🔒 Đăng nhập qua Keycloak (OIDC/PKCE) →'}
        </button>

        <button
          className="btn btn-soft"
          style={{ width: '100%', padding: '10px', fontSize: 13 }}
          onClick={() => handleDemoLogin(username)}
          type="button"
        >
          ⚡ Đăng nhập nhanh chế độ Demo (Bệnh nhân)
        </button>

        <div className="notice" style={{ marginTop: 16 }}>
          🔒 Vai trò được xác định từ tài khoản sau khi xác thực qua IdP (Keycloak).
          Mặc định tài khoản người dùng đăng ký mới được phân quyền Bệnh nhân.
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 12,
            border: '1px solid var(--line)',
            borderRadius: 10,
            background: '#f9fbff',
            fontSize: 11,
          }}
        >
          <b>Tài khoản demo sẵn có:</b>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 7,
              margin: '9px 0',
            }}
          >
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11, padding: 6 }}
              onClick={() => {
                setUsername('patient');
                handleDemoLogin('patient');
              }}
            >
              Bệnh nhân 1 (patient)
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11, padding: 6 }}
              onClick={() => {
                setUsername('patient2');
                handleDemoLogin('patient2');
              }}
            >
              Bệnh nhân 2 (patient2)
            </button>
          </div>
          <small style={{ color: 'var(--muted)' }}>Mật khẩu demo: <b>demo123</b></small>
        </div>

        <div
          style={{
            marginTop: 20,
            textAlign: 'center',
            fontSize: 11,
            color: '#8794a8',
          }}
        >
          Bảo mật thông tin y tế · ClinicCare © 2026
        </div>
      </div>
    </div>
  );
};
