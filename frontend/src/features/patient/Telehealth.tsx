import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { formatDate, formatTime } from "@/core/datetime";
import { Empty, PageHead, Panel } from "@/ui";
import { TelehealthRoom } from "@/features/shared/TelehealthRoom";
import { usePatient } from "./PatientContext";

export function PatientTelehealthPage() {
  const { appointments, loading } = usePatient();
  const dir = useDirectory();
  const [params, setParams] = useSearchParams();
  const remote = appointments.filter((a) => a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const selected = remote.find((a) => a.id === params.get("appointmentId")) ?? remote[0];

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link to="/patient" className="btn sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Quay lại Tổng quan
        </Link>
      </div>
      <PageHead eyebrow="Khám từ xa" title="Phòng chờ trực tuyến" text="Kiểm tra thiết bị và vào phòng chờ trước giờ hẹn." />
      {loading ? <div className="empty">Đang tải…</div> : !selected ? (
        <Panel><Empty title="Bạn chưa có lịch khám từ xa đang hiệu lực" text="Chọn hình thức “Khám từ xa” khi đặt lịch." /></Panel>
      ) : (
        <>
          {remote.length > 1 && (
            <div className="filters">
              <label className="row"><span className="sub">Lịch khám từ xa</span>
                <select className="field" value={selected.id} onChange={(e) => setParams({ appointmentId: e.target.value })}>
                  {remote.map((a) => <option key={a.id} value={a.id}>{formatDate(a.startAt)} {formatTime(a.startAt)} · {dir.doctorName(a.doctorId)}</option>)}
                </select>
              </label>
            </div>
          )}
          <TelehealthRoom key={selected.id} role="PATIENT" appointment={selected} counterpartName={dir.doctorName(selected.doctorId)} />
        </>
      )}
    </>
  );
}
