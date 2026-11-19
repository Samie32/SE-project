import { useState } from "react";
import { Link } from "react-router-dom";
import { UserX } from "lucide-react";
import { progressAppointment } from "@/api/appointments";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useNow } from "@/core/useAsync";
import { canMarkNoShow, dayKey, inJoinWindow, todayKey } from "@/core/datetime";
import { APPOINTMENT_STATUS, MODE_SHORT } from "@/core/labels";
import type { Appointment, AppointmentStatus } from "@/core/types";
import { AsyncBlock, ConfirmDialog, Empty, Notice, PageHead, Panel, Tabs, useToast } from "@/ui";
import { AppointmentRow } from "../shared/AppointmentRow";
import { useDoctor } from "./DoctorContext";

type Tab = "today" | "upcoming" | "past";
export function DoctorAppointmentsPage() {
  const { appointments, loading, reload, truncated } = useDoctor();
  const toast = useToast();
  const command = useCommand();
  const now = useNow(15_000).getTime();
  const [tab, setTab] = useState<Tab>("today");
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [mode, setMode] = useState("");
  const [noShow, setNoShow] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = todayKey();

  const inTab = (a: Appointment) => { const d = dayKey(a.startAt); return tab === "today" ? d === today : tab === "upcoming" ? d > today : d < today; };
  const rows = appointments.filter((a) => inTab(a) && (!status || a.status === status) && (!mode || a.mode === mode))
    .sort((a, b) => (tab === "past" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));

  const doNoShow = async () => {
    if (!noShow) return;
    setBusy(true); setErr("");
    try { await command(`progress:${noShow.id}`, {targetStatus:"NO_SHOW",version:noShow.version}, key => progressAppointment(noShow.id, "NO_SHOW", noShow.version, key)); toast.success("Đã ghi nhận vắng mặt."); setNoShow(null); await reload(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  const actions = (a: Appointment) => {
    const open = a.status === "IN_PROGRESS" || a.status === "CHECKED_IN" || a.status === "COMPLETED";
    return (
      <>
        {a.mode === "REMOTE" && (a.status === "CONFIRMED" || a.status === "IN_PROGRESS") && (
          <Link className={"btn sm" + (inJoinWindow(a.startAt, now) || a.status === "IN_PROGRESS" ? " primary" : "")} to={`/doctor/telehealth/${a.id}`}>Phòng từ xa</Link>
        )}
        {open && a.mode === "IN_PERSON" && <Link className="btn sm primary" to={`/doctor/consultation/${a.id}`}>{a.status === "COMPLETED" ? "Xem hồ sơ" : "Khám bệnh"}</Link>}
        {a.mode === "REMOTE" && a.status === "IN_PROGRESS" && <Link className="btn sm" to={`/doctor/consultation/${a.id}`}>Hồ sơ</Link>}
        {a.mode === "REMOTE" && a.status === "CONFIRMED" && canMarkNoShow(a.startAt, now) && config.backend.progress && (
          <button className="btn sm danger" onClick={() => { setNoShow(a); setErr(""); }}><UserX size={14} aria-hidden /> Vắng mặt</button>
        )}
      </>
    );
  };

  return (
    <>
      <PageHead title="Lịch hẹn của tôi" />
      {truncated && <Notice tone="warn">Dữ liệu lịch quá lớn, có thể chưa đầy đủ.</Notice>}
      <Panel>
        <div className="filters">
          <Tabs<Tab> label="Khoảng thời gian" value={tab} onChange={setTab} items={[{ id: "today", label: "Hôm nay" }, { id: "upcoming", label: "Sắp tới" }, { id: "past", label: "Đã qua" }]} />
          <select className="field" aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="">Trạng thái</option>{Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select className="field" aria-label="Hình thức" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Hình thức</option><option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option><option value="REMOTE">{MODE_SHORT.REMOTE}</option></select>
        </div>
        <AsyncBlock loading={loading} error="" empty={rows.length === 0} emptyTitle="Không có lịch hẹn">
          {rows.length === 0 ? <Empty title="Không có lịch hẹn" /> : <div className="list">{rows.map((a) => <AppointmentRow key={a.id} item={a} subject="patient" actions={actions(a)} />)}</div>}
        </AsyncBlock>
      </Panel>
      {noShow && <ConfirmDialog title="Ghi nhận vắng mặt?" danger confirmLabel="Ghi nhận" busy={busy} error={err} message="Lịch khám từ xa sẽ chuyển sang “Vắng mặt”. Chỉ thực hiện từ giờ hẹn + 15 phút." onCancel={() => setNoShow(null)} onConfirm={() => void doNoShow()} />}
    </>
  );
}
