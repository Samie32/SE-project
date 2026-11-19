import { useState } from "react";
import { CheckCircle2, Mail, RefreshCw, UserX } from "lucide-react";
import { progressAppointment, sendDelayNotice, type NoShowFollowUp } from "@/api/appointments";
import { checkIn } from "@/api/operations";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { useNow } from "@/core/useAsync";
import { canMarkNoShow, canSendDelayNotice, dayKey, formatTime, inCheckinWindow, localToIso, todayKey } from "@/core/datetime";
import { APPOINTMENT_STATUS, MODE_SHORT, NO_SHOW_REASON, apptCode, patientCode } from "@/core/labels";
import type { Appointment, AppointmentMode, AppointmentStatus, QueueTicket } from "@/core/types";
import { AsyncBlock, ConfirmDialog, Field, Notice, PageHead, Panel, PendingBackend, SearchBox, StatusPill, useToast } from "@/ui";
import { NoShowDialog } from "../shared/NoShowDialog";
import { useAppointments } from "./useAppointments";

export function ReceptionPage() {
  const dir = useDirectory();
  const q = useAppointments();
  const toast = useToast();
  const command = useCommand();
  const now = useNow(10_000).getTime();
  const [date, setDate] = useState(todayKey());
  const [doctor, setDoctor] = useState("");
  const [status, setStatus] = useState<"" | AppointmentStatus>("");
  const [mode, setMode] = useState<"" | AppointmentMode>("");
  const [text, setText] = useState("");
  const [busyId, setBusyId] = useState("");
  const [ticket, setTicket] = useState<{ a: Appointment; t: QueueTicket } | null>(null);
  const [noShow, setNoShow] = useState<Appointment | null>(null);
  const [delay, setDelay] = useState<Appointment | null>(null);
  const [estimate, setEstimate] = useState("");
  const [err, setErr] = useState("");
  const estimatedStartAt = delay && estimate ? localToIso(dayKey(delay.startAt), estimate) : undefined;
  const badEstimate = Boolean(estimatedStartAt && delay &&
    Date.parse(estimatedStartAt) <= Math.max(now, Date.parse(delay.startAt)));

  const rows = (q.data?.items ?? [])
    .filter((a) => dayKey(a.startAt) === date && (!doctor || a.doctorId === doctor) && (!status || a.status === status) && (!mode || a.mode === mode))
    .filter((a) => [apptCode(a.id), patientCode(a.patientId), dir.doctorName(a.doctorId), APPOINTMENT_STATUS[a.status].label].join(" ").toLowerCase().includes(text.toLowerCase()))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));

  const doCheckIn = async (a: Appointment) => {
    setBusyId(a.id); setErr("");
    try { const t = await command(`checkin:${a.id}`, a.id, key => checkIn(a.id, key)); setTicket({ a, t }); toast.success("Check-in thành công."); q.reload(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusyId(""); }
  };
  const doNoShow = async (followUp: NoShowFollowUp) => {
    if (!noShow) return;
    setBusyId(noShow.id); setErr("");
    try {
      await command(`progress:${noShow.id}`, { version: noShow.version, ...followUp },
        key => progressAppointment(noShow.id, "NO_SHOW", noShow.version, key, followUp));
      toast.success(followUp.sendRebookingEmail
        ? "Đã ghi nhận vắng mặt và đưa email vào hàng chờ gửi."
        : "Đã ghi nhận vắng mặt.");
      setNoShow(null);
      q.reload();
    }
    catch (e) { setErr(errorMessage(e)); } finally { setBusyId(""); }
  };
  const doDelayNotice = async () => {
    if (!delay || badEstimate) return;
    setBusyId(delay.id);
    setErr("");
    try {
      const input = { version: delay.version, estimatedStartAt };
      await command(`delay:${delay.id}`, input, key => sendDelayNotice(delay.id, input, key));
      toast.success("Đã đưa email báo chậm vào hàng chờ gửi.");
      setDelay(null);
      q.reload();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusyId(""); }
  };

  const checkInState = (a: Appointment): { ok: boolean; why: string } => {
    if (a.mode !== "IN_PERSON") return { ok: false, why: "Chỉ check-in lịch khám trực tiếp" };
    if (a.status !== "CONFIRMED") return { ok: false, why: "Chỉ check-in lịch đã xác nhận" };
    if (!inCheckinWindow(a.startAt, now)) return { ok: false, why: "Ngoài khung giờ check-in (−15’ … +15’)" };
    if (!config.backend.checkin) return { ok: false, why: "Chờ backend" };
    return { ok: true, why: "" };
  };

  return (
    <>
      <PageHead title="Tiếp đón / Check-in" />
      <PendingBackend feature="checkin" />
      {err && !noShow && !delay && <Notice tone="error">{err}</Notice>}
      {ticket && <Notice tone="ok"><span>Đã check-in <b>{apptCode(ticket.a.id)}</b> — số thứ tự <b>#{ticket.t.position}</b> ({dir.doctorName(ticket.a.doctorId)}).</span></Notice>}
      <Panel>
        <div className="filters">
          <SearchBox label="Tìm lịch hẹn" placeholder="Mã lịch, mã bệnh nhân, bác sĩ…" value={text} onChange={setText} />
          <input className="field" type="date" aria-label="Ngày" value={date} onChange={(e) => setDate(e.target.value || todayKey())} />
          <select className="field" aria-label="Bác sĩ" value={doctor} onChange={(e) => setDoctor(e.target.value)}>
            <option value="">Bác sĩ</option>{dir.doctors.map((d) => <option key={d.id} value={d.id}>{dir.doctorName(d.id)}</option>)}
          </select>
          <select className="field" aria-label="Trạng thái" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="">Trạng thái</option>{Object.entries(APPOINTMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="field" aria-label="Hình thức" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="">Hình thức</option><option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option><option value="REMOTE">{MODE_SHORT.REMOTE}</option>
          </select>
          <button className="btn" onClick={q.reload}><RefreshCw size={15} aria-hidden /> Làm mới</button>
        </div>
        <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload} empty={rows.length === 0} emptyTitle="Không có lịch hẹn phù hợp">
          <div className="tablewrap table-scroll"><table>
            <thead><tr><th>Giờ</th><th>Mã lịch</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Hình thức</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{rows.map((a) => {
              const c = checkInState(a);
              const ns = a.status === "CONFIRMED" && a.mode === "IN_PERSON" && canMarkNoShow(a.startAt, now);
              return (
                <tr key={a.id}>
                  <td className="nowrap"><b>{formatTime(a.startAt)}</b></td><td className="mono">{apptCode(a.id)}</td><td className="mono">{patientCode(a.patientId)}</td>
                  <td>{dir.doctorName(a.doctorId)}</td><td>{MODE_SHORT[a.mode]}</td>
                  <td>
                    <StatusPill status={a.status} />
                    {a.status === "NO_SHOW" && <div className="muted">{a.noShowReason ? NO_SHOW_REASON[a.noShowReason] : "Chưa rõ lý do"}</div>}
                  </td>
                  <td><div className="row" style={{ gap: 6 }}>
                    <button className="btn sm primary" disabled={!c.ok || busyId === a.id} onClick={() => void doCheckIn(a)}><CheckCircle2 size={14} aria-hidden /> Check-in</button>
                    {canSendDelayNotice(a, now) && <button className="btn sm" disabled={busyId === a.id}
                      onClick={() => { setDelay(a); setEstimate(""); setErr(""); }}><Mail size={14} aria-hidden /> Báo chậm</button>}
                    {ns && config.backend.progress && <button className="btn sm danger" disabled={busyId === a.id}
                      onClick={() => { setNoShow(a); setErr(""); }}><UserX size={14} aria-hidden /> Vắng mặt</button>}
                    {!c.ok && a.status === "CONFIRMED" && <span className="muted">{c.why}</span>}
                  </div></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </AsyncBlock>
      </Panel>
      {noShow && <NoShowDialog appointment={noShow} busy={busyId === noShow.id} error={err}
        onCancel={() => { setNoShow(null); setErr(""); }} onConfirm={(followUp) => void doNoShow(followUp)} />}
      {delay && <ConfirmDialog
        title="Báo chậm giờ hẹn"
        message={<>Gửi email cho bệnh nhân có lịch <b>{apptCode(delay.id)}</b> lúc <b>{formatTime(delay.startAt)}</b>. Giờ hẹn đã đặt vẫn giữ nguyên.</>}
        confirmLabel="Gửi thông báo"
        busy={busyId === delay.id}
        error={err}
        disabled={badEstimate || !canSendDelayNotice(delay, now)}
        onCancel={() => { setDelay(null); setErr(""); }}
        onConfirm={() => void doDelayNotice()}
      >
        <Field label="Giờ bắt đầu dự kiến (không bắt buộc)"
          hint="Giờ địa phương của phòng khám, trong cùng ngày hẹn."
          error={badEstimate ? "Chọn giờ sau giờ hiện tại và giờ hẹn." : undefined}>
          {(id) => <input className="field" id={id} type="time" value={estimate}
            disabled={busyId === delay.id} onChange={(event) => setEstimate(event.target.value)} />}
        </Field>
      </ConfirmDialog>}
    </>
  );
}
