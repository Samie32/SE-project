import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { clearToken } from '../api/client';

export const PatientSidebar: React.FC = () => {
  const auth = useAuth();
  const navigate = useNavigate();
  const user = auth.user;
  const name =
    user?.profile?.name ||
    user?.profile?.preferred_username ||
    'Vũ Trần Khắc Thuận';
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((n: string) => n[0])
    .slice(-2)
    .join('')
    .toUpperCase() || 'BN';

  const handleLogout = () => {
    clearToken();
    auth.removeUser();
    navigate('/login');
  };

  return (
    <aside className="side">
      <div className="brand">
        <div className="logo">✚</div>
        <span>
          ClinicCare<span style={{ color: '#80a7ff' }}>.</span>
        </span>
      </div>

      <div className="nav-label">CỔNG BỆNH NHÂN</div>

      <NavLink
        to="/patient"
        end
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="ni">⌂</span>
        <span>Trang chủ</span>
      </NavLink>

      <div className="nav-label">DỊCH VỤ KHÁM</div>

      <NavLink
        to="/patient/booking"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="ni">＋</span>
        <span>Đặt lịch khám</span>
      </NavLink>

      <NavLink
        to="/patient/appointments"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="ni">▣</span>
        <span>Lịch của tôi</span>
      </NavLink>

      <NavLink
        to="/patient/records"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="ni">▤</span>
        <span>Hồ sơ & đơn thuốc</span>
      </NavLink>

      <NavLink
        to="/patient/telehealth"
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        <span className="ni">◉</span>
        <span>Khám từ xa</span>
      </NavLink>

      <div
        style={{
          marginTop: 'auto',
          borderTop: '1px solid #2b4261',
          paddingTop: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div className="avatar">{initials}</div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <b
            style={{
              fontSize: 13,
              color: '#fff',
              display: 'block',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {name}
          </b>
          <small style={{ color: '#8fa4c2', fontSize: 11 }}>Bệnh nhân</small>
        </div>
        <button
          onClick={handleLogout}
          type="button"
          style={{
            border: '1px solid #395170',
            background: 'transparent',
            color: '#d9e5f6',
            borderRadius: 7,
            padding: '5px 7px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          Thoát
        </button>
      </div>
    </aside>
  );
};
