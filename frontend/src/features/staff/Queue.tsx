import { useEffect, useState } from "react";
import { RefreshCw, SkipForward } from "lucide-react";
import { listQueue, skipTicket } from "@/api/operations";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { useAsync } from "@/core/useAsync";
import { formatTime, todayKey } from "@/core/datetime";
import { QUEUE_STATUS, apptCode, patientCode } from "@/core/labels";
import type { QueueTicket } from "@/core/types";
import { AsyncBlock, ConfirmDialog, Field, PageHead, Panel, PendingBackend, Pill, useToast } from "@/ui";

export function StaffQueuePage() {
  const dir = useDirectory();
  const toast = useToast();
  const command = useCommand();
  const [doctorId, setDoctorId] = useState("");
  const [skip, setSkip] = useState<QueueTicket | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => { if (!doctorId && dir.doctors[0]) setDoctorId(dir.doctors[0].id); }, [dir.doctors, doctorId]);

  const q = useAsync(() => (config.backend.queue && doctorId ? listQueue({ date: todayKey(), doctorId }) : Promise.resolve([] as QueueTicket[])), [doctorId]);
  useEffect(() => {
    if (!config.backend.queue) return;
    const t = setInterval(q.reload, 15_000);
    return () => clearInterval(t);
  }, [q.reload]);
  const rows = [...(q.data ?? [])].sort((a, b) => a.position - b.position);
  const group = (s: string) => rows.filter((r) => r.status === s);

  const doSkip = async () => {
    if (!skip) return;
    setBusy(true); setErr("");
    try { await command(`skip:${skip.id}`, {reason:reason.trim(),version:skip.version}, key => skipTicket(skip.id, reason.trim(), skip.version, key)); toast.success("Đã đưa phiếu về cuối hàng đợi."); setSkip(null); setReason(""); q.reload(); }
    catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const col = (title: string, items: QueueTicket[]) => (
    <div>
      <h3>{title} ({items.length})</h3>
      {items.length === 0 ? <p className="muted">Không có</p> : items.map((t) => (
        <div className="qcard" key={t.id} style={{ marginBottom: 10 }}>
          <div className="row between"><span className="qnum">#{t.position}</span><Pill tone={QUEUE_STATUS[t.status].tone}>{QUEUE_STATUS[t.status].label}</Pill></div>
          <div className="mono">{t.patientId ? patientCode(t.patientId) : apptCode(t.appointmentId)}</div>
          {t.createdAt && <div className="muted">Check-in {formatTime(t.createdAt)}</div>}
          {t.status === "CALLED" && <button className="btn sm danger" style={{ marginTop: 8 }} onClick={() => { setSkip(t); setErr(""); }}><SkipForward size={14} aria-hidden /> Bỏ qua lượt</button>}
        </div>
      ))}
    </div>
  );

  return (
    <>
      <PageHead eyebrow="Vận hành" title="Hàng đợi khám" text="Theo dõi thứ tự khám trong ngày. Bác sĩ gọi lượt; lễ tân đưa lượt đã gọi mà không đến về cuối hàng." />
      <PendingBackend feature="queue" />
      <Panel>
        <div className="filters">
          <select className="field" aria-label="Bác sĩ" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
            {dir.doctors.map((d) => <option key={d.id} value={d.id}>{dir.doctorName(d.id)}</option>)}
          </select>
          <button className="btn" onClick={q.reload}><RefreshCw size={15} aria-hidden /> Làm mới</button>
          <span className="muted">Tự làm mới mỗi 15 giây.</span>
        </div>
        <AsyncBlock loading={q.loading && config.backend.queue} error={q.error} onRetry={q.reload} empty={config.backend.queue && rows.length === 0} emptyTitle="Chưa có phiếu trong hàng đợi hôm nay">
          <div className="queuecards">{col("Đang chờ", group("WAITING"))}{col("Đã gọi / đang khám", [...group("CALLED"), ...group("IN_SERVICE")])}{col("Đã xong", group("DONE"))}</div>
        </AsyncBlock>
      </Panel>
      {skip && (
        <ConfirmDialog title="Bỏ qua lượt này?" danger confirmLabel="Đưa về cuối hàng" busy={busy} error={err} disabled={!reason.trim()} onCancel={() => setSkip(null)} onConfirm={() => void doSkip()}
          message={<>Phiếu <b>#{skip.position}</b> sẽ quay lại trạng thái chờ ở cuối hàng đợi (giữ nguyên phiếu).</>}>
          <div style={{ marginTop: 12 }}><Field label="Lý do" required>{(id) => <textarea id={id} className="field" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />}</Field></div>
        </ConfirmDialog>
      )}
    </>
  );
}
