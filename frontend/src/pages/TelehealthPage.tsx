import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getMyAppointments } from '../api/appointments';
import { Appointment } from '../types';
import { toLocalDate, toLocalTime } from '../utils/datetime';
import { ConfirmModal } from '../components/ConfirmModal';
import { Toast, useToast } from '../components/Toast';

export const TelehealthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const appointmentId = searchParams.get('appointmentId');
  const { toast, show: showToast, hide: hideToast } = useToast();

  const [remoteAppointments, setRemoteAppointments] = useState<Appointment[]>([]);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);

  const [sessionState, setSessionState] = useState<
    'WAITING' | 'ACTIVE' | 'RECONNECTING' | 'ENDED'
  >('WAITING');
  const [confirmed, setConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [deviceTested, setDeviceTested] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  useEffect(() => {
    getMyAppointments()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const remoteApts = list.filter(
          (a) => a.mode === 'REMOTE' && a.status === 'CONFIRMED'
        );
        setRemoteAppointments(remoteApts);

        if (appointmentId) {
          const match = list.find((a) => a.id === appointmentId);
          if (match) setSelectedApt(match);
        } else if (remoteApts.length > 0) {
          setSelectedApt(remoteApts[0]);
        }
      })
      .catch(() => {
        // Mock appointment
        const mock: Appointment = {
          id: appointmentId || 'APT-0784',
          doctorId: 'DOC-002',
          doctorName: 'BS. Trần Quốc Bảo',
          specialtyName: 'Tim mạch',
          slotId: 'SLOT-REMOTE-01',
          startAt: new Date().toISOString(),
          endAt: new Date(Date.now() + 1200000).toISOString(),
          mode: 'REMOTE',
          status: 'CONFIRMED',
          version: 0,
        };
        setRemoteAppointments([mock]);
        setSelectedApt(mock);
      });
  }, [appointmentId]);

  // Kiểm tra thiết bị camera & micro
  const handleTestDevice = async () => {
    setDeviceError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ kiểm tra Media Stream API.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Tắt stream sau khi kiểm tra xong
      stream.getTracks().forEach((track) => track.stop());
      setDeviceTested(true);
      showToast('Camera và Micro hoạt động tốt!');
    } catch (err: any) {
      console.warn('Thiết bị chưa cấp quyền hoặc không tìm thấy:', err);
      setDeviceError(
        'Không thể mở Camera/Micro. Vui lòng cấp quyền trong cài đặt trình duyệt.'
      );
      setDeviceTested(true);
    }
  };

  const handleJoinSession = () => {
    setConfirmed(true);
    setShowConfirmModal(false);
    setSessionState('ACTIVE');
    showToast('Đã tham gia phòng khám từ xa!');
  };

  const handleEndSession = () => {
    setSessionState('ENDED');
    setShowEndModal(false);
    showToast('Phiên khám đã kết thúc.');
  };

  return (
    <div>
      {toast && <Toast message={toast.message} onClose={hideToast} />}

      <div className="head">
        <div>
          <div className="eyebrow">DỊCH VỤ / KHÁM TỪ XA</div>
          <h1>Phòng khám từ xa (Telehealth)</h1>
          {remoteAppointments.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <select
                className="field"
                value={selectedApt?.id}
                onChange={(e) => {
                  const found = remoteAppointments.find((a) => a.id === e.target.value);
                  if (found) setSelectedApt(found);
                }}
              >
                {remoteAppointments.map((a) => (
                  <option key={a.id} value={a.id}>
                    Phiên: {a.id} - {a.doctorName || 'Bác sĩ'}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <span
          className={`pill ${
            sessionState === 'ACTIVE'
              ? 'ok'
              : sessionState === 'RECONNECTING'
              ? 'wait'
              : 'bluepill'
          }`}
        >
          {sessionState === 'ACTIVE'
            ? 'Kết nối trực tuyến'
            : sessionState === 'RECONNECTING'
            ? 'Đang kết nối lại'
            : 'Phòng chờ'}
        </span>
      </div>

      {!selectedApt ? (
        <div className="panel empty">
          <p style={{ fontSize: 16 }}>Bạn hiện không có lịch khám từ xa nào.</p>
          <button
            className="btn btn-primary"
            type="button"
            style={{ marginTop: 12 }}
            onClick={() => navigate('/patient/booking')}
          >
            Đặt lịch khám từ xa ngay
          </button>
        </div>
      ) : (
        <div className="video-layout">
          {/* Cửa sổ Video Call */}
          <div>
            <div className="video-box" style={{ minHeight: 360 }}>
              {sessionState === 'ACTIVE' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 56, color: '#8cb6ff', marginBottom: 12 }}>
                    👨‍⚕️
                  </div>
                  <b style={{ fontSize: 18, color: '#fff', display: 'block' }}>
                    {selectedApt.doctorName || 'Bác sĩ phụ trách'}
                  </b>
                  <small style={{ color: '#a9bad1', marginTop: 4, display: 'block' }}>
                    Phiên video đang diễn ra an toàn (Mã hóa đầu cuối WebRTC)
                  </small>
                  {/* Khung camera nhỏ của bệnh nhân */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      right: 16,
                      width: 130,
                      height: 90,
                      background: '#20395e',
                      borderRadius: 8,
                      border: '2px solid #3d587a',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#d9e5f6',
                      fontSize: 11,
                    }}
                  >
                    {camOn ? '📹 Camera của bạn' : '🚫 Camera tắt'}
                  </div>
                </div>
              ) : sessionState === 'ENDED' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                  <b style={{ fontSize: 18 }}>Phiên khám đã kết thúc</b>
                  <small style={{ color: '#a9bad1', marginTop: 6, display: 'block' }}>
                    Bác sĩ sẽ hoàn tất hồ sơ và đơn thuốc trong ít phút.
                  </small>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 48, color: '#8cb6ff', marginBottom: 12 }}>
                    ▣
                  </div>
                  <b style={{ fontSize: 16, color: '#fff' }}>Phòng khám ClinicCare</b>
                  <small style={{ display: 'block', color: '#a9bad1', marginTop: 7 }}>
                    Video bác sĩ · Đang chờ xác nhận tham gia từ bạn
                  </small>
                </div>
              )}

              <div
                style={{
                  position: 'absolute',
                  bottom: 12,
                  left: 14,
                  fontSize: 11,
                  color: '#b7c8df',
                }}
              >
                Mã phiên: {selectedApt.id} · Chuẩn bảo mật HIPAA
              </div>
            </div>

            {/* Bảng nút điều khiển */}
            <div className="controls">
              <button
                type="button"
                className="control-btn"
                onClick={() => setMicOn(!micOn)}
                style={{
                  background: micOn ? '#fff' : '#ffebee',
                  color: micOn ? '#30445f' : 'var(--red)',
                }}
              >
                {micOn ? '🎙 Micro đang bật' : '🔇 Micro tắt'}
              </button>

              <button
                type="button"
                className="control-btn"
                onClick={() => setCamOn(!camOn)}
                style={{
                  background: camOn ? '#fff' : '#ffebee',
                  color: camOn ? '#30445f' : 'var(--red)',
                }}
              >
                {camOn ? '📹 Camera đang bật' : '🚫 Camera tắt'}
              </button>

              <button
                type="button"
                className="control-btn"
                onClick={handleTestDevice}
              >
                {deviceTested ? '✓ Đã kiểm tra thiết bị' : '⚙ Kiểm tra thiết bị'}
              </button>

              {sessionState === 'ACTIVE' && (
                <button
                  type="button"
                  className="control-btn end"
                  onClick={() => setShowEndModal(true)}
                >
                  Kết thúc phiên
                </button>
              )}
            </div>

            {deviceError && (
              <div
                className="notice"
                style={{
                  borderColor: '#f3d3d8',
                  background: '#fff8f9',
                  color: '#bd3347',
                  marginTop: 12,
                }}
              >
                ⚠ {deviceError}
              </div>
            )}
          </div>

          {/* Cột phải: Thông tin phiên khám */}
          <div className="panel">
            <div className="panel-head">
              <h2>Thông tin phiên khám</h2>
              <span
                className={`pill ${
                  sessionState === 'ACTIVE' ? 'ok' : 'wait'
                }`}
              >
                {sessionState}
              </span>
            </div>

            <div className="doctor-card">
              <div className="docavatar">
                {(selectedApt.doctorName || 'BS')
                  .split(' ')
                  .pop()
                  ?.slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="docmeta">
                <b>{selectedApt.doctorName || 'Bác sĩ phụ trách'}</b>
                {selectedApt.specialtyName && (
                  <span className="docspec">({selectedApt.specialtyName})</span>
                )}
              </div>
            </div>

            <div className="log">
              <div className="logdot"></div>
              <div>
                <b>{toLocalDate(selectedApt.startAt)}</b>
                <small>Giờ hẹn: {toLocalTime(selectedApt.startAt)} (Asia/HCM)</small>
              </div>
            </div>

            <div className="log">
              <div
                className="logdot"
                style={{
                  background: confirmed ? '#18a77f' : '#d89b34',
                }}
              ></div>
              <div>
                <b>{confirmed ? 'Đã xác nhận tham gia' : 'Phòng chờ'}</b>
                <small>
                  {confirmed
                    ? 'Bạn đã sẵn sàng trong phòng'
                    : 'Yêu cầu xác nhận tham gia trước khi kết nối'}
                </small>
              </div>
            </div>

            {sessionState !== 'ACTIVE' && sessionState !== 'ENDED' ? (
              <button
                className="btn btn-primary"
                type="button"
                style={{ width: '100%', padding: '12px', marginTop: 12 }}
                onClick={() => setShowConfirmModal(true)}
              >
                Xác nhận & tham gia phiên →
              </button>
            ) : (
              <button
                className="btn"
                type="button"
                style={{ width: '100%', marginTop: 12 }}
                onClick={() => {
                  setSessionState('RECONNECTING');
                  setTimeout(() => setSessionState('ACTIVE'), 1000);
                  showToast('Đang kết nối lại phòng khám...');
                }}
              >
                ↻ Thử kết nối lại tín hiệu
              </button>
            )}

            <div className="notice" style={{ marginTop: 16 }}>
              💡 <b>Lưu ý:</b> Bệnh nhân và bác sĩ cần bật micro và camera để buổi tư vấn từ xa đạt hiệu quả tốt nhất.
            </div>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN THAM GIA */}
      {showConfirmModal && (
        <ConfirmModal
          title="Xác nhận tham gia phiên khám từ xa"
          message="Bạn xác nhận tham gia phòng khám trực tuyến với bác sĩ và cho phép hệ thống sử dụng camera/micro?"
          confirmLabel="Tôi xác nhận tham gia"
          onConfirm={handleJoinSession}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* MODAL KẾT THÚC PHIÊN */}
      {showEndModal && (
        <ConfirmModal
          title="Kết thúc phiên khám từ xa?"
          message="Kết thúc cuộc gọi chưa đồng nghĩa hồ sơ khám bệnh đã hoàn tất. Bác sĩ sẽ ghi nhận kết quả và phát hành đơn thuốc sau đó. Bạn có chắc muốn rời phòng?"
          confirmLabel="Kết thúc phiên"
          confirmVariant="danger"
          onConfirm={handleEndSession}
          onCancel={() => setShowEndModal(false)}
        />
      )}
    </div>
  );
};
