import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAppointment } from "@/api/appointments";
import { listNotificationJobs } from "@/api/operations";
import { useDirectory } from "@/core/directory";
import { useAsync } from "@/core/useAsync";
import { formatDate, formatDateTimeSec, formatTime } from "@/core/datetime";
import { MODE_LABEL, NOTIFICATION_EVENT, NOTIFICATION_STATUS, apptCode } from "@/core/labels";
import type { NotificationJob } from "@/core/types";
import { AsyncBlock, DetailList, Metric, Modal, PageHead, Panel, Pill, SearchBox, StatusPill } from "@/ui";

export function NotificationsPage() {
  const q = useAsync(listNotificationJobs, []);
  const [query, setQuery] = useState("");
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<NotificationJob | null>(null);

  const all = q.data ?? [];
  const term = query.trim().toLowerCase();
  const rows = all.filter(n => {
    if (status && n.status !== status) return false;
    if (eventType && n.eventType !== eventType) return false;
    if (term) {
      const code = apptCode(n.appointmentId).toLowerCase();
      const errText = (n.lastError ?? "").toLowerCase();
      if (!code.includes(term) && !n.appointmentId.toLowerCase().includes(term) && !errText.includes(term)) {
        return false;
      }
    }
    return true;
  });

  const c = (s: string) => all.filter(n => n.status === s).length;
  const tone = (s: string) => NOTIFICATION_STATUS[s]?.tone ?? "";

  return (
    <>
      <PageHead title="Thông báo" />
      <div className="metrics">
        <Metric label="Đang chờ gửi" value={c("PENDING")} tone="amber" />
        <Metric label="Đã gửi" value={c("SENT") + c("DELIVERED")} tone="green" />
        <Metric label="Thất bại" value={c("FAILED")} tone="red" />
        <Metric label="Bỏ qua" value={c("SKIPPED")} />
      </div>

      <Panel
        title="Danh sách thông báo"
        actions={
          <button type="button" className="btn sm" onClick={q.reload} disabled={q.loading}>
            <RefreshCw size={14} aria-hidden /> Làm mới
          </button>
        }
      >
        <div className="filters">
          <SearchBox label="Tìm thông báo" placeholder="Mã lịch hẹn hoặc lỗi…" value={query} onChange={setQuery} />
          <select
            className="field"
            aria-label="Lọc sự kiện"
            value={eventType}
            onChange={e => setEventType(e.target.value)}
          >
            <option value="">Sự kiện</option>
            {Object.entries(NOTIFICATION_EVENT).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            className="field"
            aria-label="Lọc trạng thái"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Trạng thái</option>
            {Object.entries(NOTIFICATION_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          {(query || eventType || status) && (
            <button
              type="button"
              className="btn sm"
              onClick={() => {
                setQuery("");
                setEventType("");
                setStatus("");
              }}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        <AsyncBlock
          loading={q.loading}
          error={q.error}
          onRetry={q.reload}
          empty={rows.length === 0}
          emptyTitle={all.length === 0 ? "Không có thông báo" : "Không có thông báo phù hợp bộ lọc"}
        >
          <div className="tablewrap table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Sự kiện</th>
                  <th>Lịch hẹn</th>
                  <th>Trạng thái</th>
                  <th>Số lần thử</th>
                  <th>Đến hạn</th>
                  <th>Lỗi</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(n => (
                  <tr key={n.id}>
                    <td className="nowrap">{NOTIFICATION_EVENT[n.eventType] ?? n.eventType}</td>
                    <td className="mono nowrap">{apptCode(n.appointmentId)}</td>
                    <td>
                      <Pill tone={tone(n.status)}>{NOTIFICATION_STATUS[n.status]?.label ?? n.status}</Pill>
                    </td>
                    <td className="nowrap">{n.attempts}</td>
                    <td className="nowrap">{formatDateTimeSec(n.dueAt)}</td>
                    <td>{n.lastError ?? "—"}</td>
                    <td className="nowrap">
                      <button type="button" className="btn sm" onClick={() => setSel(n)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
      </Panel>

      {sel && <NotificationDetailModal job={sel} onClose={() => setSel(null)} />}
    </>
  );
}

function NotificationDetailModal({ job, onClose }: { job: NotificationJob; onClose: () => void }) {
  const dir = useDirectory();
  const appt = useAsync(() => getAppointment(job.appointmentId), [job.appointmentId]);
  const tone = NOTIFICATION_STATUS[job.status]?.tone ?? "";

  const detailRows: [string, React.ReactNode][] = [
    ["Mã job", <span className="mono">{job.id}</span>],
    ["Sự kiện", NOTIFICATION_EVENT[job.eventType] ?? job.eventType],
    [
      "Lịch hẹn",
      <>
        <strong className="mono">{apptCode(job.appointmentId)}</strong>{" "}
        <span className="muted mono">({job.appointmentId})</span>
      </>,
    ],
    ["Trạng thái gửi", <Pill tone={tone}>{NOTIFICATION_STATUS[job.status]?.label ?? job.status}</Pill>],
    ["Số lần thử", job.attempts],
    ["Đến hạn", formatDateTimeSec(job.dueAt)],
    ["Lỗi gần nhất", job.lastError ?? "—"],
  ];

  if (appt.loading) {
    detailRows.push(["Thông tin lịch", <span className="muted">Đang tải…</span>]);
  } else if (appt.data) {
    detailRows.push(
      ["Giờ khám", `${formatTime(appt.data.startAt)} – ${formatTime(appt.data.endAt)} · ${formatDate(appt.data.startAt)}`],
      ["Bác sĩ", dir.doctorName(appt.data.doctorId)],
      ["Hình thức", MODE_LABEL[appt.data.mode]],
      ["Trạng thái lịch", <StatusPill status={appt.data.status} />],
    );
  }

  return (
    <Modal
      title="Chi tiết thông báo"
      onClose={onClose}
      footer={
        <button type="button" className="btn" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <DetailList rows={detailRows} />
    </Modal>
  );
}
