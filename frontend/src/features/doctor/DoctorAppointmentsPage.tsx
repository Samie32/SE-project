import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  User,
  Phone,
  Video,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { doctorApi } from '../../services/doctorApi.ts';
import { CURRENT_DOCTOR } from '../../services/mockData.ts';
import type { Appointment, AppointmentStatus } from '../../types/doctor.ts';

export const DoctorAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [modeFilter, setModeFilter] = useState<string>('ALL');

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      try {
        const data = await doctorApi.getAppointments(CURRENT_DOCTOR.id);
        setAppointments(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  const filteredAppointments = appointments.filter((app) => {
    const matchSearch =
      app.patientName.toLowerCase().includes(search.toLowerCase()) ||
      app.patientPhone.includes(search) ||
      app.code.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === 'ALL' || app.status === statusFilter;
    const matchMode = modeFilter === 'ALL' || app.mode === modeFilter;

    return matchSearch && matchStatus && matchMode;
  });

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'CHECKED_IN':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">Đã tiếp đón (Check-in)</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 animate-pulse">Đang khám</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">Đã xác nhận</span>;
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">Hoàn tất</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">Đã hủy</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600">{status}</span>;
    }
  };

  const handleStartConsultation = async (app: Appointment) => {
    if (app.mode === 'TELEHEALTH') {
      navigate('/doctor/telehealth');
    } else {
      await doctorApi.updateAppointmentStatus(app.id, 'IN_PROGRESS');
      navigate('/doctor/consultation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Danh Sách Lịch Hẹn Của Bác Sĩ</h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              Tuần 4
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi danh sách bệnh nhân đã đăng ký khám trong ngày, trạng thái tiếp đón và kích hoạt ca khám.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, mã lịch..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Filter className="w-3.5 h-3.5" />
          <span>Lọc theo:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="CHECKED_IN">Đã tiếp đón (Đang chờ khám)</option>
          <option value="IN_PROGRESS">Đang trong phòng khám</option>
          <option value="CONFIRMED">Đã xác nhận</option>
          <option value="COMPLETED">Đã khám xong</option>
        </select>

        <select
          value={modeFilter}
          onChange={(e) => setModeFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none"
        >
          <option value="ALL">Tất cả hình thức</option>
          <option value="IN_PERSON">🏥 Khám trực tiếp</option>
          <option value="TELEHEALTH">📹 Khám từ xa (Video)</option>
        </select>

        <div className="ml-auto text-slate-500">
          Tìm thấy <strong>{filteredAppointments.length}</strong> lịch hẹn
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Đang tải lịch hẹn...</div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            Không tìm thấy lịch hẹn phù hợp với điều kiện tìm kiếm.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAppointments.map((app) => {
              const d = new Date(app.scheduledAt);
              const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

              return (
                <div
                  key={app.id}
                  className="p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    {/* Time pill */}
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-blue-700 flex-shrink-0">
                      <span className="text-sm font-bold font-mono">{timeStr}</span>
                      <span className="text-[10px] text-blue-500 font-medium">{dateStr}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-800">{app.patientName}</h4>
                        <span className="text-[11px] text-slate-400 font-mono">({app.code})</span>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {app.patientPhone}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {app.patientGender === 'MALE' ? 'Nam' : 'Nữ'} • Sinh năm{' '}
                          {new Date(app.patientDob).getFullYear()}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          {app.mode === 'IN_PERSON' ? (
                            <span className="flex items-center gap-1 text-emerald-700">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Trực tiếp (Số {app.ticketNumber})
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-indigo-700">
                              <Video className="w-3.5 h-3.5 text-indigo-600" /> Khám từ xa (Video)
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <strong>Lý do khám:</strong> {app.reason}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {app.status === 'IN_PROGRESS' ? (
                      <button
                        onClick={() => handleStartConsultation(app)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
                      >
                        <span>Tiếp tục khám</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : app.status === 'CHECKED_IN' ? (
                      <button
                        onClick={() => handleStartConsultation(app)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition hover:scale-105"
                      >
                        <span>Vào khám bệnh</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    ) : app.mode === 'TELEHEALTH' && app.status === 'CONFIRMED' ? (
                      <button
                        onClick={() => handleStartConsultation(app)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Mở phòng từ xa</span>
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
