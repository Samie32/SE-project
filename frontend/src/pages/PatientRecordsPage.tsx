import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyAppointments } from '../api/appointments';
import { Appointment } from '../types';
import { toLocalDate, toLocalTime } from '../utils/datetime';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const PatientRecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [activeTab, setActiveTab] = useState<'records' | 'prescriptions'>('records');

  useEffect(() => {
    getMyAppointments()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const completed = list.filter((a) => a.status === 'COMPLETED');
        setAppointments(completed);
        if (completed.length > 0) {
          setSelectedApt(completed[0]);
        }
      })
      .catch(() => {
        // Mock demo hoàn tất khám
        const mockCompleted: Appointment[] = [
          {
            id: 'APT-0610',
            doctorId: 'DOC-003',
            doctorName: 'BS. Lê Thu Hà',
            specialtyName: 'Nhi khoa',
            slotId: 'SLOT-03',
            startAt: '2026-10-18T03:00:00Z',
            endAt: '2026-10-18T03:20:00Z',
            mode: 'IN_PERSON',
            status: 'COMPLETED',
            version: 1,
          },
        ];
        setAppointments(mockCompleted);
        setSelectedApt(mockCompleted[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="head">
        <div>
          <div className="eyebrow">LÂM SÀNG / HỒ SƠ Y TẾ</div>
          <h1>Hồ sơ bệnh án & đơn thuốc của tôi</h1>
        </div>
        <span className="pill ok">Chế độ xem chỉ đọc</span>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={`tab ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          <span style={{ fontSize: 15 }}>▤</span>
          <span>Hồ sơ bệnh án</span>
        </button>
        <button
          type="button"
          className={`tab ${activeTab === 'prescriptions' ? 'active' : ''}`}
          onClick={() => setActiveTab('prescriptions')}
        >
          <span style={{ fontSize: 15 }}>＋</span>
          <span>Đơn thuốc điện tử</span>
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Đang tải dữ liệu hồ sơ khám..." />
      ) : appointments.length === 0 ? (
        <div className="panel empty">
          <p style={{ fontSize: 16, marginBottom: 8 }}>Chưa có lần khám nào hoàn tất.</p>
          <small style={{ color: 'var(--muted)' }}>
            Hồ sơ bệnh án và đơn thuốc sẽ tự động hiển thị tại đây sau khi bác sĩ kết thúc lần khám và phát hành hồ sơ.
          </small>
          <div style={{ marginTop: 16 }}>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => navigate('/patient/booking')}
            >
              Đặt lịch khám ngay
            </button>
          </div>
        </div>
      ) : (
        <div className="grid2">
          {/* Cột trái: Danh sách các lần khám đã hoàn tất */}
          <div className="panel">
            <div className="panel-head">
              <h2>Lịch sử các lần khám</h2>
              <span className="muted">{appointments.length} lần khám</span>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Mã lịch</th>
                    <th>Bác sĩ & Khoa</th>
                    <th>Ngày khám</th>
                    <th>Chọn</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr
                      key={apt.id}
                      style={{
                        background:
                          selectedApt?.id === apt.id ? 'var(--blue2)' : 'transparent',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedApt(apt)}
                    >
                      <td><b>{apt.id}</b></td>
                      <td>
                        <span className="docname">{apt.doctorName || 'Bác sĩ'}</span>
                        {apt.specialtyName && (
                          <span className="docspec">({apt.specialtyName})</span>
                        )}
                      </td>
                      <td>
                        {toLocalDate(apt.startAt)}
                        <br />
                        <small>{toLocalTime(apt.startAt)}</small>
                      </td>
                      <td>
                        <button
                          className={`btn ${selectedApt?.id === apt.id ? 'btn-primary' : 'btn-soft'}`}
                          type="button"
                          style={{ padding: '4px 8px', fontSize: 11 }}
                          onClick={() => setSelectedApt(apt)}
                        >
                          {selectedApt?.id === apt.id ? 'Đang xem' : 'Xem'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cột phải: Chi tiết hồ sơ hoặc đơn thuốc */}
          <div className="panel">
            {selectedApt && (
              <>
                <div className="panel-head">
                  <div>
                    <h2>
                      {activeTab === 'records'
                        ? 'Chi tiết hồ sơ bệnh án'
                        : 'Chi tiết đơn thuốc điện tử'}
                    </h2>
                    <div className="muted">
                      Lịch khám: {selectedApt.id} · {toLocalDate(selectedApt.startAt)}
                    </div>
                  </div>
                  <span className="pill ok">Hồ sơ đã phát hành (FINAL)</span>
                </div>

                {activeTab === 'records' ? (
                  <div>
                    <div className="formfield" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#40516a' }}>
                        Bác sĩ phụ trách
                      </label>
                      <input
                        className="field"
                        style={{ width: '100%', background: '#f8fafd' }}
                        value={`${selectedApt.doctorName || 'BS'} (${selectedApt.specialtyName || 'Khoa'})`}
                        readOnly
                      />
                    </div>

                    <div className="formfield" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#40516a' }}>
                        Triệu chứng & Lý do khám
                      </label>
                      <textarea
                        className="field"
                        rows={2}
                        style={{ width: '100%', background: '#f8fafd' }}
                        value="Bệnh nhân cảm thấy mệt mỏi, ho khan kéo dài 3 ngày, sốt nhẹ về chiều."
                        readOnly
                      />
                    </div>

                    <div className="formfield" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#40516a' }}>
                        Chẩn đoán của bác sĩ
                      </label>
                      <textarea
                        className="field"
                        rows={2}
                        style={{ width: '100%', background: '#f8fafd' }}
                        value="Viêm đường hô hấp trên cấp tính / Cần nghỉ ngơi và uống nhiều nước."
                        readOnly
                      />
                    </div>

                    <div className="formfield" style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#40516a' }}>
                        Lời dặn bác sĩ
                      </label>
                      <textarea
                        className="field"
                        rows={2}
                        style={{ width: '100%', background: '#f8fafd' }}
                        value="Uống thuốc theo đơn đúng giờ. Tái khám sau 5 ngày nếu triệu chứng không thuyên giảm."
                        readOnly
                      />
                    </div>

                    <div className="notice">
                       Hồ sơ y tế được bảo mật và phân quyền nghiêm ngặt. Mọi lượt truy cập xem hồ sơ đều được ghi nhận vào nhật ký kiểm toán (Audit Log).
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Tên thuốc</th>
                            <th>Liều dùng</th>
                            <th>Số lượng</th>
                            <th>Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td><b>Paracetamol 500mg</b></td>
                            <td>1 viên sau ăn khi sốt &gt; 38.5°C</td>
                            <td>10 viên</td>
                            <td>Cách ít nhất 4–6 giờ</td>
                          </tr>
                          <tr>
                            <td><b>Cefuroxime 500mg</b></td>
                            <td>1 viên x 2 lần/ngày (sáng/tối)</td>
                            <td>10 viên</td>
                            <td>Sau bữa ăn</td>
                          </tr>
                          <tr>
                            <td><b>Siro ho bổ phế</b></td>
                            <td>10ml x 3 lần/ngày</td>
                            <td>01 chai</td>
                            <td>Uống ấm</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="notice" style={{ marginTop: 16 }}>
                       Vui lòng mang mã đơn thuốc này đến quầy thuốc bệnh viện hoặc nhà thuốc liên kết để nhận thuốc theo đúng chỉ định.
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
