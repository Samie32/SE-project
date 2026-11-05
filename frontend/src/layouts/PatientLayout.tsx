import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PatientSidebar } from '../components/PatientSidebar';
import { TopBar } from '../components/TopBar';

const CRUMB_MAP: Record<string, string> = {
  '/patient': 'Trang chủ',
  '/patient/booking': 'Đặt lịch khám',
  '/patient/appointments': 'Lịch của tôi',
  '/patient/records': 'Hồ sơ & đơn thuốc',
  '/patient/telehealth': 'Khám từ xa',
};

export const PatientLayout: React.FC = () => {
  const { pathname } = useLocation();
  const crumb = CRUMB_MAP[pathname] || 'Cổng bệnh nhân';

  return (
    <div className="app">
      <PatientSidebar />
      <main className="main">
        <TopBar crumb={crumb} />
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
