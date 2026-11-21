import { useEffect, useState } from "react";
import { Check, Copy, KeyRound, MailCheck, Pencil, ShieldCheck, X } from "lucide-react";
import { requestContactOtp, updateContact } from "@/api/catalog";
import { ACCOUNT_PHONE, normalizePhone } from "@/api/patient-accounts";
import { errorMessage } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { ROLE_LABEL } from "@/core/labels";
import { useSession } from "@/core/session";
import { Field, Notice, PageHead, Panel, Pill, useToast } from "@/ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_CODE = /^[0-9]{6}$/;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AccountPage() {
  const { displayName, roles, identity, retry, changePassword } = useSession();
  const dir = useDirectory();
  const toast = useToast();

  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState(identity?.email ?? "");
  const [phone, setPhone] = useState(identity?.phone ?? "");
  const [otp, setOtp] = useState("");
  const [otpSentFor, setOtpSentFor] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentEmail = (identity?.email ?? "").trim().toLowerCase();
  const currentPhone = identity?.phone ?? "";
  const fullName = identity?.displayName ?? displayName;

  useEffect(() => {
    if (!editing) {
      setEmail(identity?.email ?? "");
      setPhone(identity?.phone ?? "");
    }
  }, [editing, identity?.email, identity?.phone]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const isDoctor = roles.includes("DOCTOR");
  const doctorProfile = identity?.doctorId
    ? dir.doctors.find((d) => d.id === identity.doctorId)
    : undefined;
  const doctorSpecialties = doctorProfile
    ? doctorProfile.specialtyIds
        .map((id) => dir.specialties.find((s) => s.id === id)?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  const normalizedDraftEmail = email.trim().toLowerCase();
  const emailChanged = normalizedDraftEmail !== currentEmail;
  const otpReadyForCurrentDraft =
    !emailChanged || (otpSentFor === normalizedDraftEmail && OTP_CODE.test(otp.trim()));

  const openEdit = () => {
    setEmail(identity?.email ?? "");
    setPhone(identity?.phone ?? "");
    setOtp("");
    setOtpSentFor("");
    setErr("");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setOtp("");
    setOtpSentFor("");
    setErr("");
  };

  const copyId = async () => {
    if (!identity?.id) return;
    try {
      await navigator.clipboard.writeText(identity.id);
      setCopied(true);
      toast.success("Đã sao chép mã tài khoản.");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép tự động.");
    }
  };

  const sendOtp = async () => {
    const v = email.trim();
    if (!EMAIL.test(v) || v.length > 254) {
      setErr("Email mới không hợp lệ.");
      return;
    }
    setSendingOtp(true);
    setErr("");
    try {
      await requestContactOtp(v);
      setOtpSentFor(v.toLowerCase());
      setOtp("");
      setCooldown(30);
      toast.success("Đã gửi mã OTP 6 chữ số tới email mới.");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setSendingOtp(false);
    }
  };

  const save = async () => {
    const v = email.trim();
    const p = phone.trim();
    if (!EMAIL.test(v) || v.length > 254) {
      setErr("Email không hợp lệ.");
      return;
    }
    if (p && (!ACCOUNT_PHONE.test(p) || !normalizePhone(p))) {
      setErr("Số điện thoại không hợp lệ (7–15 chữ số).");
      return;
    }
    if (emailChanged && !OTP_CODE.test(otp.trim())) {
      setErr("Vui lòng nhập mã OTP 6 chữ số đã gửi tới email mới.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await updateContact(v, p || undefined, emailChanged ? otp.trim() : undefined);
      setEditing(false);
      setOtp("");
      setOtpSentFor("");
      retry();
      toast.success("Đã cập nhật thông tin liên hệ.");
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead title="Tài khoản của tôi" />
      <Panel>
        <div
          className="row wrap"
          style={{
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            paddingBottom: 18,
            borderBottom: "1px solid var(--border, #dce4ed)",
            marginBottom: 18,
          }}
        >
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            <div
              aria-hidden
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              {initials(doctorProfile?.displayName ?? fullName)}
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.25 }}>
                {doctorProfile?.displayName ?? fullName}
              </div>
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                {roles.map((r) => (
                  <Pill key={r} tone="info">
                    {ROLE_LABEL[r]}
                  </Pill>
                ))}
              </div>
            </div>
          </div>

          <div className="row wrap" style={{ gap: 8 }}>
            {!editing && (
              <button type="button" className="btn primary sm" onClick={openEdit}>
                <Pencil size={14} aria-hidden /> Chỉnh sửa thông tin
              </button>
            )}
            {changePassword && (
              <button type="button" className="btn sm" onClick={changePassword}>
                <KeyRound size={14} aria-hidden /> Đổi mật khẩu
              </button>
            )}
          </div>
        </div>

        <dl className="detail">
          {identity?.username && (
            <div>
              <dt>Tên đăng nhập</dt>
              <dd className="mono">{identity.username}</dd>
            </div>
          )}
          <div>
            <dt>Mã tài khoản</dt>
            <dd>
              <div className="row wrap" style={{ alignItems: "center", gap: 8 }}>
                <span className="mono">{identity?.id}</span>
                {identity?.id && (
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => void copyId()}
                    title="Sao chép mã tài khoản"
                  >
                    {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                    {copied ? "Đã chép" : "Sao chép"}
                  </button>
                )}
              </div>
              {roles.includes("PATIENT") && (
                <div className="muted" style={{ marginTop: 4 }}>
                  Cung cấp mã tài khoản này khi cần phòng khám hỗ trợ đăng nhập.
                </div>
              )}
            </dd>
          </div>
          {identity?.patientId && (
            <div>
              <dt>Mã bệnh nhân</dt>
              <dd className="mono">{identity.patientId}</dd>
            </div>
          )}
          <div>
            <dt>Email nhận thông báo</dt>
            <dd>
              {identity?.email ? (
                <span className="mono">{identity.email}</span>
              ) : (
                <span className="muted">Chưa cập nhật</span>
              )}
            </dd>
          </div>
          <div>
            <dt>Số điện thoại</dt>
            <dd>
              {currentPhone ? (
                <span className="mono">{currentPhone}</span>
              ) : (
                <span className="muted">Chưa cập nhật</span>
              )}
            </dd>
          </div>
          {isDoctor && (
            <>
              <div>
                <dt>Mã bác sĩ</dt>
                <dd className="mono">{doctorProfile?.id ?? identity?.doctorId ?? "Chưa tạo hồ sơ"}</dd>
              </div>
              <div>
                <dt>Chuyên khoa</dt>
                <dd>
                  {dir.loading ? (
                    <span className="muted">Đang tải…</span>
                  ) : doctorSpecialties.length > 0 ? (
                    <div className="chips">
                      {doctorSpecialties.map((name) => (
                        <Pill key={name} tone="info">
                          {name}
                        </Pill>
                      ))}
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

        {editing && (
          <div
            className="stack"
            style={{
              marginTop: 20,
              padding: 18,
              borderRadius: 12,
              background: "var(--surface-2, #f8faff)",
              border: "1px solid var(--border, #dce4ed)",
              maxWidth: 520,
            }}
          >
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={16} aria-hidden /> Cập nhật thông tin liên hệ
              </strong>
              <button type="button" className="btn sm" onClick={cancelEdit} disabled={busy || sendingOtp}>
                <X size={14} aria-hidden /> Hủy
              </button>
            </div>

            <Notice>
              <span>
                Đổi sang <strong>email mới</strong> yêu cầu xác nhận mã OTP 6 chữ số gửi tới hộp thư mới để tránh giả mạo. Dữ liệu liên hệ được mã hóa AES-GCM trong CSDL.
              </span>
            </Notice>

            <Field label="Email nhận thông báo" error={err}>
              {(id) => (
                <input
                  id={id}
                  className="field"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  value={email}
                  disabled={busy}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErr("");
                  }}
                  placeholder="ten@example.com"
                />
              )}
            </Field>

            {emailChanged && (
              <div className="stack" style={{ gap: 10 }}>
                <div className="row wrap" style={{ alignItems: "center", gap: 10 }}>
                  <button
                    type="button"
                    className="btn sm"
                    disabled={sendingOtp || cooldown > 0 || !EMAIL.test(email.trim())}
                    onClick={() => void sendOtp()}
                  >
                    <MailCheck size={14} aria-hidden />
                    {sendingOtp
                      ? "Đang gửi OTP…"
                      : cooldown > 0
                        ? `Gửi lại sau ${cooldown}s`
                        : otpSentFor === normalizedDraftEmail
                          ? "Gửi lại mã OTP"
                          : "Gửi mã OTP xác nhận"}
                  </button>
                  {otpSentFor === normalizedDraftEmail && (
                    <span className="muted">Mã OTP có hiệu lực trong 5 phút.</span>
                  )}
                </div>
                <Field label="Mã xác nhận OTP (6 chữ số)">
                  {(id) => (
                    <input
                      id={id}
                      className="field mono"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={otp}
                      disabled={busy}
                      onChange={(e) => {
                        setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                        setErr("");
                      }}
                      placeholder="Nhập 6 chữ số từ email mới"
                    />
                  )}
                </Field>
              </div>
            )}

            <Field label="Số điện thoại (tùy chọn)">
              {(id) => (
                <input
                  id={id}
                  className="field"
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={phone}
                  disabled={busy}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setErr("");
                  }}
                  placeholder="0901234567"
                />
              )}
            </Field>

            <div className="row" style={{ gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn primary"
                disabled={busy || !email.trim() || !otpReadyForCurrentDraft}
                onClick={() => void save()}
              >
                {busy ? "Đang lưu…" : emailChanged ? "Xác nhận OTP & Lưu" : "Lưu thông tin"}
              </button>
              <button type="button" className="btn" onClick={cancelEdit} disabled={busy || sendingOtp}>
                Hủy
              </button>
            </div>
          </div>
        )}
      </Panel>
    </>
  );
}
