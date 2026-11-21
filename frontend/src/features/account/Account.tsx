import { useEffect, useState } from "react";
import { updateContact } from "@/api/catalog";
import { ACCOUNT_PHONE, normalizePhone } from "@/api/patient-accounts";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { ROLE_LABEL } from "@/core/labels";
import { useSession } from "@/core/session";
import { Field, PageHead, Panel, Pill, useToast } from "@/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AccountPage() {
  const { displayName, roles, identity, retry } = useSession();
  const dir = useDirectory();
  const toast = useToast();
  const [email, setEmail] = useState(identity?.email ?? "");
  const [phone, setPhone] = useState(identity?.phone ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setEmail(identity?.email ?? "");
    setPhone(identity?.phone ?? "");
  }, [identity?.email, identity?.phone]);

  const isDoctor = roles.includes("DOCTOR");
  const doctorProfile = identity?.doctorId ? dir.doctors.find(d => d.id === identity.doctorId) : undefined;
  const doctorSpecialties = doctorProfile
    ? doctorProfile.specialtyIds
        .map(id => dir.specialties.find(s => s.id === id)?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  const save = async () => {
    const v = email.trim();
    const p = phone.trim();
    if (!EMAIL.test(v) || v.length > 254) { setErr("Email không hợp lệ."); return; }
    if (p && (!ACCOUNT_PHONE.test(p) || !normalizePhone(p))) { setErr("Số điện thoại không hợp lệ."); return; }
    setBusy(true); setErr("");
    try {
      await updateContact(v, p || undefined);
      retry();
      toast.success("Đã cập nhật thông tin liên hệ.");
    }
    catch (e) { setErr(errorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <>
      <PageHead title="Tài khoản của tôi" />
      <Panel title="Thông tin tài khoản & liên hệ">
        <dl className="detail">
          <div><dt>Tên hiển thị</dt><dd><strong>{doctorProfile?.displayName ?? identity?.displayName ?? displayName}</strong></dd></div>
          <div>
            <dt>Mã tài khoản</dt>
            <dd>
              <span className="mono">{identity?.id}</span>
              {roles.includes("PATIENT") && (
                <div className="muted">Cung cấp mã tài khoản này khi cần phòng khám hỗ trợ đăng nhập.</div>
              )}
            </dd>
          </div>
          {identity?.patientId && <div><dt>Mã bệnh nhân</dt><dd className="mono">{identity.patientId}</dd></div>}
          <div><dt>Vai trò</dt><dd className="row">{roles.map(r => <Pill key={r} tone="info">{ROLE_LABEL[r]}</Pill>)}</dd></div>
          <div>
            <dt>Email hiện tại</dt>
            <dd>{identity?.email ? <span className="mono">{identity.email}</span> : <span className="muted">Chưa cập nhật</span>}</dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>{identity?.phone ? <span className="mono">{identity.phone}</span> : <span className="muted">Chưa cập nhật</span>}</dd>
          </div>
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

        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid var(--border, #dce4ed)" }} />

        <div className="stack" style={{ maxWidth: 460 }}>
          <div className="muted">Cập nhật email nhận thông báo lịch khám hoặc số điện thoại hỗ trợ (dữ liệu được mã hóa khi lưu trữ trong CSDL).</div>
          <Field label="Email nhận thông báo" error={err}>
            {(id) => <input id={id} className="field" type="email" autoComplete="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ten@example.com" />}
          </Field>
          <Field label="Số điện thoại (tùy chọn)">
            {(id) => <input id={id} className="field" type="tel" autoComplete="tel" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />}
          </Field>
          <div>
            <button className="btn primary" disabled={busy || !email.trim()} onClick={() => void save()}>
              {busy ? "Đang lưu…" : "Lưu thông tin"}
            </button>
          </div>
        </div>
      </Panel>
    </>
  );
}
