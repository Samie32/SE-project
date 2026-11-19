import { useState } from "react";
import { updateContact } from "@/api/catalog";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { ROLE_LABEL } from "@/core/labels";
import { useSession } from "@/core/session";
import { Field, Notice, PageHead, Panel, Pill, useToast } from "@/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountPage() {
  const { displayName, roles, identity } = useSession();
  const dir = useDirectory();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const isDoctor = roles.includes("DOCTOR");
  const doctorProfile = identity?.doctorId ? dir.doctors.find(d => d.id === identity.doctorId) : undefined;
  const doctorSpecialties = doctorProfile
    ? doctorProfile.specialtyIds
        .map(id => dir.specialties.find(s => s.id === id)?.name)
        .filter((name): name is string => Boolean(name))
    : [];

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
      <PageHead title="Tài khoản của tôi" />
      <div className="grid2 even">
        <Panel title="Thông tin tài khoản">
          <dl className="detail">
            <div><dt>Tên hiển thị</dt><dd><strong>{doctorProfile?.displayName ?? identity?.displayName ?? displayName}</strong></dd></div>
            <div><dt>Mã tài khoản</dt><dd className="mono">{identity?.id}</dd></div>
            {identity?.patientId && <div><dt>Mã bệnh nhân</dt><dd className="mono">{identity.patientId}</dd></div>}
            <div><dt>Vai trò</dt><dd className="row">{roles.map(r => <Pill key={r} tone="info">{ROLE_LABEL[r]}</Pill>)}</dd></div>
            {isDoctor && (
              <>
                <div><dt>Mã bác sĩ</dt><dd className="mono">{doctorProfile?.id ?? identity?.doctorId ?? "Chưa tạo hồ sơ"}</dd></div>
                <div>
                  <dt>Chuyên khoa</dt>
                  <dd>
                    {dir.loading ? (
                      <span className="muted">Đang tải…</span>
                    ) : doctorSpecialties.length > 0 ? (
                      <div className="chips">
                        {doctorSpecialties.map(name => <Pill key={name} tone="info">{name}</Pill>)}
                      </div>
                    ) : (
                      <span className="muted">Chưa gán chuyên khoa</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Nhận lịch khám</dt>
                  <dd>
                    {dir.loading ? (
                      <span className="muted">Đang tải…</span>
                    ) : doctorProfile ? (
                      <Pill tone={doctorProfile.active ? "ok" : "wait"}>
                        {doctorProfile.active ? "Đang nhận lịch mới" : "Tạm ngưng nhận lịch"}
                      </Pill>
                    ) : (
                      <Pill tone="wait">Chưa kích hoạt hồ sơ</Pill>
                    )}
                  </dd>
                </div>
              </>
            )}
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
