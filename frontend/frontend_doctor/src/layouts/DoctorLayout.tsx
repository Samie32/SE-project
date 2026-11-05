import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Calendar,
  Users,
  Clock,
  FileText,
  Video,
  Stethoscope,
  ChevronRight,
  Shield,
  Hospital,
} from 'lucide-react';
import { CURRENT_DOCTOR } from '../services/mockData.ts';

export const DoctorLayout: React.FC = () => {
  const [doctorStatus, setDoctorStatus] = useState<'READY' | 'BUSY' | 'AWAY'>('READY');
  const location = useLocation();

  const navItems = [
    {
      to: '/doctor/schedule',
      label: 'Lịch làm việc & Nghỉ phép',
      icon: Calendar,
      badge: 'Tuần 3',
      description: 'Quản lý ca khám, khung giờ & ngày nghỉ',
    },
    {
      to: '/doctor/appointments',
      label: 'Lịch hẹn bệnh nhân',
      icon: Clock,
      badge: 'Tuần 4',
      description: 'Danh sách lịch khám trực tiếp & từ xa',
    },
    {
      to: '/doctor/queue',
      label: 'Hàng khám & Gọi lượt',
      icon: Users,
      badge: 'Tuần 5',
      description: 'Thứ tự tiếp đón & gọi số lượt khám',
    },
    {
      to: '/doctor/consultation',
      label: 'Khám bệnh & Kê đơn',
      icon: FileText,
      badge: 'Tuần 5',
      description: 'Bệnh án điện tử & đơn thuốc',
    },
    {
      to: '/doctor/telehealth',
      label: 'Phòng khám từ xa',
      icon: Video,
      badge: 'Tuần 6',
      description: 'Tư vấn video trực tuyến bảo mật',
    },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shadow-sm z-20">
        <div>
          {/* Clinic Brand */}
          <div className="p-5 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Hospital className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-800 text-base leading-tight">ClinicCare</h1>
              <p className="text-[11px] font-medium text-slate-400">Cổng Thông Tin Bác Sĩ</p>
            </div>
          </div>

          {/* Doctor Quick Badge */}
          <div className="p-4 m-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-xl border border-blue-100/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={CURRENT_DOCTOR.avatarUrl}
                  alt={CURRENT_DOCTOR.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/30"
                />
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                    doctorStatus === 'READY'
                      ? 'bg-emerald-500'
                      : doctorStatus === 'BUSY'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xs font-bold text-slate-800 truncate">{CURRENT_DOCTOR.name}</h2>
                <p className="text-[11px] text-blue-600 font-medium truncate">{CURRENT_DOCTOR.specialtyName}</p>
                <p className="text-[10px] text-slate-500">Mã: {CURRENT_DOCTOR.code}</p>
              </div>
            </div>

            {/* Status Selector */}
            <div className="mt-3 pt-2.5 border-t border-blue-100/60 flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Trạng thái:</span>
              <select
                value={doctorStatus}
                onChange={(e) => setDoctorStatus(e.target.value as any)}
                className="bg-white border border-blue-200 text-slate-700 rounded-lg px-2 py-0.5 font-medium text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="READY">🟢 Sẵn sàng</option>
                <option value="BUSY">🟡 Đang khám</option>
                <option value="AWAY">⚪ Tạm nghỉ</option>
              </select>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Phân hệ bác sĩ
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30 font-semibold'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 ${
                            isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                          isActive
                            ? 'bg-blue-700/50 text-blue-100'
                            : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                        }`}
                      >
                        {item.badge}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-2">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            <span>Phụ trách: <strong>Nguyễn Huỳnh Anh Kiệt</strong></span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            MSSV: 52400052 | Frontend Bác Sĩ
          </div>
        </div>
      </aside>

      {/* Main View Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-2xl shadow-slate-100/50 z-10">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Stethoscope className="w-4 h-4 text-blue-600" />
            <span>Phòng khám ngoại trú</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">
              {navItems.find((n) => location.pathname.startsWith(n.to))?.label || 'Bác sĩ'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full text-xs text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{CURRENT_DOCTOR.roomNumber}</span>
            </div>

            <div className="text-xs text-slate-500 border-l border-slate-200 pl-4 font-mono">
              {new Date().toLocaleDateString('vi-VN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>
          </div>
        </header>

        {/* Dynamic Outlet Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/60">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
