import React from 'react';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  crumb: string;
}

export const TopBar: React.FC<TopBarProps> = ({ crumb }) => {
  const navigate = useNavigate();
  return (
    <header className="topbar">
      <div style={{ color: '#8794a8', fontSize: 12 }}>
        ClinicCare / <b style={{ color: '#233650', fontSize: 13 }}>{crumb}</b>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          className="btn"
          type="button"
          onClick={() => navigate('/patient/appointments')}
        >
          ▣ Lịch của tôi
        </button>
      </div>
    </header>
  );
};
