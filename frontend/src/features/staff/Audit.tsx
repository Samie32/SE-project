import { useState } from "react";
import { RotateCcw, Search } from "lucide-react";
import { listAuditEvents } from "@/api/operations";
import { config } from "@/core/config";
import { useAsync } from "@/core/useAsync";
import { addDays, formatDateTimeSec, localToIso } from "@/core/datetime";
import { UUID_RE } from "@/core/labels";
import type { AuditEvent } from "@/core/types";
import { AsyncBlock, Modal, Notice, PageHead, Panel, Pager, PendingBackend, Pill } from "@/ui";

const SIZE = 20;
const RESULT_LABEL: Record<string, string> = { SUCCESS: "Thành công", DENIED: "Bị từ chối", FAILURE: "Thất bại" };
const RESULT_TONE: Record<string, "ok" | "bad" | "wait"> = { SUCCESS: "ok", DENIED: "wait", FAILURE: "bad" };
const actorText = (e: AuditEvent) => (e.actorId ? e.actorId : "SYSTEM");
export function AuditPage() {
  const [form, setForm] = useState({ actorId: "", resourceId: "", from: "", to: "" });
  const [applied, setApplied] = useState(form);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState("");
  const [action, setAction] = useState("");
  const [detail, setDetail] = useState<AuditEvent | null>(null);
  const [errs, setErrs] = useState<{ actorId?: string; range?: string }>({});

  const q = useAsync(async () => {
    if (!config.backend.audit) return [];
    return listAuditEvents({
      limit: SIZE + 1, offset: page * SIZE, actorId: applied.actorId || undefined, resourceId: applied.resourceId || undefined,
      from: applied.from ? localToIso(applied.from, "00:00") : undefined, to: applied.to ? localToIso(addDays(applied.to, 1), "00:00") : undefined,
    });
  }, [applied, page]);
  const rows = (q.data ?? []).slice(0, SIZE);
  const pageRows = rows.filter(
    (e) =>
      (!result || e.result === result) &&
      (!action.trim() || e.action.toLowerCase().includes(action.trim().toLowerCase())),
  );
  const hasNext = (q.data?.length ?? 0) > SIZE;

  const apply = () => {
    const e: typeof errs = {};
    if (form.actorId && !UUID_RE.test(form.actorId.trim())) e.actorId = "Mã tác nhân phải là UUID.";
    if (form.from && form.to && form.from > form.to) e.range = "Ngày bắt đầu phải trước ngày kết thúc.";
    setErrs(e);
    if (Object.keys(e).length) return;
    setPage(0);
    setApplied({ ...form, actorId: form.actorId.trim(), resourceId: form.resourceId.trim() });
  };
  const reset = () => {
    const empty = { actorId: "", resourceId: "", from: "", to: "" };
    setForm(empty);
    setApplied(empty);
    setResult("");
    setAction("");
    setErrs({});
    setPage(0);
  };
  const hasFilter = Boolean(
    form.actorId || form.resourceId || form.from || form.to || result || action || applied.actorId || applied.resourceId || applied.from || applied.to,
  );

  return (
    <>
      <PageHead eyebrow="Kiểm toán" title="Nhật ký kiểm toán" text="Chỉ đọc, không thể sửa hoặc xóa. Không chứa token hay nội dung hồ sơ." />
      <PendingBackend feature="audit" />
      <Panel className="audit-panel" title="Sự kiện (mới nhất trước)">
        <form
          className="audit-filters"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <input
            className="field grow"
            aria-label="Mã tác nhân (UUID)"
            placeholder="Mã tác nhân (UUID)…"
            value={form.actorId}
            onChange={(e) => setForm({ ...form, actorId: e.target.value })}
          />
          <input
            className="field grow"
            aria-label="Mã đối tượng"
            placeholder="Mã đối tượng…"
            value={form.resourceId}
            onChange={(e) => setForm({ ...form, resourceId: e.target.value })}
          />
          <label className="audit-date">
            <span>Từ</span>
            <input className="field" aria-label="Từ ngày" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />
          </label>
          <label className="audit-date">
            <span>Đến</span>
            <input className="field" aria-label="Đến ngày" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />
          </label>
          <select className="field" aria-label="Kết quả (lọc trong trang đang xem)" value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="">Mọi kết quả</option>
            <option value="SUCCESS">Thành công</option>
            <option value="DENIED">Bị từ chối</option>
            <option value="FAILURE">Thất bại</option>
          </select>
          <input className="field grow" aria-label="Hành động (lọc trong trang đang xem)" placeholder="Hành động, VD: CREATED…" value={action} onChange={(e) => setAction(e.target.value)} />
          <button className="btn sm primary" type="submit" disabled={!config.backend.audit}>
            <Search size={14} aria-hidden /> Lọc
          </button>
          {hasFilter && (
            <button className="btn sm" type="button" onClick={reset} title="Xóa bộ lọc">
              <RotateCcw size={14} aria-hidden /> Đặt lại
            </button>
          )}
        </form>
        {(errs.actorId || errs.range) && <Notice tone="error">{errs.actorId || errs.range}</Notice>}
        <AsyncBlock loading={q.loading && config.backend.audit} error={q.error} onRetry={q.reload} empty={config.backend.audit && pageRows.length === 0} emptyTitle="Không có sự kiện phù hợp">
          <div className="tablewrap table-scroll" tabIndex={0} role="region" aria-label="Bảng sự kiện kiểm toán"><table>
            <thead><tr><th>Thời gian</th><th>Hành động</th><th>Tác nhân</th><th>Đối tượng</th><th>Kết quả</th><th>Correlation</th><th><span className="sr-only">Chi tiết</span></th></tr></thead>
            <tbody>{pageRows.map((e) => (
              <tr key={e.id}><td className="nowrap">{formatDateTimeSec(e.createdAt)}</td><td><b>{e.action}</b></td><td className="mono" title={e.actorId ?? undefined}>{actorText(e)}</td><td className="mono">{e.resourceId}</td>
                <td><Pill tone={RESULT_TONE[e.result] ?? "info"}>{RESULT_LABEL[e.result] ?? e.result}</Pill></td><td className="mono" title={e.correlationId}>{e.correlationId.slice(0, 8)}</td><td><button className="btn sm" onClick={() => setDetail(e)} aria-label={`Xem chi tiết sự kiện ${e.action}`}>Chi tiết</button></td></tr>
            ))}</tbody>
          </table></div>
          <Pager page={page} pageCount={hasNext ? page + 2 : page + 1} total={rows.length + page * SIZE + (hasNext ? 1 : 0)} onPage={setPage} />
        </AsyncBlock>
      </Panel>
      {detail && (
        <Modal title="Chi tiết sự kiện kiểm toán" onClose={() => setDetail(null)}>
          <dl className="detail">
            <div><dt>Thời gian</dt><dd>{formatDateTimeSec(detail.createdAt)}</dd></div>
            <div><dt>Hành động</dt><dd><b>{detail.action}</b></dd></div>
            <div><dt>Kết quả</dt><dd><Pill tone={RESULT_TONE[detail.result] ?? "info"}>{RESULT_LABEL[detail.result] ?? detail.result}</Pill></dd></div>
            <div><dt>Tác nhân</dt><dd className="mono wrap-anywhere">{actorText(detail)}</dd></div>
            <div><dt>Đối tượng</dt><dd className="mono wrap-anywhere">{detail.resourceId}</dd></div>
            <div><dt>Correlation ID</dt><dd className="mono wrap-anywhere">{detail.correlationId}</dd></div>
          </dl>
        </Modal>
      )}
    </>
  );
}

