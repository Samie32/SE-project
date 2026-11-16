import { useState } from "react";
import { Plus } from "lucide-react";
import { createSpecialty } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { AsyncBlock, Field, Metric, Notice, PageHead, Panel, Pill, useToast } from "@/ui";

export function SpecialtiesPage() {
  const dir = useDirectory();
  const toast = useToast();
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");
  const rows = dir.specialties.filter((s) => s.name.toLowerCase().includes(text.toLowerCase()));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return setErr("Vui lòng nhập tên chuyên khoa.");
    if (n.length > 100) return setErr("Tên tối đa 100 ký tự.");
    if (dir.specialties.some((s) => s.name.toLowerCase() === n.toLowerCase())) return setErr("Chuyên khoa này đã tồn tại.");
    setBusy(true); setErr("");
    try { await createSpecialty(n); toast.success("Đã thêm chuyên khoa."); setName(""); dir.reload(); }
    catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead eyebrow="Danh mục" title="Chuyên khoa" text="Chuyên khoa dùng để bệnh nhân lọc bác sĩ khi đặt lịch. Backend hiện chỉ hỗ trợ thêm mới." />
      <div className="metrics"><Metric label="Tổng chuyên khoa" value={dir.specialties.length} /><Metric label="Đang hoạt động" value={dir.specialties.filter((s) => s.active).length} tone="green" /></div>
      <div className="grid2">
        <Panel title="Danh sách" actions={<input className="field" aria-label="Tìm chuyên khoa" placeholder="Tìm…" value={text} onChange={(e) => setText(e.target.value)} />}>
          <AsyncBlock loading={dir.loading} error={dir.error} onRetry={dir.reload} empty={rows.length === 0} emptyTitle="Chưa có chuyên khoa">
            <div className="tablewrap"><table><thead><tr><th>Tên</th><th>Số bác sĩ</th><th>Trạng thái</th></tr></thead>
              <tbody>{rows.map((s) => <tr key={s.id}><td><b>{s.name}</b></td><td>{dir.doctors.filter((d) => d.specialtyIds.includes(s.id)).length}</td><td><Pill tone={s.active ? "ok" : ""}>{s.active ? "Hoạt động" : "Ngừng"}</Pill></td></tr>)}</tbody></table></div>
          </AsyncBlock>
        </Panel>
        <Panel title="Thêm chuyên khoa">
          <form onSubmit={(e) => void submit(e)} noValidate>
            {err && <Notice tone="error">{err}</Notice>}
            <Field label="Tên chuyên khoa" required>{(id) => <input id={id} className="field" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
            <div style={{ marginTop: 14 }}><button className="btn primary" disabled={busy}><Plus size={15} aria-hidden /> Thêm</button></div>
          </form>
        </Panel>
      </div>
    </>
  );
}
