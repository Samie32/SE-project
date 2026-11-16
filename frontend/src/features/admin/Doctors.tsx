import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { createDoctor, updateDoctor } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { UUID_RE } from "@/core/labels";
import type { Doctor } from "@/core/types";
import { AsyncBlock, Avatar, Field, Modal, Notice, PageHead, Panel, Pill, SearchBox, useToast } from "@/ui";

type Draft = { userId: string; displayName: string; active: boolean; specialtyIds: string[] };

export function DoctorsPage() {
  const dir = useDirectory();
  const toast = useToast();
  const [text, setText] = useState("");
  const [spec, setSpec] = useState("");
  const [editing, setEditing] = useState<Doctor | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>({ userId: "", displayName: "", active: true, specialtyIds: [] });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const rows = dir.doctors.filter((d) => (!spec || d.specialtyIds.includes(spec)) && d.displayName.toLowerCase().includes(text.toLowerCase()));

  const open = (d: Doctor | "new") => {
    setEditing(d); setErrs({}); setErr("");
    setDraft(d === "new" ? { userId: "", displayName: "", active: true, specialtyIds: [] } : { userId: d.userId ?? "", displayName: d.displayName, active: d.active, specialtyIds: [...d.specialtyIds] });
  };
  const toggleSpec = (id: string) => setDraft((p) => ({ ...p, specialtyIds: p.specialtyIds.includes(id) ? p.specialtyIds.filter((x) => x !== id) : [...p.specialtyIds, id] }));

  const save = async () => {
    const e: Record<string, string> = {};
    if (editing === "new" && !UUID_RE.test(draft.userId.trim())) e.userId = "Mã người dùng phải là UUID (tài khoản Keycloak đã đăng nhập ít nhất một lần).";
    if (editing !== "new" && !draft.displayName.trim()) e.displayName = "Vui lòng nhập tên hiển thị.";
    if (draft.specialtyIds.length === 0) e.specialtyIds = "Chọn ít nhất một chuyên khoa.";
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true); setErr("");
    try {
      if (editing === "new") await createDoctor(draft.userId.trim(), draft.specialtyIds);
      else if (editing) await updateDoctor(editing.id, { active: draft.active, displayName: draft.displayName.trim(), specialtyIds: draft.specialtyIds });
      toast.success(editing === "new" ? "Đã tạo hồ sơ bác sĩ." : "Đã cập nhật bác sĩ.");
      setEditing(null); dir.reload();
    } catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };

  return (
    <>
      <PageHead eyebrow="Danh mục" title="Quản lý bác sĩ" text="Hồ sơ bác sĩ gắn với một tài khoản người dùng. Sau khi tạo, cấp vai trò DOCTOR ở mục Phân quyền."
        actions={<button className="btn primary" onClick={() => open("new")}><Plus size={15} aria-hidden /> Thêm bác sĩ</button>} />
      <Panel>
        <div className="filters">
          <SearchBox label="Tìm bác sĩ" placeholder="Tên bác sĩ…" value={text} onChange={setText} />
          <select className="field" aria-label="Chuyên khoa" value={spec} onChange={(e) => setSpec(e.target.value)}><option value="">Mọi chuyên khoa</option>{dir.specialties.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        </div>
        <AsyncBlock loading={dir.loading} error={dir.error} onRetry={dir.reload} empty={rows.length === 0} emptyTitle="Không có bác sĩ phù hợp">
          <div className="tablewrap"><table><thead><tr><th>Bác sĩ</th><th>Chuyên khoa</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>{rows.map((d) => (
              <tr key={d.id}><td><div className="row"><Avatar name={d.displayName} mini /><b>{d.displayName}</b></div></td><td>{dir.doctorSpecialties(d.id)}</td>
                <td><Pill tone={d.active ? "ok" : ""}>{d.active ? "Nhận lịch" : "Tạm ngưng"}</Pill></td>
                <td><button className="btn sm" onClick={() => open(d)}><Pencil size={14} aria-hidden /> Sửa</button></td></tr>
            ))}</tbody></table></div>
        </AsyncBlock>
      </Panel>
      {editing && (
        <Modal title={editing === "new" ? "Thêm bác sĩ" : "Cập nhật bác sĩ"} onClose={() => setEditing(null)}
          footer={<><button className="btn" onClick={() => setEditing(null)}>Hủy</button><button className="btn primary" disabled={busy} onClick={() => void save()}>Lưu</button></>}>
          {err && <Notice tone="error">{err}</Notice>}
          {editing === "new" ? (
            <Field label="Mã người dùng (UUID)" required error={errs.userId} hint="Tên hiển thị lấy từ tài khoản; doctor.id do hệ thống sinh, khác user.id.">{(id) => <input id={id} className="field mono" value={draft.userId} onChange={(e) => setDraft({ ...draft, userId: e.target.value })} />}</Field>
          ) : (
            <>
              <Field label="Tên hiển thị" required error={errs.displayName}>{(id) => <input id={id} className="field" maxLength={120} value={draft.displayName} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />}</Field>
              <label className="check" style={{ marginTop: 12 }}><input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> Đang nhận lịch mới</label>
            </>
          )}
          <fieldset style={{ border: 0, padding: 0, marginTop: 14 }}>
            <legend className="lbl">Chuyên khoa <span className="req">*</span></legend>
            <div className="chips">{dir.specialties.filter((s) => s.active || draft.specialtyIds.includes(s.id)).map((s) => (
              <label key={s.id} className="check"><input type="checkbox" checked={draft.specialtyIds.includes(s.id)} onChange={() => toggleSpec(s.id)} /> {s.name}</label>
            ))}</div>
            {errs.specialtyIds && <div className="field-error" role="alert">{errs.specialtyIds}</div>}
          </fieldset>
        </Modal>
      )}
    </>
  );
}
