import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, RefreshCw, Video } from "lucide-react";
import { cancelAppointment, rescheduleAppointment } from "@/api/appointments";
import { listSlots } from "@/api/schedule";
import { ApiError, errorMessage, mutationKey } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { MODE_LABEL, MODE_SHORT, apptCode, APPOINTMENT_STATUS } from "@/core/labels";
import { canRescheduleOrCancel, formatDate, formatTime, inJoinWindow, todayKey } from "@/core/datetime";
import { useAsync, useNow } from "@/core/useAsync";
import type { Appointment, AppointmentMode } from "@/core/types";
import { AsyncBlock, ConfirmDialog, Field, Notice, PageHead, Panel, SearchBox, Tabs, useToast } from "@/ui";
import { AppointmentRow } from "@/features/shared/AppointmentRow";
import { usePatient } from "./PatientContext";

type Tab = "UPCOMING" | "COMPLETED" | "CANCELLED" | "ALL";
type Action = { kind: "cancel" | "reschedule"; item: Appointment };

export function PatientAppointmentsPage() {
  const { appointments, loading, error, reload, truncated } = usePatient();
  const dir = useDirectory();
  const toast = useToast();
  const now = useNow(15_000).getTime();
  const [tab, setTab] = useState<Tab>("UPCOMING");
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"ALL" | AppointmentMode>("ALL");
  const [action, setAction] = useState<Action | null>(null);

  const shown = appointments
    .filter((a) => tab === "ALL" || (tab === "UPCOMING" ? ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status) : tab === "CANCELLED" ? ["CANCELLED", "NO_SHOW"].includes(a.status) : a.status === tab))
    .filter((a) => mode === "ALL" || a.mode === mode)
    .filter((a) => [apptCode(a.id), dir.doctorName(a.doctorId), dir.doctorSpecialties(a.doctorId), APPOINTMENT_STATUS[a.status].label].join(" ").toLocaleLowerCase("vi").includes(search.toLocaleLowerCase("vi")))
    .sort((a, b) => (tab === "UPCOMING" ? a.startAt.localeCompare(b.startAt) : b.startAt.localeCompare(a.startAt)));

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Link to="/patient" className="btn sm" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowLeft size={16} aria-hidden /> Quay lại Tổng quan
        </Link>
      </div>
      <PageHead eyebrow="Quản lý lịch hẹn" title="Lịch khám của tôi" text="Theo dõi, đổi hoặc hủy lịch khám đã đặt."
        actions={<Link className="btn primary" to="/patient/booking"><Plus size={16} aria-hidden /> Đặt lịch mới</Link>} />
      {truncated && <Notice tone="warn">Chỉ hiển thị một phần lịch (giới hạn tải). Hãy dùng bộ lọc để tìm lịch cần xem.</Notice>}
      <Panel>
        <Tabs<Tab> label="Nhóm lịch" value={tab} onChange={setTab} items={[
          { id: "UPCOMING", label: "Đang theo dõi" }, { id: "COMPLETED", label: "Đã hoàn tất" }, { id: "CANCELLED", label: "Đã hủy / vắng" }, { id: "ALL", label: "Tất cả" },
        ]} />
        <div className="filters">
          <SearchBox label="Tìm lịch khám" placeholder="Tìm theo mã lịch, bác sĩ, chuyên khoa…" value={search} onChange={setSearch} />
          <select className="field" aria-label="Lọc hình thức khám" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
            <option value="ALL">Tất cả hình thức</option>
            <option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option>
            <option value="REMOTE">{MODE_SHORT.REMOTE}</option>
          </select>
          <button className="btn" onClick={() => void reload()}><RefreshCw size={15} aria-hidden /> Làm mới</button>
        </div>
        <AsyncBlock loading={loading} error={error} onRetry={() => void reload()} empty={shown.length === 0} emptyTitle="Không có lịch khám phù hợp" emptyText="Hãy thử đổi bộ lọc hoặc đặt lịch mới.">
          {shown.map((a) => {
            const eligible = a.status === "CONFIRMED" && canRescheduleOrCancel(a.startAt, now);
            return (
              <AppointmentRow key={a.id} item={a} actions={
                <>
                  {a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && (
                    <Link className="btn sm soft" to={`/patient/telehealth?appointmentId=${a.id}`}>
                      <Video size={14} aria-hidden /> {inJoinWindow(a.startAt, now) ? "Vào phòng chờ" : "Chi tiết từ xa"}
                    </Link>
                  )}
                  {eligible ? (
                    <>
                      <button className="btn sm" onClick={() => setAction({ kind: "reschedule", item: a })}>Đổi lịch</button>
                      <button className="btn sm danger" onClick={() => setAction({ kind: "cancel", item: a })}>Hủy</button>
                    </>
                  ) : a.status === "CONFIRMED" ? (
                    <span className="locked">Đã khóa đổi/hủy (còn dưới 2 giờ)</span>
                  ) : a.status === "COMPLETED" ? (
                    <Link className="btn sm" to="/patient/records">Xem hồ sơ</Link>
                  ) : a.status === "CANCELLED" ? (
                    <span className="locked">Lý do: {a.cancellationReason || "—"}</span>
                  ) : null}
                </>
              } />
            );
          })}
        </AsyncBlock>
      </Panel>
      {action && (
        <ActionDialog key={action.item.id + action.kind} action={action} onClose={() => setAction(null)}
          onDone={() => { toast.success(action.kind === "cancel" ? "Đã hủy lịch khám." : "Đổi lịch khám thành công."); setAction(null); void reload(); }}
          onStale={() => void reload()} />
      )}
      <p className="muted" style={{ marginTop: 8 }}>Quy tắc: chỉ đổi/hủy lịch ở trạng thái “Đã xác nhận” khi còn ≥ 2 giờ trước giờ khám .</p>
    </>
  );
}

