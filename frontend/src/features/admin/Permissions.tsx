import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { setUserRoles } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { ALL_ROLES, type Role } from "@/core/types";
import { ROLE_LABEL, UUID_RE } from "@/core/labels";
import { useDirectory } from "@/core/directory";
import { Field, Notice, PageHead, Panel, useToast } from "@/ui";

export function PermissionsPage() {
  const toast = useToast();
  const dir = useDirectory();
  const [userId, setUserId] = useState("");
  const [roles, setRoles] = useState<Role[]>(["PATIENT"]);
  const [err, setErr] = useState("");
  const [idErr, setIdErr] = useState("");
  const [busy, setBusy] = useState(false);
  const toggle = (r: Role) => setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setIdErr("");
    if (!UUID_RE.test(userId.trim())) return setIdErr("Mã người dùng phải là UUID.");
    if (roles.length === 0) return setErr("Chọn ít nhất một vai trò.");
    setBusy(true);
    try { await setUserRoles(userId.trim(), roles); toast.success("Đã cập nhật vai trò. Người dùng cần đăng nhập lại để áp dụng."); dir.reload(); }
    catch (x) { setErr(errorMessage(x)); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead eyebrow="Quản trị" title="Phân quyền người dùng" text="Gán toàn bộ tập vai trò cho một tài khoản. Quyền thực tế do backend kiểm soát." />
      <Panel title="Cập nhật vai trò">
        <form onSubmit={(e) => void submit(e)} noValidate style={{ maxWidth: 560 }}>
          {err && <Notice tone="error">{err}</Notice>}
          <Field label="Mã người dùng (UUID)" required error={idErr}>{(id) => <input id={id} className="field mono" value={userId} onChange={(e) => setUserId(e.target.value)} />}</Field>
          <fieldset style={{ border: 0, padding: 0, margin: "14px 0" }}>
            <legend className="lbl">Vai trò</legend>
            <div className="chips">{ALL_ROLES.map((r) => <label key={r} className="check"><input type="checkbox" checked={roles.includes(r)} onChange={() => toggle(r)} /> {ROLE_LABEL[r]}</label>)}</div>
          </fieldset>
          <Notice><span>Vai trò DOCTOR chỉ gán được khi tài khoản đã có hồ sơ bác sĩ. Không thể tự thay đổi vai trò của chính mình.</span></Notice>
          <button className="btn primary" disabled={busy}><ShieldCheck size={15} aria-hidden /> Lưu phân quyền</button>
        </form>
      </Panel>
    </>
  );
}
