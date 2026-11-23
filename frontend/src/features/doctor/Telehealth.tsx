import { useEffect, useState } from "react";
import { Link, Outlet, useMatch, useNavigate } from "react-router-dom";
import { dayKey, formatDate, formatTime, inJoinWindow } from "@/core/datetime";
import { APPOINTMENT_STATUS, apptCode, patientCode } from "@/core/labels";
import type { Appointment } from "@/core/types";
import { Empty, PageHead, Panel, StatusPill } from "@/ui";
import { TelehealthRoom } from "../shared/TelehealthRoom";
import { useDoctor } from "./DoctorContext";

export function pickDefaultRemote(remote: Appointment[], now = Date.now()): Appointment | undefined {
  const today = dayKey(new Date(now).toISOString());
  return (
    remote.find((a) => inJoinWindow(a.startAt, now)) ??
    remote.find((a) => dayKey(a.startAt) === today && a.status === "IN_PROGRESS") ??
    remote.find((a) => dayKey(a.startAt) === today) ??
    remote.find((a) => dayKey(a.startAt) > today) ??
    remote[remote.length - 1] ??
    remote[0]
  );
}

export function DoctorCallLayout() {
  const roomRoute = useMatch("/doctor/telehealth/:appointmentId?");
  const recordRoute = useMatch("/doctor/consultation/:appointmentId?");
  const appointmentId = roomRoute?.params.appointmentId;
  const [lastRoom, setLastRoom] = useState<string>();
  const nav = useNavigate();
  const { appointments, loading, reload } = useDoctor();
  const remote = appointments.filter((a) => a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status)).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const selected = roomRoute
    ? (appointmentId ? remote.find(a => a.id === appointmentId) : remote.find(a => a.id === lastRoom) ?? pickDefaultRemote(remote))
    : remote.find(a => a.id === lastRoom && (!recordRoute?.params.appointmentId || a.id === recordRoute.params.appointmentId));
  useEffect(() => { setLastRoom(selected?.id); }, [selected?.id]);
  return (
    <>
      <div hidden={!roomRoute}>
      <PageHead title="Phòng khám từ xa" />
      {loading ? <div className="empty">Đang tải…</div> : remote.length === 0 ? <Panel><Empty title="Không có lịch khám từ xa đang hiệu lực" /></Panel> : (
        <>
          <div className="filters">
            <select className="field" aria-label="Chọn lịch" value={selected?.id ?? ""} onChange={(e) => nav(`/doctor/telehealth/${e.target.value}`)}>
              {!selected && <option value="">Chọn lịch…</option>}
              {remote.map((a) => <option key={a.id} value={a.id}>{formatDate(a.startAt)} {formatTime(a.startAt)} · {apptCode(a.id)} · {patientCode(a.patientId)} · {APPOINTMENT_STATUS[a.status].label}</option>)}
            </select>
            {selected && <StatusPill status={selected.status} />}
            {selected?.status === "IN_PROGRESS" && <Link className="btn primary" to={`/doctor/consultation/${selected.id}`}>Mở hồ sơ khám</Link>}
          </div>
          {selected ? (
            <TelehealthRoom key={selected.id} role="DOCTOR" appointment={selected} counterpartName={"Bệnh nhân " + patientCode(selected.patientId)} onSessionChange={() => void reload()} />
          ) : <Panel><Empty title="Không tìm thấy lịch này" /></Panel>}
        </>
      )}
      </div>
      {!roomRoute && <Outlet />}
    </>
  );
}
