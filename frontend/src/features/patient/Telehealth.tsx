import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, FileHeart, Video } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { dayKey, formatDate, formatTime, todayKey } from "@/core/datetime";
import { APPOINTMENT_STATUS, apptCode } from "@/core/labels";
import { Empty, Notice, PageHead, Panel, StatusPill } from "@/ui";
import { pickDefaultRemote } from "@/features/doctor/Telehealth";
import { TelehealthRoom } from "@/features/shared/TelehealthRoom";
import { usePatient } from "./PatientContext";

export function PatientTelehealthPage() {
  const { appointments, loading, error, reload } = usePatient();
  const dir = useDirectory();
  const [params, setParams] = useSearchParams();
  const paramId = params.get("appointmentId");
  const remote = appointments
    .filter((a) => a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const completedParam = paramId
    ? appointments.find((a) => a.id === paramId && a.mode === "REMOTE" && a.status === "COMPLETED")
    : undefined;
  const selected = completedParam ? undefined : ((paramId ? remote.find((a) => a.id === paramId) : undefined) ?? pickDefaultRemote(remote));
  const isStaleInProgress = Boolean(selected && selected.status === "IN_PROGRESS" && dayKey(selected.startAt) < todayKey());

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link to="/patient" className="btn sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Quay lại Tổng quan
        </Link>
      </div>
      <PageHead eyebrow="Khám từ xa" title="Phòng chờ trực tuyến" text="Kiểm tra thiết bị và vào phòng chờ trước giờ hẹn." />
      {error && (
        <Notice tone="error" actions={<button type="button" className="btn sm" onClick={() => void reload()}>Thử lại</button>}>
          {error}
        </Notice>
      )}
      {loading ? <div className="empty">Đang tải…</div> : completedParam ? (
        <Panel>
          <Empty
            icon={<CheckCircle2 className="ic" style={{ color: "var(--green)" }} aria-hidden />}
            title="Phiên khám từ xa này đã hoàn tất"
            text={
              <span style={{ display: "grid", gap: 10, justifyItems: "center", marginTop: 8 }}>
                <span>
                  Lịch <b className="mono">{apptCode(completedParam.id)}</b> với <b>{dir.doctorName(completedParam.doctorId)}</b> lúc{" "}
                  {formatTime(completedParam.startAt)} ngày {formatDate(completedParam.startAt)} đã đóng và lưu hồ sơ.
                </span>
                <span className="row" style={{ justifyContent: "center" }}>
                  <Link
                    className="btn primary"
                    to={completedParam.encounterId ? `/patient/records?encounterId=${completedParam.encounterId}` : `/patient/records?appointmentId=${completedParam.id}`}
                  >
                    <FileHeart size={16} aria-hidden /> Xem hồ sơ & đơn thuốc
                  </Link>
                  {remote.length > 0 && (
                    <button type="button" className="btn" onClick={() => setParams({})}>
                      Mở lịch từ xa đang hiệu lực
                    </button>
                  )}
                </span>
              </span>
            }
          />
        </Panel>
      ) : !selected ? (
        <Panel>
          <Empty
            title="Bạn chưa có lịch khám từ xa đang hiệu lực"
            text={
              <span style={{ display: "grid", gap: 10, justifyItems: "center", marginTop: 8 }}>
                <span>Chọn hình thức “Khám từ xa” khi đặt lịch để kết nối với bác sĩ trực tuyến.</span>
                <Link className="btn soft" to="/patient/booking?mode=REMOTE">
                  <Video size={16} aria-hidden /> Đặt lịch khám từ xa
                </Link>
              </span>
            }
          />
        </Panel>
      ) : (
        <>
          <div className="filters">
            {remote.length > 1 ? (
              <label className="row"><span className="sub">Lịch khám từ xa</span>
                <select className="field" value={selected.id} onChange={(e) => setParams({ appointmentId: e.target.value })}>
                  {remote.map((a) => <option key={a.id} value={a.id}>{formatDate(a.startAt)} {formatTime(a.startAt)} · {dir.doctorName(a.doctorId)} · {APPOINTMENT_STATUS[a.status].label}</option>)}
                </select>
              </label>
            ) : (
              <span className="sub">
                <b>{dir.doctorName(selected.doctorId)}</b> · {formatDate(selected.startAt)} {formatTime(selected.startAt)}–{formatTime(selected.endAt)}
              </span>
            )}
            <StatusPill status={selected.status} />
            <span className="mono muted">{apptCode(selected.id)}</span>
          </div>
          {isStaleInProgress && (
            <Notice tone="info">
              <span>
                Ca khám ngày <b>{formatDate(selected.startAt)}</b> đang chờ bác sĩ hoàn tất hồ sơ bệnh án trước khi đóng lần khám.
              </span>
            </Notice>
          )}
          <TelehealthRoom
            key={selected.id}
            role="PATIENT"
            appointment={selected}
            counterpartName={dir.doctorName(selected.doctorId)}
            onSessionChange={() => void reload()}
          />
        </>
      )}
    </>
  );
}
