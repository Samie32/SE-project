import { useMemo, useState, type ChangeEvent } from "react";
import { listAuditEvents } from "@/api/auditApi";
import { config } from "@/config";
import { useAsync } from "@/hooks/useAsync";
import { AsyncBlock, DetailList, Modal, PageHead, Panel, PendingBackend, Pill } from "@/components/ui";
import { endOfDayIso, formatDateTime, startOfDayIso } from "@/utils/datetime";
import { shortId } from "@/utils/labels";
import type { AuditEvent } from "@/types";

const LIMIT = 20;
interface Filters {
  actorId: string;
  resourceId: string;
  from: string;
  to: string;
}
const EMPTY: Filters = { actorId: "", resourceId: "", from: "", to: "" };

/** Read-only: this page has no create/update/delete action by design. */
export function AuditPage() {
  const enabled = config.backend.audit;
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [action, setAction] = useState("");
  const [result, setResult] = useState("");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<AuditEvent | null>(null);

  const events = useAsync(
    () =>
      enabled
        ? listAuditEvents({
            limit: LIMIT,
            offset: page * LIMIT,
            actorId: applied.actorId.trim() || undefined,
            resourceId: applied.resourceId.trim() || undefined,
            from: applied.from ? startOfDayIso(applied.from) : undefined,
            to: applied.to ? endOfDayIso(applied.to) : undefined,
          })
        : Promise.resolve<AuditEvent[]>([]),
    [enabled, applied, page],
  );

  const data = events.data ?? [];
  const actions = useMemo(() => [...new Set(data.map((e) => e.action))].sort(), [data]);
  const results = useMemo(() => [...new Set(data.map((e) => e.result))].sort(), [data]);
  const rows = data.filter((e) => (!action || e.action === action) && (!result || e.result === result));
  const showIp = data.some((e) => e.ipAddress);

  const apply = () => {
    setPage(0);
    setApplied(draft);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setAction("");
    setResult("");
    setPage(0);
  };
  const set = (k: keyof Filters) => (e: ChangeEvent<HTMLInputElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <>
      <PageHead eyebrow="BẢO MẬT / KIỂM SOÁT" title="Nhật ký kiểm toán" />
      <PendingBackend
        feature="audit"
        title="Nhật ký kiểm toán chưa kết nối backend"
        endpoints={[
          "GET /api/audit-events?limit&offset&actorId&resourceId&from&to → Audit[] {id, actorId, action, resourceId, timestamp, result, correlationId} (chỉ AUDITOR)",
          "Đề xuất thêm: bộ lọc action/result phía server và trường ipAddress (hiện bảng audit_event chưa lưu IP)",
        ]}
      />
      <Panel
        title="Bộ lọc sự kiện"
        subtitle="Chỉ tra cứu, không thể sửa hoặc xóa nhật ký."
        actions={<Pill tone="ok">Chế độ chỉ đọc</Pill>}
      >
        <div className="filters">
          <input className="field" placeholder="Mã người thực hiện (actorId)" value={draft.actorId} onChange={set("actorId")} disabled={!enabled} aria-label="Người thực hiện" />
          <input className="field" placeholder="Mã đối tượng (resourceId)" value={draft.resourceId} onChange={set("resourceId")} disabled={!enabled} aria-label="Đối tượng" />
          <input className="field" type="date" value={draft.from} onChange={set("from")} disabled={!enabled} aria-label="Từ ngày" />
          <input className="field" type="date" value={draft.to} onChange={set("to")} disabled={!enabled} aria-label="Đến ngày" />
          <select className="field" value={action} onChange={(e) => setAction(e.target.value)} disabled={!enabled} aria-label="Loại hành động">
            <option value="">Tất cả hành động</option>
            {actions.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <select className="field" value={result} onChange={(e) => setResult(e.target.value)} disabled={!enabled} aria-label="Kết quả">
            <option value="">Mọi kết quả</option>
            {results.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <button className="btn primary" onClick={apply} disabled={!enabled}>
            Lọc kết quả
          </button>
          <button className="btn" onClick={clear} disabled={!enabled}>
            Xóa lọc
          </button>
        </div>
        <AsyncBlock
          loading={enabled && events.loading}
          error={enabled ? events.error : ""}
          onRetry={events.reload}
          empty={rows.length === 0}
          emptyText={enabled ? "Không có sự kiện khớp bộ lọc." : "Chưa có dữ liệu — đang chờ API nhật ký từ backend."}
        >
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Hành động</th>
                  <th>Người thực hiện</th>
                  <th>Đối tượng</th>
                  <th>Kết quả</th>
                  {showIp && <th>IP</th>}
                  <th>Request ID</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.timestamp)}</td>
                    <td className="audit-code">{e.action}</td>
                    <td className="audit-code">{e.actorId ? shortId(e.actorId) : "SYSTEM"}</td>
                    <td className="audit-code">{shortId(e.resourceId)}</td>
                    <td>
                      <Pill tone={e.result === "SUCCESS" ? "ok" : "bad"}>{e.result}</Pill>
                    </td>
                    {showIp && <td className="audit-code">{e.ipAddress ?? "—"}</td>}
                    <td className="audit-code">{shortId(e.correlationId)}</td>
                    <td>
                      <button className="btn" onClick={() => setDetail(e)}>
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
        <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
          <span className="muted">
            Trang {page + 1} · {data.length} sự kiện tải về (lọc hành động/kết quả áp dụng trên trang này)
          </span>
          <div className="row">
            <button className="btn" disabled={!enabled || page === 0} onClick={() => setPage(page - 1)}>
              ← Trước
            </button>
            <button className="btn" disabled={!enabled || data.length < LIMIT} onClick={() => setPage(page + 1)}>
              Sau →
            </button>
          </div>
        </div>
      </Panel>
      {detail && (
        <Modal wide title="Chi tiết sự kiện" onClose={() => setDetail(null)} footer={<button className="btn" onClick={() => setDetail(null)}>Đóng</button>}>
          <DetailList
            rows={[
              ["Mã sự kiện", <code key="a">{detail.id}</code>],
              ["Thời gian", formatDateTime(detail.timestamp)],
              ["Hành động", detail.action],
              ["Người thực hiện", detail.actorId ? <code key="b">{detail.actorId}</code> : "SYSTEM"],
              ["Đối tượng", <code key="c">{detail.resourceId}</code>],
              ["Kết quả", detail.result],
              ["Request ID", <code key="d">{detail.correlationId}</code>],
              ["Địa chỉ IP", detail.ipAddress ?? "Backend chưa cung cấp"],
            ]}
          />
        </Modal>
      )}
    </>
  );
}
