import { useEffect, useState } from "react";
import { BellRing, RefreshCw } from "lucide-react";
import { callNext, listQueue } from "@/api/operations";
import { useCommand } from "@/core/useCommand";
import { config } from "@/core/config";
import { errorMessage } from "@/core/client";
import { useAsync } from "@/core/useAsync";
import { formatTime, todayKey } from "@/core/datetime";
import { QUEUE_STATUS, apptCode, patientCode } from "@/core/labels";
import type { QueueTicket } from "@/core/types";
import { Notice, PageHead, Panel, PendingBackend, Pill, useToast } from "@/ui";
import { Link } from "react-router-dom";
import { useDoctor } from "./DoctorContext";

export function DoctorQueuePage() {
  const { doctorId, appointments, reload: reloadAppts } = useDoctor();
  const toast = useToast();
  const command = useCommand();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [called, setCalled] = useState<QueueTicket | null>(null);
  const q = useAsync(() => (config.backend.queue && doctorId ? listQueue({ date: todayKey(), doctorId }) : Promise.resolve([] as QueueTicket[])), [doctorId]);
  useEffect(() => { if (!config.backend.queue) return; const t = setInterval(q.reload, 15_000); return () => clearInterval(t); }, [q.reload]);
  const rows = [...(q.data ?? [])].sort((a, b) => a.position - b.position);
  const waiting = rows.filter((r) => r.status === "WAITING");

  const next = async () => {
    if (!doctorId) return;
    setBusy(true); setErr("");
    try {
      const t = await command(`next:${doctorId}`, {date:todayKey()}, key => callNext(doctorId, todayKey(), key));
      if (t) { setCalled(t); toast.success(`Đã gọi số #${t.position}.`); } else toast.success("Không còn bệnh nhân đang chờ.");
      q.reload(); void reloadAppts();
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };
  const apptOf = (t: QueueTicket) => appointments.find((a) => a.id === t.appointmentId);

  return (
    <>
      <PageHead eyebrow="Bác sĩ" title="Hàng đợi khám" text="Gọi bệnh nhân theo thứ tự check-in (FIFO). Chỉ gọi được khi bạn không có ca đang khám dở."
        actions={<><button className="btn" onClick={q.reload}><RefreshCw size={15} aria-hidden /> Làm mới</button><button className="btn primary" disabled={busy || !doctorId || !config.backend.queue || q.loading || !!q.error || waiting.length === 0 || rows.some(t => t.status === "CALLED" || t.status === "IN_SERVICE")} onClick={() => void next()}><BellRing size={15} aria-hidden /> Gọi bệnh nhân tiếp theo</button></>} />
      <PendingBackend feature="queue" />
      {(err || q.error) && <Notice tone="error">{err || q.error}</Notice>}
      {called && <Notice tone="ok"><span>Đang gọi số <b>#{called.position}</b> ({apptCode(called.appointmentId)}). <Link to={`/doctor/consultation/${called.appointmentId}`}>Mở hồ sơ khám</Link></span></Notice>}
      <Panel title={`Đang chờ (${waiting.length})`} subtitle="Tự làm mới mỗi 15 giây">
        {rows.length === 0 ? <p className="sub">{config.backend.queue ? "Hàng đợi hôm nay đang trống." : "Danh sách hàng đợi sẽ hiện khi backend hỗ trợ."}</p> : (
          <div className="tablewrap"><table><thead><tr><th>Số</th><th>Lịch hẹn</th><th>Bệnh nhân</th><th>Check-in</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{rows.map((t) => { const a = apptOf(t); return (
              <tr key={t.id}><td><b>#{t.position}</b></td><td className="mono">{apptCode(t.appointmentId)}</td><td className="mono">{a ? patientCode(a.patientId) : t.patientId ? patientCode(t.patientId) : "—"}</td>
                <td>{t.createdAt ? formatTime(t.createdAt) : "—"}</td><td><Pill tone={QUEUE_STATUS[t.status].tone}>{QUEUE_STATUS[t.status].label}</Pill></td>
                <td>{(t.status === "CALLED" || t.status === "IN_SERVICE") && <Link className="btn sm primary" to={`/doctor/consultation/${t.appointmentId}`}>Khám</Link>}</td></tr>
            ); })}</tbody></table></div>
        )}
      </Panel>
    </>
  );
}
