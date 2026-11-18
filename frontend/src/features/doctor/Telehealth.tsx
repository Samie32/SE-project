import { Link, useNavigate, useParams } from "react-router-dom";
import { dayKey, formatDate, formatTime } from "@/core/datetime";
import { apptCode, patientCode } from "@/core/labels";
import { Empty, PageHead, Panel } from "@/ui";
import { TelehealthRoom } from "../shared/TelehealthRoom";
import { useDoctor } from "./DoctorContext";

export function DoctorTelehealthPage() {
  const { appointmentId } = useParams();
  const nav = useNavigate();
  const { appointments, loading, reload } = useDoctor();
  const remote = appointments.filter((a) => a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const selected = remote.find((a) => a.id === appointmentId) ?? (appointmentId ? undefined : remote[0]);
  return (
    <>
      <PageHead eyebrow="Khám từ xa" title="Phòng khám từ xa" text="Vào phòng trong khung [giờ hẹn − 10’, giờ hẹn + 15’). Bắt đầu khi bệnh nhân đã vào; kết thúc phiên rồi mới hoàn tất ca khám." />
      {loading ? <div className="empty">Đang tải…</div> : remote.length === 0 ? <Panel><Empty title="Không có lịch khám từ xa đang hiệu lực" /></Panel> : (
        <>
          <div className="filters"><select className="field" aria-label="Chọn lịch" value={selected?.id ?? ""} onChange={(e) => nav(`/doctor/telehealth/${e.target.value}`)}>
            {!selected && <option value="">Chọn lịch…</option>}
            {remote.map((a) => <option key={a.id} value={a.id}>{formatDate(a.startAt)} {formatTime(a.startAt)} · {apptCode(a.id)} · {patientCode(a.patientId)}{dayKey(a.startAt) ? "" : ""}</option>)}
          </select></div>
          {selected ? (
            <>
              <TelehealthRoom key={selected.id} role="DOCTOR" appointment={selected} counterpartName={"Bệnh nhân " + patientCode(selected.patientId)} onSessionChange={() => void reload()} />
              {selected.status === "IN_PROGRESS" && <p style={{ marginTop: 12 }}><Link className="btn" to={`/doctor/consultation/${selected.id}`}>Mở hồ sơ khám</Link></p>}
            </>
          ) : <Panel><Empty title="Không tìm thấy lịch này" /></Panel>}
        </>
      )}
    </>
  );
}
