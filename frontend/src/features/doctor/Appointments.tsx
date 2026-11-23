import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarCheck, CheckCircle2, Search, UserX, Video } from "lucide-react";
import { progressAppointment, type NoShowFollowUp } from "@/api/appointments";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useNow } from "@/core/useAsync";
import { canMarkNoShow, dayKey, inJoinWindow, todayKey } from "@/core/datetime";
import { APPOINTMENT_STATUS, MODE_SHORT, NO_SHOW_REASON, apptCode, patientCode } from "@/core/labels";
import type { Appointment, AppointmentStatus } from "@/core/types";
import { AsyncBlock, Empty, Metric, Notice, PageHead, Panel, Tabs, useToast } from "@/ui";
import { AppointmentRow } from "../shared/AppointmentRow";
import { NoShowDialog } from "../shared/NoShowDialog";
import { useDoctor } from "./DoctorContext";

type Tab = "today" | "upcoming" | "past" | "all";
export function DoctorAppointmentsPage() {
  const { appointments, loading, reload, truncated } = useDoctor();
  const toast = useToast();
  const command = useCommand();
  const now = useNow(15_000).getTime();
  const [tab, setTab] = useState<Tab>("today");
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [mode, setMode] = useState("");
  const [query, setQuery] = useState("");
  const [noShow, setNoShow] = useState<Appointment | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const today = todayKey();

  const todayCount = appointments.filter((a) => dayKey(a.startAt) === today).length;
  const upcomingCount = appointments.filter((a) => dayKey(a.startAt) > today).length;
  const pastCount = appointments.filter((a) => dayKey(a.startAt) < today).length;
  const remoteCount = appointments.filter((a) => a.mode === "REMOTE").length;
  const inPersonCount = appointments.length - remoteCount;
  const completedCount = appointments.filter((a) => a.status === "COMPLETED").length;
  const completedRemote = appointments.filter((a) => a.status === "COMPLETED" && a.mode === "REMOTE").length;
  const inProgressCount = appointments.filter((a) => a.status === "IN_PROGRESS").length;
  const staleInProgressCount = appointments.filter((a) => a.status === "IN_PROGRESS" && dayKey(a.startAt) < today).length;

  const q = query.trim().toLowerCase();
  const inTab = (a: Appointment) => {
    if (tab === "all") return true;
    const d = dayKey(a.startAt);
    return tab === "today" ? d === today : tab === "upcoming" ? d > today : d < today;
  };
  const matchesQuery = (a: Appointment) =>
    !q ||
    apptCode(a.id).toLowerCase().includes(q) ||
    patientCode(a.patientId).toLowerCase().includes(q) ||
    a.id.toLowerCase().includes(q) ||
    a.patientId.toLowerCase().includes(q);
  const rows = appointments
    .filter((a) => inTab(a) && (!status || a.status === status) && (!mode || a.mode === mode) && matchesQuery(a))
    .sort((a, b) => (tab === "past" || tab === "all" ? b.startAt.localeCompare(a.startAt) : a.startAt.localeCompare(b.startAt)));

  const doNoShow = async (followUp: NoShowFollowUp) => {
    if (!noShow) return;
    setBusy(true); setErr("");
    try {
      await command(`progress:${noShow.id}`, { version: noShow.version, ...followUp },
        key => progressAppointment(noShow.id, "NO_SHOW", noShow.version, key, followUp));
      toast.success(followUp.sendRebookingEmail
        ? "Đã ghi nhận vắng mặt và đưa email vào hàng chờ gửi."
        : "Đã ghi nhận vắng mặt.");
      setNoShow(null);
      await reload();
    }
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
        {a.mode === "REMOTE" && (a.status === "IN_PROGRESS" || a.status === "COMPLETED") && (
          <Link className={"btn sm" + (a.status === "COMPLETED" ? " soft" : "")} to={`/doctor/consultation/${a.id}`}>{a.status === "COMPLETED" ? "Xem hồ sơ" : "Mở hồ sơ"}</Link>
        )}
        {a.mode === "REMOTE" && a.status === "CONFIRMED" && canMarkNoShow(a.startAt, now) && config.backend.progress && (
          <button className="btn sm danger" onClick={() => { setNoShow(a); setErr(""); }}><UserX size={14} aria-hidden /> Vắng mặt</button>
        )}
        {a.status === "NO_SHOW" && <span className="muted">{a.noShowReason ? NO_SHOW_REASON[a.noShowReason] : "Chưa rõ lý do"}</span>}
      </>
    );
  };

  const hasFilter = Boolean(status || mode || q);

  return (
    <>
      <PageHead title="Lịch hẹn & Lịch sử khám" text="Theo dõi tổng quan các ca khám trực tiếp và từ xa." />
      {truncated && <Notice tone="warn">Dữ liệu lịch quá lớn, có thể chưa đầy đủ.</Notice>}
      {staleInProgressCount > 0 && (
        <Notice tone="warn">
          <div className="row between grow">
            <span>
              Có <b>{staleInProgressCount}</b> ca khám từ ngày trước vẫn ở trạng thái <b>Đang khám</b> do chưa hoàn tất hồ sơ bệnh án.
            </span>
            <button
              type="button"
              className="btn sm"
              onClick={() => { setTab("all"); setStatus("IN_PROGRESS"); setMode(""); setQuery(""); }}
            >
              Xem các ca chưa hoàn tất
            </button>
          </div>
        </Notice>
      )}
      <div className="metrics">
        <Metric label="Tổng ca khám" value={loading ? "…" : appointments.length} hint={`${inPersonCount} trực tiếp · ${remoteCount} từ xa`} icon={<CalendarCheck size={16} />} />
        <Metric label="Khám từ xa" value={loading ? "…" : remoteCount} hint={`${completedRemote} đã hoàn tất`} icon={<Video size={16} />} tone="purple" />
        <Metric label="Đã hoàn tất" value={loading ? "…" : completedCount} hint={`${completedCount - completedRemote} trực tiếp · ${completedRemote} từ xa`} icon={<CheckCircle2 size={16} />} tone="green" />
        <Metric label="Chưa hoàn tất hồ sơ" value={loading ? "…" : inProgressCount} hint={staleInProgressCount > 0 ? `${staleInProgressCount} ca từ ngày trước` : "Đang khám hôm nay"} icon={<Activity size={16} />} tone={inProgressCount > 0 ? "amber" : undefined} />
      </div>
      <Panel>
        <div className="filters">
          <Tabs<Tab>
            label="Khoảng thời gian"
            value={tab}
            onChange={setTab}
            items={[
              { id: "today", label: `Hôm nay (${todayCount})` },
              { id: "upcoming", label: `Sắp tới (${upcomingCount})` },
              { id: "past", label: `Đã qua (${pastCount})` },
              { id: "all", label: `Tất cả (${appointments.length})` },
            ]}
          />
          <div className="search">
            <Search size={16} aria-hidden />
            <input
              className="field"
              type="search"
              aria-label="Tìm mã lịch hoặc mã bệnh nhân"
              placeholder="Tìm mã lịch (LH-...) hoặc mã BN..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select className="field" aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="">Trạng thái</option>{Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <select className="field" aria-label="Hình thức" value={mode} onChange={(e) => setMode(e.target.value)}><option value="">Hình thức</option><option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option><option value="REMOTE">{MODE_SHORT.REMOTE}</option></select>
          {hasFilter && <button type="button" className="btn sm" onClick={() => { setStatus(""); setMode(""); setQuery(""); }}>Xóa lọc</button>}
        </div>
        <AsyncBlock loading={loading} error="" empty={rows.length === 0} emptyTitle="Không có lịch hẹn phù hợp">
          {rows.length === 0 ? <Empty title="Không có lịch hẹn phù hợp" /> : <div className="list">{rows.map((a) => <AppointmentRow key={a.id} item={a} subject="patient" actions={actions(a)} />)}</div>}
        </AsyncBlock>
      </Panel>
      {noShow && <NoShowDialog appointment={noShow} busy={busy} error={err}
        onCancel={() => setNoShow(null)} onConfirm={(followUp) => void doNoShow(followUp)} />}
    </>
  );
}
