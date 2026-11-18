import { useState } from "react";
import { updateContact } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { ROLE_LABEL } from "@/core/labels";
import { useSession } from "@/core/session";
import { Field, Notice, PageHead, Panel, Pill, useToast } from "@/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountPage() {
  const { displayName, roles, identity } = useSession();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = email.trim();
    if (!EMAIL.test(v) || v.length > 254) { setErr("Email không hợp lệ."); return; }
    setBusy(true); setErr("");
    try { await updateContact(v); setEmail(""); toast.success("Đã cập nhật email nhận thông báo."); }
    catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead eyebrow="Tài khoản" title="Tài khoản của tôi" text="Thông tin đăng nhập do Keycloak quản lý; vai trò do quản trị viên cấp." />
      <div className="grid2 even">
        <Panel title="Thông tin tài khoản">
          <dl className="detail">
            <div><dt>Tên hiển thị</dt><dd>{displayName}</dd></div>
            <div><dt>Mã tài khoản</dt><dd className="mono">{identity?.id}</dd></div>
            <div><dt>Vai trò</dt><dd className="row">{roles.map((r) => <Pill key={r} tone="info">{ROLE_LABEL[r]}</Pill>)}</dd></div>
          </dl>
        </Panel>
        <Panel title="Email nhận thông báo" subtitle="Dùng để gửi xác nhận / nhắc lịch khám">
          <Notice><span>Email được mã hóa khi lưu và không hiển thị lại. Nhập địa chỉ mới để thay thế.</span></Notice>
          <Field label="Email mới" error={err}>{(id) => <input id={id} className="field" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@example.com" />}</Field>
          <div style={{ marginTop: 14 }}><button className="btn primary" disabled={busy || !email.trim()} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu email"}</button></div>
        </Panel>
      </div>
    </>
  );
}
