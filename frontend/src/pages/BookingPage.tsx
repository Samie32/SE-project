import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getSpecialties,
  getDoctors,
  getSlots,
  bookAppointment,
} from '../api/appointments';
import { Specialty, Doctor, Slot } from '../types';
import {
  toLocalTime,
  toLocalDate,
  todayLocalDate,
  generateIdempotencyKey,
} from '../utils/datetime';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Toast, useToast } from '../components/Toast';
import { ErrorMessage } from '../components/ErrorMessage';

export const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { toast, show: showToast, hide: hideToast } = useToast();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  const [specialtyId, setSpecialtyId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [date, setDate] = useState<string>(todayLocalDate());
  const [mode, setMode] = useState<'IN_PERSON' | 'REMOTE'>('IN_PERSON');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  const [loadingInitial, setLoadingInitial] = useState<boolean>(true);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<unknown>(null);

  // 1. Tải danh sách chuyên khoa & bác sĩ ban đầu
  useEffect(() => {
    Promise.all([
      getSpecialties().catch(() => [
        { id: 'SPEC-01', name: 'Nội tổng quát' },
        { id: 'SPEC-02', name: 'Tim mạch' },
        { id: 'SPEC-03', name: 'Nhi khoa' },
      ]),
      getDoctors().catch(() => [
        {
          id: 'DOC-01',
          name: 'BS. Nguyễn Minh Anh',
          displayName: 'BS. Nguyễn Minh Anh',
          specialtyId: 'SPEC-01',
          specialtyName: 'Nội tổng quát',
        },
        {
          id: 'DOC-02',
          name: 'BS. Trần Quốc Bảo',
          displayName: 'BS. Trần Quốc Bảo',
          specialtyId: 'SPEC-02',
          specialtyName: 'Tim mạch',
        },
        {
          id: 'DOC-03',
          name: 'BS. Lê Thu Hà',
          displayName: 'BS. Lê Thu Hà',
          specialtyId: 'SPEC-03',
          specialtyName: 'Nhi khoa',
        },
      ]),
    ])
      .then(([specs, docs]) => {
        setSpecialties(specs);
        setDoctors(docs);
        if (specs.length > 0) setSpecialtyId(specs[0].id);
      })
      .finally(() => setLoadingInitial(false));
  }, []);

  // Lọc bác sĩ theo chuyên khoa
  const filteredDoctors = specialtyId
    ? doctors.filter((d) => d.specialtyId === specialtyId)
    : doctors;

  // Tự động chọn bác sĩ đầu tiên khi chuyên khoa thay đổi
  useEffect(() => {
    if (filteredDoctors.length > 0) {
      if (!filteredDoctors.some((d) => d.id === doctorId)) {
        setDoctorId(filteredDoctors[0].id);
      }
    } else {
      setDoctorId('');
    }
  }, [specialtyId, filteredDoctors, doctorId]);

  // 2. Tải khung giờ trống
  const fetchAvailableSlots = () => {
    if (!date) return;
    setLoadingSlots(true);
    setSelectedSlotId('');
    getSlots({
      date,
      doctorId: doctorId || undefined,
      specialtyId: specialtyId || undefined,
      mode,
    })
      .then((data) => {
        setSlots(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        console.warn('Lỗi tải slots từ server, tạo demo slots:', err);
        // Fallback slots demo
        const demoSlots: Slot[] = [
          {
            id: 'SLOT-0900',
            doctorId: doctorId || 'DOC-01',
            startAt: `${date}T02:00:00Z`, // 09:00 UTC+7
            endAt: `${date}T02:20:00Z`,
            mode,
            available: true,
          },
          {
            id: 'SLOT-0920',
            doctorId: doctorId || 'DOC-01',
            startAt: `${date}T02:20:00Z`, // 09:20 UTC+7
            endAt: `${date}T02:40:00Z`,
            mode,
            available: true,
          },
          {
            id: 'SLOT-0940',
            doctorId: doctorId || 'DOC-01',
            startAt: `${date}T02:40:00Z`, // 09:40 UTC+7
            endAt: `${date}T03:00:00Z`,
            mode,
            available: true,
          },
          {
            id: 'SLOT-1020',
            doctorId: doctorId || 'DOC-01',
            startAt: `${date}T03:20:00Z`, // 10:20 UTC+7
            endAt: `${date}T03:40:00Z`,
            mode,
            available: true,
          },
          {
            id: 'SLOT-1040',
            doctorId: doctorId || 'DOC-01',
            startAt: `${date}T03:40:00Z`, // 10:40 UTC+7
            endAt: `${date}T04:00:00Z`,
            mode,
            available: true,
          },
        ];
        setSlots(demoSlots);
      })
      .finally(() => setLoadingSlots(false));
  };

  useEffect(() => {
    fetchAvailableSlots();
  }, [date, doctorId, specialtyId, mode]);

  // Thông tin slot đang chọn
  const selectedSlot = slots.find((s) => s.id === selectedSlotId);
  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const selectedSpecialty = specialties.find((s) => s.id === specialtyId);

  // 3. Xử lý đặt lịch
  const handleConfirmBooking = async () => {
    if (!selectedSlotId) return;
    setSubmitting(true);
    setError(null);
    const key = generateIdempotencyKey();

    try {
      await bookAppointment({ slotId: selectedSlotId }, key);
      showToast('Đặt lịch khám thành công!');
      setTimeout(() => navigate('/patient/appointments'), 1000);
    } catch (err: any) {
      if (err.status === 409) {
        showToast('Khung giờ vừa hết! Đang làm mới danh sách...');
        fetchAvailableSlots(); // Giữ nguyên bộ lọc và reload slots
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {toast && <Toast message={toast.message} onClose={hideToast} />}

      <div className="head">
        <div>
          <div className="eyebrow">BỆNH NHÂN / LỊCH HẸN</div>
          <h1>Đặt lịch khám</h1>
        </div>
        <span className="statusline">
          <i></i> Giờ phòng khám: Asia/Ho_Chi_Minh
        </span>
      </div>

      <div className="steps">
        <div className={`step ${specialtyId && doctorId ? 'on' : ''}`}>
          01 · Chọn bác sĩ
        </div>
        <div className={`step ${selectedSlotId ? 'on' : ''}`}>
          02 · Chọn giờ khám
        </div>
        <div className={`step ${selectedSlotId ? 'on' : ''}`}>
          03 · Xác nhận
        </div>
      </div>

      {Boolean(error) && <ErrorMessage error={error} onRetry={handleConfirmBooking} />}

      <div className="grid2">
        {/* Cột trái: Form thông tin */}
        <div className="panel">
          <div className="panel-head">
            <h2>Thông tin lịch khám</h2>
            <span className="muted">Các trường có dấu * là bắt buộc</span>
          </div>

          {loadingInitial ? (
            <LoadingSpinner message="Đang tải danh mục..." />
          ) : (
            <div className="formgrid">
              <div className="formfield">
                <label>Chuyên khoa *</label>
                <select
                  className="field"
                  style={{ width: '100%' }}
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                >
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="formfield">
                <label>Bác sĩ *</label>
                <select
                  className="field"
                  style={{ width: '100%' }}
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  disabled={filteredDoctors.length === 0}
                >
                  {filteredDoctors.length === 0 ? (
                    <option value="">Không có bác sĩ cho khoa này</option>
                  ) : (
                    filteredDoctors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.displayName || d.name}{d.specialtyName ? ` (${d.specialtyName})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="formfield">
                <label>Ngày khám *</label>
                <input
                  className="field"
                  type="date"
                  min={todayLocalDate()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div className="formfield">
                <label>Hình thức khám *</label>
                <select
                  className="field"
                  style={{ width: '100%' }}
                  value={mode}
                  onChange={(e) =>
                    setMode(e.target.value as 'IN_PERSON' | 'REMOTE')
                  }
                >
                  <option value="IN_PERSON">Khám trực tiếp tại phòng khám</option>
                  <option value="REMOTE">Khám từ xa (Telehealth)</option>
                </select>
              </div>
            </div>
          )}

          <div style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 14, marginBottom: 8 }}>Khung giờ còn trống</h2>
            {loadingSlots ? (
              <LoadingSpinner message="Đang tìm khung giờ trống..." />
            ) : slots.length === 0 ? (
              <div className="notice" style={{ color: 'var(--amber)' }}>
                Không có khung giờ nào còn trống cho ngày này. Vui lòng chọn ngày khác.
              </div>
            ) : (
              <div className="row" style={{ marginTop: 12 }}>
                {slots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`slot ${selectedSlotId === s.id ? 'selected' : ''}`}
                    onClick={() => setSelectedSlotId(s.id)}
                  >
                    {toLocalTime(s.startAt)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="notice" id="slotNotice">
            {selectedSlot
              ? `Đã chọn: ${toLocalTime(selectedSlot.startAt)} ngày ${toLocalDate(
                  selectedSlot.startAt
                )}`
              : 'Chọn một khung giờ phía trên để xem tóm tắt trước khi xác nhận.'}
          </div>

          <div
            className="row"
            style={{ justifyContent: 'space-between', marginTop: 18 }}
          >
            <button
              className="btn"
              type="button"
              onClick={() => navigate('/patient')}
            >
              ← Quay lại
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={!selectedSlotId || submitting}
              onClick={handleConfirmBooking}
            >
              {submitting ? '⏳ Đang xử lý...' : 'Xác nhận đặt lịch →'}
            </button>
          </div>
        </div>

        {/* Cột phải: Tóm tắt thông tin */}
        <div className="panel">
          <div className="panel-head">
            <h2>Tóm tắt lịch hẹn</h2>
            <span
              className={`pill ${selectedSlotId ? 'ok' : 'bluepill'}`}
            >
              {selectedSlotId ? 'Sẵn sàng xác nhận' : 'Chưa chọn giờ'}
            </span>
          </div>

          <div className="doctor-card">
            <div className="docavatar">
              {selectedDoctor
                ? (selectedDoctor.displayName || selectedDoctor.name || 'BS')
                    .split(' ')
                    .pop()
                    ?.slice(0, 2)
                    .toUpperCase()
                : 'BS'}
            </div>
            <div className="docmeta">
              <b>{selectedDoctor?.displayName || selectedDoctor?.name || 'Chưa chọn bác sĩ'}</b>
              {selectedSpecialty?.name && (
                <span className="docspec">({selectedSpecialty.name})</span>
              )}
              <small style={{ display: 'block', marginTop: 2 }}>
                Phòng khám ClinicCare
              </small>
            </div>
          </div>

          <div className="log">
            <div className="logdot"></div>
            <div>
              <b>{date ? toLocalDate(`${date}T00:00:00Z`) : 'Chưa chọn ngày'}</b>
              <small>Ngày khám dự kiến</small>
            </div>
          </div>

          <div className="log">
            <div className="logdot" style={{ background: '#8b6bd6' }}></div>
            <div>
              <b>
                {selectedSlot
                  ? toLocalTime(selectedSlot.startAt)
                  : 'Chưa chọn khung giờ'}
              </b>
              <small>Thời lượng dự kiến: 20 phút</small>
            </div>
          </div>

          <div className="log">
            <div className="logdot" style={{ background: '#18a77f' }}></div>
            <div>
              <b>{mode === 'REMOTE' ? 'Khám từ xa qua Video' : 'Khám trực tiếp tại phòng khám'}</b>
              <small>
                {mode === 'REMOTE'
                  ? 'Tham gia qua phòng khám trực tuyến trên web'
                  : 'Địa chỉ: 123 Đường Y Tế, Quận 5, TP.HCM'}
              </small>
            </div>
          </div>

          <div
            className="notice"
            style={{
              fontSize: 11,
              marginTop: 18,
              background: '#fcfcfc',
              borderColor: '#e8edf5',
            }}
          >
            🔒 Thao tác đặt lịch được bảo vệ bằng Idempotency-Key và khóa giao dịch chống đặt trùng giờ.
          </div>
        </div>
      </div>
    </div>
  );
};