function ActionDialog({ action, onClose, onDone, onStale }: { action: Action; onClose: () => void; onDone: () => void; onStale: () => void }) {
  const { item, kind } = action;
  const dir = useDirectory();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(todayKey());
  const [slotId, setSlotId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stale, setStale] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const key = useRef<{ fingerprint: string; key: string } | null>(null);
  const slots = useAsync(() => (kind === "reschedule" ? listSlots({ date, doctorId: item.doctorId, mode: item.mode }).then((r) => r.filter((s) => s.id !== item.slotId)) : Promise.resolve([])), [date, kind]);
  useEffect(() => setSlotId(""), [date]);

  const submit = async () => {
    if (!canRescheduleOrCancel(item.startAt)) { setError("Lịch không còn đủ điều kiện đổi/hủy (cần còn ít nhất 2 giờ)."); setStale(true); return; }
    setBusy(true); setError("");
    try {
      const k = mutationKey(key, JSON.stringify({ id: item.id, kind, reason, slotId }));
      if (kind === "cancel") await cancelAppointment(item.id, reason.trim(), item.version, k);
      else await rescheduleAppointment(item.id, slotId, item.version, k);
      onDone();
    } catch (e) {
      setError(errorMessage(e));
      if (e instanceof ApiError && e.status === 409) { key.current = null; setUncertain(false); setStale(true); if (kind === "reschedule") slots.reload(); }
      else setUncertain(e instanceof ApiError && e.uncertain);
    } finally { setBusy(false); }
  };

  return (
    <ConfirmDialog title={kind === "cancel" ? "Hủy lịch khám?" : "Đổi lịch khám"} danger={kind === "cancel"} busy={busy} error={error}
      confirmLabel={kind === "cancel" ? "Xác nhận hủy" : "Xác nhận đổi"} onCancel={onClose} onConfirm={() => void submit()}
      disabled={stale || (kind === "cancel" ? !reason.trim() : !slotId || slots.loading)}
      message={<>Lịch <b className="mono">{apptCode(item.id)}</b> · {dir.doctorName(item.doctorId)} · {formatTime(item.startAt)} ngày {formatDate(item.startAt)} ({MODE_LABEL[item.mode]})</>}>
      <fieldset disabled={busy || stale} style={{ border: 0, padding: 0, margin: "12px 0 0" }}>
        {kind === "cancel" ? (
          <Field label="Lý do hủy" required>{(id) => <textarea id={id} className="field" maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do hủy lịch…" />}</Field>
        ) : (
          <>
            <Field label="Ngày khám mới">{(id) => <input id={id} className="field" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />}</Field>
            <div style={{ marginTop: 12 }}>
              <AsyncBlock loading={slots.loading} error={slots.error} onRetry={slots.reload} empty={(slots.data?.length ?? 0) === 0} emptyTitle="Không có khung giờ trống" emptyText="Hãy chọn ngày khác.">
                <div className="slots" role="group" aria-label="Khung giờ mới">
                  {slots.data?.map((s) => <button key={s.id} type="button" className={"slot" + (s.id === slotId ? " on" : "")} aria-pressed={s.id === slotId} onClick={() => setSlotId(s.id)}>{formatTime(s.startAt)}</button>)}
                </div>
              </AsyncBlock>
            </div>
          </>
        )}
      </fieldset>
      {uncertain && <div style={{ marginTop: 10 }}><Notice tone="warn">Chưa xác định kết quả. Xác nhận lại để gửi cùng yêu cầu một cách an toàn (không bị thực hiện hai lần).</Notice></div>}
      {stale && <button className="btn" style={{ marginTop: 10 }} onClick={() => { onClose(); onStale(); }}>Đóng và tải lại lịch</button>}
    </ConfirmDialog>
  );
}
