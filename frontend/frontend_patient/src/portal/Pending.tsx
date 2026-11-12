import { useEffect, useRef, useState } from "react";
import {
  Camera,
  FileHeart,
  Info,
  Mic,
  MicOff,
  Video,
  VideoOff,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { doctorName, usePortal } from "./data";
import { Button, Empty, ErrorBox, Heading, StatusTag } from "./ui";
import { toLocalDateShort, toLocalTime } from "./utils";
export function Records() {
  const { appointments, doctors } = usePortal();
  const visits = appointments
    .filter((a) => a.status === "COMPLETED")
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const [selected, setSelected] = useState(visits[0]?.id || "");
  const visit = visits.find((a) => a.id === selected);
  return (
    <>
      <Heading
        eyebrow="HỒ SƠ SỨC KHỎE"
        title="Hồ sơ & đơn thuốc"
        text="Lịch sử khám và thông tin điều trị của bạn."
      />
      <div className="notice">
        <Info />
        <span>
          <b>Đang chờ tích hợp hồ sơ và đơn thuốc.</b> Phòng khám chưa cung cấp
          dữ liệu này trên cổng bệnh nhân. Lịch khám hoàn tất bên dưới được lấy
          từ hệ thống.
        </span>
      </div>
      <div className="records">
        <aside className="card visits">
          <div className="card-head">
            <span>
              <h2>Lịch sử khám</h2>
              <p>{visits.length} lần khám đã hoàn tất</p>
            </span>
          </div>
          {visits.length ? (
            visits.map((a) => (
              <button
                key={a.id}
                className={selected === a.id ? "active" : ""}
                onClick={() => setSelected(a.id)}
              >
                <span>
                  <b>{toLocalDateShort(a.startAt).slice(0, 2)}</b>
                  <small>THÁNG {toLocalDateShort(a.startAt).slice(3, 5)}</small>
                </span>
                <div>
                  <b>{doctorName(doctors.find((d) => d.id === a.doctorId))}</b>
                  <small>
                    {toLocalDateShort(a.startAt)} · {toLocalTime(a.startAt)}
                  </small>
                  <em>Đã hoàn tất</em>
                </div>
              </button>
            ))
          ) : (
            <Empty title="Chưa có lần khám hoàn tất" />
          )}
        </aside>
        <div className="record-detail">
          <section className="card record-title">
            <span>
              <FileHeart />
            </span>
            <div>
              <small>
                {visit
                  ? "LẦN KHÁM · " + toLocalDateShort(visit.startAt)
                  : "HỒ SƠ CỦA BẠN"}
              </small>
              <h2>
                {visit
                  ? doctorName(doctors.find((d) => d.id === visit.doctorId))
                  : "Hồ sơ bệnh án"}
              </h2>
              <p>{visit ? "Mã lịch: " + visit.id : "Chưa có dữ liệu hồ sơ"}</p>
            </div>
            {visit && <StatusTag status={visit.status} />}
          </section>
          <section className="card clinical">
            <div className="card-head">
              <span>
                <h2>Thông tin lâm sàng</h2>
                <p>Chỉ hiển thị bản hồ sơ đã hoàn tất khi được tích hợp</p>
              </span>
            </div>
            <Empty
              title="Chưa có dữ liệu hồ sơ"
              text="Chẩn đoán, triệu chứng và lời dặn sẽ xuất hiện tại đây sau khi phòng khám cung cấp."
            />
          </section>
          <section className="card prescription">
            <div className="card-head">
              <span>
                <h2>Đơn thuốc điện tử</h2>
                <p>Chỉ hiển thị đơn thuốc đã phát hành</p>
              </span>
            </div>
            <Empty
              title="Chưa có dữ liệu đơn thuốc"
              text="Thông tin thuốc và hướng dẫn sử dụng sẽ được cập nhật sau."
            />
          </section>
        </div>
      </div>
    </>
  );
}
export function Telehealth() {
  const { appointments, doctors, specialties } = usePortal(),
    [params] = useSearchParams();
  const remote = appointments.filter(
    (a) =>
      a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status),
  );
  const requested = params.get("appointmentId");
  const [selected, setSelected] = useState(requested || remote[0]?.id || "");
  const appointment = remote.find((a) => a.id === selected);
  const doctor = doctors.find((d) => d.id === appointment?.doctorId);
  const stream = useRef<MediaStream | null>(null),
    video = useRef<HTMLVideoElement>(null),
    request = useRef(0);
  const [camera, setCamera] = useState(true),
    [mic, setMic] = useState(true),
    [tested, setTested] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(
    () => () => {
      request.current++;
      stream.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );
  const test = async () => {
    const current = ++request.current;
    setError("");
    setBusy(true);
    setTested(false);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Không hỗ trợ");
      const media = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      if (current !== request.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      media.getVideoTracks().forEach((t) => {
        t.enabled = camera;
      });
      media.getAudioTracks().forEach((t) => {
        t.enabled = mic;
      });
      if (video.current) video.current.srcObject = media;
      setTested(true);
    } catch {
      if (current === request.current)
        setError(
          "Không mở được camera hoặc micro. Hãy kiểm tra thiết bị và quyền truy cập của trình duyệt.",
        );
    } finally {
      if (current === request.current) setBusy(false);
    }
  };
  const toggleCamera = () => {
    const next = !camera;
    setCamera(next);
    stream.current?.getVideoTracks().forEach((t) => {
      t.enabled = next;
    });
  };
  const toggleMic = () => {
    const next = !mic;
    setMic(next);
    stream.current?.getAudioTracks().forEach((t) => {
      t.enabled = next;
    });
  };
  return (
    <>
      <Heading
        eyebrow="KHÁM TỪ XA"
        title="Phòng chờ trực tuyến"
        text="Kiểm tra thiết bị trước buổi khám với bác sĩ."
      />
      <div className="notice">
        <Info />
        <span>
          <b>Đang chờ tích hợp cuộc gọi.</b> Bạn có thể kiểm tra thiết bị; chức
          năng tham gia phòng sẽ mở khi dịch vụ khám từ xa sẵn sàng.
        </span>
      </div>
      {remote.length > 0 ? (
        <label className="field-label">
          Lịch khám từ xa
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {!appointment && (
              <option value={selected}>Lịch được chọn không khả dụng</option>
            )}
            {remote.map((a) => (
              <option key={a.id} value={a.id}>
                {toLocalDateShort(a.startAt)} {toLocalTime(a.startAt)} ·{" "}
                {doctorName(doctors.find((d) => d.id === a.doctorId))}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <section className="card">
          <Empty title="Bạn chưa có lịch khám từ xa đang hiệu lực" />
        </section>
      )}
      <div className="telehealth">
        <section className="preview">
          <video
            ref={video}
            autoPlay
            muted
            playsInline
            className={tested && camera ? "local-video" : "local-video hidden"}
          />
          <div>
            {!tested || !camera ? <VideoOff /> : null}
            <small>
              {tested
                ? camera
                  ? "Hình ảnh camera của bạn"
                  : "Camera đang tắt"
                : "Chưa kiểm tra thiết bị"}
            </small>
          </div>
          <footer>
            <button
              aria-label={mic ? "Tắt micro" : "Bật micro"}
              onClick={toggleMic}
              className={!mic ? "off" : ""}
            >
              {mic ? <Mic /> : <MicOff />}
            </button>
            <button
              aria-label={camera ? "Tắt camera" : "Bật camera"}
              onClick={toggleCamera}
              className={!camera ? "off" : ""}
            >
              {camera ? <Camera /> : <VideoOff />}
            </button>
          </footer>
        </section>
        <aside className="card waiting">
          <span className="video-icon">
            <Video />
          </span>
          <span className="eyebrow">THÔNG TIN LỊCH KHÁM</span>
          <h2>{appointment ? doctorName(doctor) : "Chưa chọn lịch khám"}</h2>
          <p>{specialties.find((s) => s.id === doctor?.specialtyId)?.name}</p>
          <div className="wait-time">
            <span>
              <small>NGÀY VÀ GIỜ KHÁM</small>
              <b>
                {appointment
                  ? toLocalDateShort(appointment.startAt) +
                    " · " +
                    toLocalTime(appointment.startAt)
                  : "—"}
              </b>
            </span>
          </div>
          <div className="devices">
            <h3>Kiểm tra thiết bị</h3>
            <div>
              <Camera />
              <span>
                <b>Camera</b>
                <small>
                  {tested
                    ? camera
                      ? "Đã cấp quyền · đang bật"
                      : "Đang tắt"
                    : "Chưa kiểm tra"}
                </small>
              </span>
            </div>
            <div>
              <Mic />
              <span>
                <b>Microphone</b>
                <small>
                  {tested
                    ? mic
                      ? "Đã cấp quyền · đang bật"
                      : "Đang tắt"
                    : "Chưa kiểm tra"}
                </small>
              </span>
            </div>
          </div>
          {error && <ErrorBox error={error} />}
          <Button kind="secondary" onClick={() => void test()} disabled={busy}>
            {busy ? "Đang kiểm tra…" : "Kiểm tra camera & micro"}
          </Button>
          <Button disabled title="Dịch vụ khám từ xa chưa được tích hợp">
            <Video />
            Tham gia phòng khám · Sắp có
          </Button>
        </aside>
      </div>
      <div className="notice">
        <Info />
        Phòng chờ dự kiến mở từ 10 phút trước đến trước 15 phút sau giờ bắt đầu.
        Rời cuộc gọi không tự kết thúc lần khám.
      </div>
    </>
  );
}
