import { useState } from "react";
import { Search } from "lucide-react";
import { listAuditEvents } from "@/api/operations";
import { config } from "@/core/config";
import { useAsync } from "@/core/useAsync";
import { addDays, formatDateTimeSec, localToIso } from "@/core/datetime";
import { UUID_RE } from "@/core/labels";
import { AsyncBlock, Field, PageHead, Panel, Pager, PendingBackend, Pill } from "@/ui";

const SIZE = 20;
export function AuditPage() {
  const [form, setForm] = useState({ actorId: "", resourceId: "", from: "", to: "" });
  const [applied, setApplied] = useState(form);
  const [page, setPage] = useState(0);
  const [errs, setErrs] = useState<{ actorId?: string; range?: string }>({});

  const q = useAsync(async () => {
    if (!config.backend.audit) return [];
    return listAuditEvents({
      limit: SIZE + 1, offset: page * SIZE, actorId: applied.actorId || undefined, resourceId: applied.resourceId || undefined,
      from: applied.from ? localToIso(applied.from, "00:00") : undefined, to: applied.to ? localToIso(addDays(applied.to, 1), "00:00") : undefined,
    });
  }, [applied, page]);
  const rows = (q.data ?? []).slice(0, SIZE);
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
  return (
    <>
      <PageHead eyebrow="Kiểm toán" title="Nhật ký kiểm toán" text="Chỉ đọc, không thể sửa hoặc xóa. Không chứa token hay nội dung hồ sơ." />
      <PendingBackend feature="audit" />
      <Panel title="Bộ lọc">
        <div className="formgrid">
          <Field label="Mã tác nhân (UUID)" error={errs.actorId}>{(id) => <input id={id} className="field" value={form.actorId} onChange={(e) => setForm({ ...form, actorId: e.target.value })} />}</Field>
          <Field label="Mã đối tượng">{(id) => <input id={id} className="field" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: e.target.value })} />}</Field>
          <Field label="Từ ngày" error={errs.range}>{(id) => <input id={id} className="field" type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} />}</Field>
          <Field label="Đến ngày">{(id) => <input id={id} className="field" type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} />}</Field>
        </div>
        <div style={{ marginTop: 14 }}><button className="btn primary" onClick={apply} disabled={!config.backend.audit}><Search size={15} aria-hidden /> Lọc</button></div>
      </Panel>
      <Panel title="Sự kiện (mới nhất trước)">
        <AsyncBlock loading={q.loading && config.backend.audit} error={q.error} onRetry={q.reload} empty={config.backend.audit && rows.length === 0} emptyTitle="Không có sự kiện phù hợp">
          <div className="tablewrap"><table>
            <thead><tr><th>Thời gian</th><th>Hành động</th><th>Tác nhân</th><th>Đối tượng</th><th>Kết quả</th><th>Correlation</th></tr></thead>
            <tbody>{rows.map((e) => (
              <tr key={e.id}><td className="nowrap">{formatDateTimeSec(e.createdAt)}</td><td><b>{e.action}</b></td><td className="mono">{e.actorId ?? "SYSTEM"}</td><td className="mono">{e.resourceId}</td>
                <td><Pill tone={e.result === "SUCCESS" ? "ok" : "bad"}>{e.result}</Pill></td><td className="mono">{e.correlationId.slice(0, 8)}</td></tr>
            ))}</tbody>
          </table></div>
          <Pager page={page} pageCount={hasNext ? page + 2 : page + 1} total={rows.length + page * SIZE + (hasNext ? 1 : 0)} onPage={setPage} />
        </AsyncBlock>
      </Panel>
    </>
  );
}
