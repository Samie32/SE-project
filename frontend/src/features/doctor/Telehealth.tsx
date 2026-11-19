import { useEffect, useState } from "react";
import { Link, Outlet, useMatch, useNavigate } from "react-router-dom";
import { dayKey, formatDate, formatTime } from "@/core/datetime";
import { apptCode, patientCode } from "@/core/labels";
import { Empty, PageHead, Panel } from "@/ui";
import { TelehealthRoom } from "../shared/TelehealthRoom";
import { useDoctor } from "./DoctorContext";

export function DoctorCallLayout() {
  const roomRoute = useMatch("/doctor/telehealth/:appointmentId?");
  const recordRoute = useMatch("/doctor/consultation/:appointmentId?");
  const appointmentId = roomRoute?.params.appointmentId;
  const [lastRoom, setLastRoom] = useState<string>();
  const nav = useNavigate();
  const { appointments, loading, reload } = useDoctor();
  const remote = appointments.filter((a) => a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const selected = roomRoute
    ? (appointmentId ? remote.find(a => a.id === appointmentId) : remote.find(a => a.id === lastRoom) ?? remote[0])
    : remote.find(a => a.id === lastRoom && (!recordRoute?.params.appointmentId || a.id === recordRoute.params.appointmentId));
  useEffect(() => { setLastRoom(selected?.id); }, [selected?.id]);
  return (
    <>
      <div hidden={!roomRoute}>
      <PageHead title="Phòng khám từ xa" />
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
      </div>
      {!roomRoute && <Outlet />}
    </>
  );
}
