import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { listNotificationJobs } from "@/api/operations";
import { useAsync } from "@/core/useAsync";
import { formatDateTimeSec } from "@/core/datetime";
import { NOTIFICATION_EVENT, NOTIFICATION_STATUS, apptCode } from "@/core/labels";
import type { NotificationJob } from "@/core/types";
import { AsyncBlock, DetailList, Metric, Modal, Notice, PageHead, Panel, Pill } from "@/ui";

export function NotificationsPage() {
  const q = useAsync(listNotificationJobs, []);
  const [status, setStatus] = useState("");
  const [sel, setSel] = useState<NotificationJob | null>(null);
  const all = q.data ?? [];
  const rows = all.filter((n) => !status || n.status === status);
  const c = (s: string) => all.filter((n) => n.status === s).length;
  const tone = (s: string) => NOTIFICATION_STATUS[s]?.tone ?? "";
  return (
    <>
      <PageHead eyebrow="Hệ thống" title="Trung tâm thông báo" text="Hàng đợi gửi email xác nhận / đổi / hủy lịch (100 mục gần nhất). Lỗi gửi không làm mất lịch hẹn." actions={<button className="btn" onClick={q.reload}><RefreshCw size={15} aria-hidden /> Làm mới</button>} />
      <div className="metrics">
        <Metric label="Đang chờ gửi" value={c("PENDING")} tone="amber" /><Metric label="Đã gửi" value={c("SENT") + c("DELIVERED")} tone="green" />
        <Metric label="Thất bại" value={c("FAILED")} tone="red" /><Metric label="Bỏ qua" value={c("SKIPPED")} />
      </div>
      <Notice>Hệ thống tự thử gửi lại khi gặp lỗi tạm thời.</Notice>
      <Panel actions={<select className="field" aria-label="Lọc trạng thái" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Mọi trạng thái</option>{Object.entries(NOTIFICATION_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>} title="Danh sách thông báo">
        <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload} empty={rows.length === 0} emptyTitle="Không có thông báo">
          <div className="tablewrap"><table>
            <thead><tr><th>Sự kiện</th><th>Lịch hẹn</th><th>Trạng thái</th><th>Số lần thử</th><th>Đến hạn</th><th>Lỗi</th><th /></tr></thead>
            <tbody>{rows.map((n) => (
              <tr key={n.id}><td>{NOTIFICATION_EVENT[n.eventType] ?? n.eventType}</td><td className="mono">{apptCode(n.appointmentId)}</td>
                <td><Pill tone={tone(n.status)}>{NOTIFICATION_STATUS[n.status]?.label ?? n.status}</Pill></td><td>{n.attempts}</td><td className="nowrap">{formatDateTimeSec(n.dueAt)}</td><td>{n.lastError ?? "—"}</td>
                <td><button className="btn sm" onClick={() => setSel(n)}>Chi tiết</button></td></tr>
            ))}</tbody>
          </table></div>
        </AsyncBlock>
      </Panel>
      {sel && (
        <Modal title="Chi tiết thông báo" onClose={() => setSel(null)} footer={<button className="btn" onClick={() => setSel(null)}>Đóng</button>}>
          <DetailList rows={[["Mã job", <span className="mono">{sel.id}</span>], ["Sự kiện", NOTIFICATION_EVENT[sel.eventType] ?? sel.eventType], ["Lịch hẹn", <span className="mono">{sel.appointmentId}</span>], ["Trạng thái", NOTIFICATION_STATUS[sel.status]?.label ?? sel.status], ["Số lần thử", sel.attempts], ["Đến hạn", formatDateTimeSec(sel.dueAt)], ["Lỗi gần nhất", sel.lastError ?? "—"]]} />
        </Modal>
      )}
    </>
  );
}
