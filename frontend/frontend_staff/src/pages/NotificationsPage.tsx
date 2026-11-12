import { useMemo, useState } from "react";
import { listNotificationJobs } from "@/api/notificationApi";
import { useAsync } from "@/hooks/useAsync";
import { AsyncBlock, DetailList, Metric, Modal, PageHead, Pager, Panel, Pill } from "@/components/ui";
import { dayKey, formatDateTime } from "@/utils/datetime";
import { NOTIFICATION_STATUS, shortId } from "@/utils/labels";
import type { NotificationJob } from "@/types";

const PAGE = 15;
const ERROR_TEXT: Record<string, string> = {
  SMTP_UNAVAILABLE: "Máy chủ email không khả dụng (sẽ thử lại)",
  EMAIL_MISSING: "Người nhận chưa có email",
  OBSOLETE_VERSION: "Lịch đã thay đổi, bỏ qua thông báo cũ",
};

export function NotificationsPage() {
  const jobs = useAsync(listNotificationJobs, []);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<NotificationJob | null>(null);

  const data = jobs.data ?? [];
  const types = useMemo(() => [...new Set(data.map((j) => j.eventType))].sort(), [data]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return data.filter((j) => {
      const d = dayKey(j.dueAt);
      return (
        (!t || j.id.toLowerCase().includes(t) || j.appointmentId.toLowerCase().includes(t)) &&
        (!status || j.status === status) &&
        (!type || j.eventType === type) &&
        (!from || d >= from) &&
        (!to || d <= to)
      );
    });
  }, [data, q, status, type, from, to]);

  const pageCount = Math.ceil(filtered.length / PAGE);
  const safePage = Math.min(page, Math.max(pageCount - 1, 0));
  const rows = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);
  const count = (s: string) => data.filter((j) => j.status === s).length;
  const retrying = data.filter((j) => j.status === "PENDING" && j.attempts > 0).length;
  const reset = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(0);
  };

  return (
    <>
      <PageHead
        eyebrow="HỆ THỐNG / TÍCH HỢP"
        title="Trung tâm thông báo"
        actions={
          <button className="btn" onClick={jobs.reload}>
            ↻ Làm mới
          </button>
        }
      />
      <div className="metrics">
        <Metric label="Tác vụ gần nhất" icon="✉" value={jobs.loading ? "…" : data.length} hint="Tối đa 100 tác vụ mới nhất" />
        <Metric label="Đã gửi" icon="✓" value={jobs.loading ? "…" : count("SENT")} hint="SMTP đã chấp nhận" />
        <Metric label="Đang chờ / thử lại" icon="◷" tone="amber" value={jobs.loading ? "…" : count("PENDING") + count("PROCESSING")} hint={`${retrying} đang thử lại`} />
        <Metric label="Thất bại" icon="✕" tone="red" value={jobs.loading ? "…" : count("FAILED")} hint="Cần kiểm tra" />
      </div>
      <Panel>
        <div className="filters">
          <input
            className="field grow"
            placeholder="Mã tác vụ hoặc mã lịch hẹn…"
            value={q}
            onChange={(e) => reset(setQ)(e.target.value)}
            aria-label="Tìm thông báo"
          />
          <select className="field" value={type} onChange={(e) => reset(setType)(e.target.value)} aria-label="Loại thông báo">
            <option value="">Tất cả loại</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <select className="field" value={status} onChange={(e) => reset(setStatus)(e.target.value)} aria-label="Trạng thái">
            <option value="">Tất cả trạng thái</option>
            {Object.keys(NOTIFICATION_STATUS).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input className="field" type="date" value={from} onChange={(e) => reset(setFrom)(e.target.value)} aria-label="Từ ngày" />
          <input className="field" type="date" value={to} onChange={(e) => reset(setTo)(e.target.value)} aria-label="Đến ngày" />
        </div>
        <AsyncBlock
          loading={jobs.loading}
          error={jobs.error}
          onRetry={jobs.reload}
          empty={rows.length === 0}
          emptyText={data.length === 0 ? "Chưa có tác vụ thông báo." : "Không có tác vụ khớp bộ lọc."}
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Mã tác vụ</th>
                  <th>Loại</th>
                  <th>Lịch hẹn</th>
                  <th>Thời gian</th>
                  <th>Số lần gửi</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => (
                  <tr key={j.id}>
                    <td className="audit-code">{shortId(j.id)}</td>
                    <td>{j.eventType}</td>
                    <td className="audit-code">{shortId(j.appointmentId)}</td>
                    <td>{formatDateTime(j.dueAt)}</td>
                    <td>{j.attempts}</td>
                    <td>
                      <Pill tone={NOTIFICATION_STATUS[j.status]?.tone}>{j.status}</Pill>
                    </td>
                    <td>
                      <button className="btn" onClick={() => setDetail(j)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={safePage} pageCount={pageCount} total={filtered.length} onPage={setPage} />
        </AsyncBlock>
        <div className="muted" style={{ marginTop: 10 }}>
          Kênh gửi hiện chỉ là email; backend không trả người nhận. Phân trang thực hiện trên 100 tác vụ mới nhất.
        </div>
      </Panel>
      {detail && (
        <Modal title="Chi tiết thông báo" onClose={() => setDetail(null)} footer={<button className="btn" onClick={() => setDetail(null)}>Đóng</button>}>
          <DetailList
            rows={[
              ["Mã tác vụ", <code key="a">{detail.id}</code>],
              ["Lịch hẹn", <code key="b">{detail.appointmentId}</code>],
              ["Loại thông báo", detail.eventType],
              ["Trạng thái", detail.status],
              ["Số lần thử", String(detail.attempts)],
              ["Thời điểm", formatDateTime(detail.dueAt)],
              ["Lỗi gần nhất", detail.lastError ? (ERROR_TEXT[detail.lastError] ?? detail.lastError) : "Không có"],
            ]}
          />
        </Modal>
      )}
    </>
  );
}
