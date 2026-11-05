import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from 'react-oidc-context';
import { getMyAppointments } from '../api/appointments';
import { Appointment } from '../types';
import { toLocalDateShort, toLocalTime } from '../utils/datetime';
import { LoadingSpinner } from '../components/LoadingSpinner';

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy',
  CHECKED_IN: 'Đã check-in',
  IN_PROGRESS: 'Đang khám',
  COMPLETED: 'Đã hoàn tất',
  NO_SHOW: 'Không đến',
};

const STATUS_PILL: Record<string, string> = {
  CONFIRMED: 'bluepill',
  CANCELLED: 'bad',
  CHECKED_IN: 'ok',
  IN_PROGRESS: 'ok',
  COMPLETED: '',
  NO_SHOW: 'bad',
};

const MODE_LABEL: Record<string, string> = {
  IN_PERSON: 'Trực tiếp',
  REMOTE: 'Từ xa',
};

export const PatientHomePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const name =
    auth.user?.profile?.name ||
    auth.user?.profile?.preferred_username ||
    'Vũ Trần Khắc Thuận (BN-52400243)';

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAppointments({ limit: 10 })
      .then((data) => setAppointments(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.warn('Cannot fetch appointments:', err);
        // Fallback demo data nếu backend chưa chạy
        setAppointments([
          {
            id: 'APT-0812',
            doctorId: 'DOC-001',
            doctorName: 'BS. Nguyễn Minh Anh',
            specialtyName: 'Nội tổng quát',
            slotId: 'SLOT-01',
            startAt: new Date(Date.now() + 86400000).toISOString(),
            endAt: new Date(Date.now() + 86400000 + 1200000).toISOString(),
            mode: 'IN_PERSON',
            status: 'CONFIRMED',
            version: 0,
          },
          {
            id: 'APT-0784',
            doctorId: 'DOC-002',
            doctorName: 'BS. Trần Quốc Bảo',
            specialtyName: 'Tim mạch',
            slotId: 'SLOT-02',
            startAt: new Date(Date.now() + 172800000).toISOString(),
            endAt: new Date(Date.now() + 172800000 + 1200000).toISOString(),
            mode: 'REMOTE',
            status: 'CONFIRMED',
            version: 0,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(
    (a) => a.status === 'CONFIRMED' || a.status === 'CHECKED_IN'
  );

  return (
    <div>
      <div className="head">
        <div>
          <div className="eyebrow">CỔNG THÔNG TIN BỆNH NHÂN</div>
          <h1>Xin chào, {name} </h1>
          <p style={{ color: 'var(--muted)', margin: 0 }}>
            Quản lý lịch khám, đặt hẹn và theo dõi hồ sơ y tế
          </p>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate('/patient/booking')}
        >
          ＋ Đặt lịch khám
        </button>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="label">
            Lịch khám sắp tới <span className="mi">▣</span>
          </div>
          <div className="value">{upcoming.length.toString().padStart(2, '0')}</div>
          <div className="hint">
            {upcoming.filter((a) => a.mode === 'IN_PERSON').length} trực tiếp ·{' '}
            {upcoming.filter((a) => a.mode === 'REMOTE').length} từ xa
          </div>
        </div>
        <div className="metric">
          <div className="label">
            Đơn thuốc đang hiệu lực <span className="mi">＋</span>
          </div>
          <div className="value">01</div>
          <div className="hint">Xem hướng dẫn sử dụng</div>
        </div>
        <div className="metric">
          <div className="label">
            Thông báo chưa đọc <span className="mi" style={{ background: '#fff4df', color: '#a76508' }}>✉</span>
          </div>
          <div className="value">03</div>
          <div className="hint" style={{ color: '#a76508' }}>Có nhắc lịch khám</div>
        </div>
        <div className="metric">
          <div className="label">
            Hồ sơ cá nhân <span className="mi" style={{ background: '#e7f8f1', color: '#14866d' }}>✓</span>
          </div>
          <div className="value" style={{ fontSize: 20, paddingTop: 6 }}>Đã xác minh</div>
          <div className="hint" style={{ color: '#14866d' }}>Thông tin được bảo vệ</div>
        </div>
      </div>

      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h2>Lịch hẹn gần đây</h2>
              <div className="muted">Các lượt khám tiếp theo trong kế hoạch</div>
            </div>
            <button
              className="btn btn-soft"
              type="button"
              onClick={() => navigate('/patient/appointments')}
            >
              Xem tất cả →
            </button>
          </div>
          {loading ? (
            <LoadingSpinner />
          ) : appointments.length === 0 ? (
            <div className="empty">
              Chưa có lịch khám nào. <br />
              <button
                className="btn btn-primary"
                type="button"
                style={{ marginTop: 12 }}
                onClick={() => navigate('/patient/booking')}
              >
                Đặt lịch ngay
              </button>
            </div>
          ) : (
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Bác sĩ</th>
                    <th>Ngày giờ</th>
                    <th>Hình thức</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.slice(0, 4).map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <span className="docname">{apt.doctorName || 'BS. Chuyên khoa'}</span>
                        {apt.specialtyName && (
                          <span className="docspec">({apt.specialtyName})</span>
                        )}
                      </td>
                      <td>
                        {toLocalDateShort(apt.startAt)}
                        <br />
                        <small>{toLocalTime(apt.startAt)}</small>
                      </td>
                      <td>
                        <span
                          className={`pill ${
                            apt.mode === 'REMOTE' ? 'purple' : 'bluepill'
                          }`}
                        >
                          {MODE_LABEL[apt.mode] || apt.mode}
                        </span>
                      </td>
                      <td>
                        <span className={`pill ${STATUS_PILL[apt.status] || ''}`}>
                          {STATUS_LABEL[apt.status] || apt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Thao tác nhanh</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => navigate('/patient/booking')}
            >
              ＋ Đặt lịch khám mới
            </button>
            <button
              className="btn btn-soft"
              type="button"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => navigate('/patient/appointments')}
            >
              ▣ Danh sách lịch của tôi
            </button>
            <button
              className="btn"
              type="button"
              style={{ width: '100%', padding: '12px' }}
              onClick={() => navigate('/patient/records')}
            >
              ▤ Hồ sơ bệnh án & đơn thuốc
            </button>
            {upcoming.some((a) => a.mode === 'REMOTE') && (
              <button
                className="btn"
                type="button"
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f0eaff',
                  borderColor: '#d8d0f0',
                  color: '#7050b9',
                }}
                onClick={() => navigate('/patient/telehealth')}
              >
                ◉ Vào phòng khám từ xa
              </button>
            )}
          </div>
          <div className="notice" style={{ marginTop: 16 }}>
             <b>Quy định đổi / hủy:</b> Chỉ thực hiện được khi lịch ở trạng thái
            CONFIRMED và trước giờ khám ít nhất <b>2 giờ</b>.
          </div>
        </div>
      </div>
    </div>
  );
};
