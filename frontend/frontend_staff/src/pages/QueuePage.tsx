import { useEffect, useMemo, useState } from "react";
import { callNext, listQueue, skipTicket } from "@/api/queueApi";
import { listDoctors } from "@/api/doctorApi";
import { errorMessage } from "@/api/client";
import { config } from "@/config";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/components/Toast";
import { AsyncBlock, Field, Modal, PageHead, Panel, PendingBackend, Pill } from "@/components/ui";
import { formatDateTime, minutesSince, todayKey } from "@/utils/datetime";
import { shortId } from "@/utils/labels";
import type { QueueStatus, QueueTicket } from "@/types";
import type { Tone } from "@/utils/labels";

const STATUS_TONE: Record<QueueStatus, Tone> = {
  WAITING: "wait",
  CALLED: "bluepill",
  IN_SERVICE: "purple",
  DONE: "ok",
};
const POLL_MS = 15000;
const code = (n: number) => `Q-${String(n).padStart(3, "0")}`;

export function QueuePage() {
  const toast = useToast();
  const enabled = config.backend.queue;
  const [doctorId, setDoctorId] = useState("");
  const [status, setStatus] = useState("");
  const [skip, setSkip] = useState<QueueTicket | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [skipError, setSkipError] = useState("");
  const [busy, setBusy] = useState(false);

  const doctors = useAsync(listDoctors, []);
  const queue = useAsync(
    () =>
      enabled
        ? listQueue({ date: todayKey(), doctorId: doctorId || undefined })
        : Promise.resolve<QueueTicket[]>([]),
    [enabled, doctorId],
  );

  // Refresh periodically so two staff members see each other's actions.
  const { reload } = queue;
  useEffect(() => {
    if (!enabled) return;
    const t = window.setInterval(reload, POLL_MS);
    return () => window.clearInterval(t);
  }, [enabled, reload]);

  const all = queue.data ?? [];
  const docName = (id?: string) =>
    (id && doctors.data?.find((d) => d.id === id)?.displayName) || (id ? shortId(id) : "—");
  const rows = useMemo(
    () =>
      all
        .filter((t) => !status || t.status === status)
        .sort((a, b) => a.position - b.position),
    [all, status],
  );
  const count = (s: QueueStatus) => all.filter((t) => t.status === s);
  const next = count("WAITING").sort((a, b) => a.position - b.position)[0];
  const val = (n: number) => (!enabled ? "—" : queue.loading ? "…" : n);

  const handleConflict = (e: unknown) => {
    if ((e as { status?: number }).status === 409) {
      toast.error("Hàng đợi vừa được người khác thay đổi. Đã tải lại danh sách.");
      reload();
      return true;
    }
    return false;
  };

  const onCallNext = async () => {
    if (!doctorId) return toast.error("Chọn bác sĩ trước khi gọi lượt tiếp theo.");
    setBusy(true);
    try {
      const t = await callNext(doctorId);
      if (t) toast.success(`Đã gọi ${code(t.position)}.`);
      else toast.success("Không còn bệnh nhân đang chờ.");
      reload();
    } catch (e) {
      if (!handleConflict(e)) toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const onSkip = async () => {
    if (!skip) return;
    const r = reason.trim();
    if (!r) return setReasonError("Cần nhập lý do bỏ qua.");
    setReasonError("");
    setSkipError("");
    setBusy(true);
    try {
      await skipTicket(skip.id, r);
      toast.success(`Đã trả ${code(skip.position)} về cuối hàng đợi.`);
      setSkip(null);
      reload();
    } catch (e) {
      if (handleConflict(e)) setSkip(null);
      else setSkipError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="ĐIỀU PHỐI KHÁM"
        title="Hàng đợi khám"
        actions={
          <button className="btn" onClick={reload} disabled={!enabled}>
            ↻ Làm mới
          </button>
        }
      />
      <PendingBackend
        feature="queue"
        title="Hàng đợi chưa kết nối backend"
        endpoints={[
          "GET /api/queue-tickets?date=&doctorId=&status= → QueueTicket[] (ĐỀ XUẤT — thiết kế OpenAPI chưa có API liệt kê hàng đợi; cần thêm doctorId, patientId, checkedInAt)",
          "POST /api/doctors/{doctorId}/queue/next (Idempotency-Key) → QueueTicket | 204 (hợp đồng hiện giao cho BÁC SĨ; nếu lễ tân được gọi lượt cần mở quyền)",
          "POST /api/queue-tickets/{ticketId}/skip { reason } → QueueTicket (lễ tân)",
        ]}
      />

      <div className="queuecards">
        <div className="qcard">
          <div className="muted">ĐANG CHỜ · WAITING</div>
          <div className="qnum">{val(count("WAITING").length)}</div>
          <div className="qline">
            <span className="muted">Phiếu tiếp theo</span>
            <b>{next ? code(next.position) : "—"}</b>
          </div>
          <button className="btn primary" style={{ width: "100%" }} disabled={!enabled || busy} onClick={() => void onCallNext()}>
            Gọi lượt tiếp theo →
          </button>
        </div>
        <div className="qcard">
          <div className="muted">ĐÃ GỌI · CALLED</div>
          <div className="qnum">{val(count("CALLED").length)}</div>
          <div className="qline">
            <span className="muted">Đang gọi</span>
            <b>{count("CALLED")[0] ? code(count("CALLED")[0].position) : "—"}</b>
          </div>
        </div>
        <div className="qcard">
          <div className="muted">ĐANG KHÁM · IN_SERVICE</div>
          <div className="qnum">{val(count("IN_SERVICE").length)}</div>
          <div className="qline">
            <span className="muted">Hoàn tất hôm nay</span>
            <b>{val(count("DONE").length)}</b>
          </div>
        </div>
      </div>

      <Panel
        title="Danh sách hàng đợi"
        actions={
          <div className="row">
            <select className="field" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} aria-label="Bác sĩ">
              <option value="">Tất cả bác sĩ</option>
              {(doctors.data ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.displayName}
                </option>
              ))}
            </select>
            <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Trạng thái">
              <option value="">Tất cả trạng thái</option>
              {(["WAITING", "CALLED", "IN_SERVICE", "DONE"] as QueueStatus[]).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      >
        <AsyncBlock
          loading={enabled && queue.loading && !queue.data}
          error={enabled ? queue.error : ""}
          onRetry={queue.reload}
          empty={rows.length === 0}
          emptyText={enabled ? "Hàng đợi hiện không có bệnh nhân." : "Chưa có dữ liệu — đang chờ API hàng đợi từ backend."}
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Số thứ tự</th>
                  <th>Bệnh nhân</th>
                  <th>Bác sĩ</th>
                  <th>Thời gian chờ</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <b>{code(t.position)}</b>
                    </td>
                    <td>{t.patientId ? `BN ${shortId(t.patientId)}` : `Lịch ${shortId(t.appointmentId)}`}</td>
                    <td>{docName(t.doctorId)}</td>
                    <td title={t.checkedInAt ? formatDateTime(t.checkedInAt) : undefined}>
                      {t.checkedInAt && t.status === "WAITING" ? `${minutesSince(t.checkedInAt)} phút` : "—"}
                    </td>
                    <td>
                      <Pill tone={STATUS_TONE[t.status]}>{t.status}</Pill>
                    </td>
                    <td>
                      {t.status === "CALLED" ? (
                        <button
                          className="btn"
                          onClick={() => {
                            setReason("");
                            setReasonError("");
                            setSkipError("");
                            setSkip(t);
                          }}
                        >
                          Bỏ qua lượt
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
      </Panel>

      {skip && (
        <Modal
          title={`Bỏ qua lượt ${code(skip.position)}?`}
          description="Phiếu được trả về WAITING và xếp cuối hàng đợi của bác sĩ trong ngày."
          onClose={busy ? () => undefined : () => setSkip(null)}
          footer={
            <>
              <button className="btn" onClick={() => setSkip(null)} disabled={busy}>
                Quay lại
              </button>
              <button className="btn danger" onClick={() => void onSkip()} disabled={busy}>
                {busy ? "Đang xử lý…" : "Bỏ qua lượt"}
              </button>
            </>
          }
        >
          <Field label="Lý do *" error={reasonError}>
            <input className="field" value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </Field>
          {skipError && (
            <div className="notice errbox" role="alert">
              {skipError}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
