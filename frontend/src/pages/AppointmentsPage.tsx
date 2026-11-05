import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMyAppointments,
  getSlots,
  rescheduleAppointment,
  cancelAppointment,
} from '../api/appointments';
import { Appointment, Slot } from '../types';
import {
  toLocalDisplay,
  toLocalTime,
  todayLocalDate,
  canRescheduleOrCancel,
  generateIdempotencyKey,
} from '../utils/datetime';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast, useToast } from '../components/Toast';
import { ConfirmModal } from '../components/ConfirmModal';
import { ErrorMessage } from '../components/ErrorMessage';

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

export const AppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast, show: showToast, hide: hideToast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // Bộ lọc
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal đổi lịch
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(todayLocalDate());
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [newSlotId, setNewSlotId] = useState<string>('');
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  // Modal hủy lịch
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');

  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchAppointments = () => {
    setLoading(true);
    setError(null);
    getMyAppointments()
      .then((data) => {
        setAppointments(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Lỗi tải lịch từ backend, dùng fallback mock:', err);
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
        ]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Tải slot trống khi mở modal đổi lịch
  useEffect(() => {
    if (!rescheduleTarget || !rescheduleDate) return;
    setLoadingSlots(true);
    setNewSlotId('');
    getSlots({
      date: rescheduleDate,
      doctorId: rescheduleTarget.doctorId,
      mode: rescheduleTarget.mode,
    })
      .then((slots) => setRescheduleSlots(Array.isArray(slots) ? slots : []))
      .catch(() => {
        // demo slots
        setRescheduleSlots([
          {
            id: 'SLOT-NEW-1',
            doctorId: rescheduleTarget.doctorId,
            startAt: `${rescheduleDate}T02:00:00Z`,
            endAt: `${rescheduleDate}T02:20:00Z`,
            mode: rescheduleTarget.mode,
            available: true,
          },
          {
            id: 'SLOT-NEW-2',
            doctorId: rescheduleTarget.doctorId,
            startAt: `${rescheduleDate}T03:00:00Z`,
            endAt: `${rescheduleDate}T03:20:00Z`,
            mode: rescheduleTarget.mode,
            available: true,
          },
        ]);
      })
      .finally(() => setLoadingSlots(false));
  }, [rescheduleTarget, rescheduleDate]);

  // Xử lý đổi lịch
  const handleReschedule = async () => {
    if (!rescheduleTarget || !newSlotId) return;
    setActionLoading(true);
    const key = generateIdempotencyKey();

    try {
      await rescheduleAppointment(
        rescheduleTarget.id,
        { slotId: newSlotId, version: rescheduleTarget.version ?? 0 },
        key
      );
      showToast('Đổi lịch khám thành công!');
      setRescheduleTarget(null);
      fetchAppointments();
    } catch (err: any) {
      if (err.status === 409) {
        showToast('Khung giờ mới vừa hết hoặc đã quá thời hạn 2h đổi lịch.');
      } else {
        showToast(`Lỗi đổi lịch: ${err.detail || err.message}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý hủy lịch
  const handleCancel = async () => {
    if (!cancelTarget || !cancelReason.trim()) return;
    setActionLoading(true);
    const key = generateIdempotencyKey();

    try {
      await cancelAppointment(
        cancelTarget.id,
        { reason: cancelReason.trim(), version: cancelTarget.version ?? 0 },
        key
      );
      showToast('Hủy lịch khám thành công!');
      setCancelTarget(null);
      setCancelReason('');
      fetchAppointments();
    } catch (err: any) {
      if (err.status === 409) {
        showToast('Lịch đã thay đổi trạng thái hoặc quá thời hạn 2h hủy lịch.');
      } else {
        showToast(`Lỗi hủy lịch: ${err.detail || err.message}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Lọc dữ liệu hiển thị
  const filteredAppointments = appointments.filter((apt) => {
    if (filterMode !== 'ALL' && apt.mode !== filterMode) return false;
    if (filterStatus !== 'ALL' && apt.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = apt.id.toLowerCase().includes(q);
      const matchDoc = (apt.doctorName || '').toLowerCase().includes(q);
      if (!matchId && !matchDoc) return false;
    }
    return true;
  });

  return (
    <div>
      {toast && <Toast message={toast.message} onClose={hideToast} />}

      <div className="head">
        <div>
          <div className="eyebrow">BỆNH NHÂN / CÁ NHÂN</div>
          <h1>Lịch khám của tôi</h1>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => navigate('/patient/booking')}
        >
          ＋ Đặt lịch mới
        </button>
      </div>

      {Boolean(error) && <ErrorMessage error={error} onRetry={fetchAppointments} />}

      <div className="panel">
        <div className="filters">
          <input
            className="field grow"
            placeholder="Tìm theo mã lịch (APT-...) hoặc tên bác sĩ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="field"
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="IN_PERSON">Trực tiếp</option>
            <option value="REMOTE">Từ xa</option>
          </select>

          <select
            className="field"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="CHECKED_IN">Đã check-in</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <button
            className="btn"
            type="button"
            onClick={fetchAppointments}
          >
            ↻ Làm mới
          </button>
        </div>

        {loading ? (
          <LoadingSpinner message="Đang tải danh sách lịch khám..." />
        ) : filteredAppointments.length === 0 ? (
          <div className="empty">
            Không tìm thấy lịch khám nào phù hợp. <br />
            <button
              className="btn btn-primary"
              type="button"
              style={{ marginTop: 12 }}
              onClick={() => navigate('/patient/booking')}
            >
              Đặt lịch mới ngay
            </button>
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Mã lịch</th>
                  <th>Bác sĩ</th>
                  <th>Ngày & Giờ (Asia/HCM)</th>
                  <th>Hình thức</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((apt) => {
                  const eligible =
                    apt.status === 'CONFIRMED' &&
                    canRescheduleOrCancel(apt.startAt);

                  return (
                    <tr key={apt.id}>
                      <td>
                        <b>{apt.id}</b>
                      </td>
                      <td>
                        <div className="person">
                          <div className="miniavatar">
                            {(apt.doctorName || 'BS')
                              .split(' ')
                              .pop()
                              ?.slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div>
                            <span className="docname">{apt.doctorName || 'Bác sĩ chuyên khoa'}</span>
                            {apt.specialtyName && (
                              <span className="docspec">({apt.specialtyName})</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{toLocalDisplay(apt.startAt)}</td>
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
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {apt.mode === 'REMOTE' && apt.status === 'CONFIRMED' && (
                            <button
                              className="btn btn-primary"
                              type="button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              onClick={() =>
                                navigate(
                                  `/patient/telehealth?appointmentId=${apt.id}`
                                )
                              }
                            >
                              ◉ Vào phòng
                            </button>
                          )}

                          {eligible ? (
                            <>
                              <button
                                className="btn"
                                type="button"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                onClick={() => {
                                  setRescheduleTarget(apt);
                                  setRescheduleDate(todayLocalDate());
                                }}
                              >
                                Đổi lịch
                              </button>
                              <button
                                className="btn btn-danger"
                                type="button"
                                style={{ padding: '6px 10px', fontSize: 11 }}
                                onClick={() => {
                                  setCancelTarget(apt);
                                  setCancelReason('');
                                }}
                              >
                                Hủy
                              </button>
                            </>
                          ) : apt.status === 'CONFIRMED' ? (
                            <span
                              style={{
                                color: 'var(--muted)',
                                fontSize: 11,
                                fontStyle: 'italic',
                              }}
                              title="Chỉ được đổi/hủy trước giờ bắt đầu khám ít nhất 2 giờ"
                            >
                              Khóa đổi/hủy (&lt;2h)
                            </span>
                          ) : apt.status === 'COMPLETED' ? (
                            <button
                              className="btn btn-soft"
                              type="button"
                              style={{ padding: '6px 10px', fontSize: 11 }}
                              onClick={() => navigate('/patient/records')}
                            >
                              Xem hồ sơ
                            </button>
                          ) : (
                            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                              {apt.cancellationReason || apt.cancelReason
                                ? `Lý do: ${apt.cancellationReason || apt.cancelReason}`
                                : '—'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ĐỔI LỊCH */}
      {rescheduleTarget && (
        <ConfirmModal
          title={`Đổi lịch khám ${rescheduleTarget.id}`}
          message={`Bác sĩ: ${rescheduleTarget.doctorName || 'Bác sĩ'} · Hình thức: ${
            MODE_LABEL[rescheduleTarget.mode]
          }. Vui lòng chọn ngày và khung giờ mới.`}
          confirmLabel={actionLoading ? 'Đang đổi...' : 'Xác nhận đổi lịch'}
          disabled={!newSlotId || actionLoading}
          onConfirm={handleReschedule}
          onCancel={() => setRescheduleTarget(null)}
        >
          <div style={{ margin: '14px 0' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Chọn ngày khám mới:
            </label>
            <input
              className="field"
              type="date"
              min={todayLocalDate()}
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
            />

            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Khung giờ trống trong ngày:
            </label>

            {loadingSlots ? (
              <LoadingSpinner message="Đang tìm khung giờ..." />
            ) : rescheduleSlots.length === 0 ? (
              <p style={{ color: 'var(--amber)', fontSize: 12 }}>
                Không còn khung giờ nào trống trong ngày này.
              </p>
            ) : (
              <div className="row" style={{ gap: 8 }}>
                {rescheduleSlots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`slot ${newSlotId === s.id ? 'selected' : ''}`}
                    onClick={() => setNewSlotId(s.id)}
                  >
                    {toLocalTime(s.startAt)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </ConfirmModal>
      )}

      {/* MODAL HỦY LỊCH */}
      {cancelTarget && (
        <ConfirmModal
          title={`Hủy lịch khám ${cancelTarget.id}?`}
          message="Bạn có chắc chắn muốn hủy lịch khám này? Khung giờ sẽ được giải phóng cho bệnh nhân khác."
          confirmLabel={actionLoading ? 'Đang hủy...' : 'Xác nhận hủy lịch'}
          confirmVariant="danger"
          disabled={!cancelReason.trim() || actionLoading}
          onConfirm={handleCancel}
          onCancel={() => setCancelTarget(null)}
        >
          <div style={{ margin: '14px 0' }}>
            <label
              style={{
                display: 'block',
                fontSize: 12,
                fontWeight: 700,
                marginBottom: 6,
                color: '#40516a',
              }}
            >
              Lý do hủy lịch *
            </label>
            <textarea
              className="field"
              rows={3}
              style={{ width: '100%' }}
              placeholder="Vui lòng nhập lý do (bận công tác, thay đổi kế hoạch...)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
        </ConfirmModal>
      )}
    </div>
  );
};
