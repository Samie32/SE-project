import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  Copy,
  FileText,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  Pencil,
  Phone,
  ShieldCheck,
  Stethoscope,
  X,
} from "lucide-react";
import { requestContactOtp, updateContact } from "@/api/catalog";
import { ACCOUNT_PHONE, normalizePhone } from "@/api/patient-accounts";
import { analyzeAccountProfile } from "@/core/account-profile";
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
  const [params, setParams] = useSearchParams();

  const [editing, setEditing] = useState(() => params.get("edit") === "1");
  const [email, setEmail] = useState(identity?.email ?? "");
  const [phone, setPhone] = useState(identity?.phone ?? "");
  const [otp, setOtp] = useState("");
  const [otpSentFor, setOtpSentFor] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const profile = analyzeAccountProfile(identity);
  const currentEmail = (identity?.email ?? "").trim().toLowerCase();
  const currentPhone = identity?.phone ?? "";
  const fullName = identity?.displayName ?? displayName;

  useEffect(() => {
    if (params.get("edit") === "1") setEditing(true);
  }, [params]);

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

  const clearEditParam = () => {
    if (params.get("edit") === "1") {
      const next = new URLSearchParams(params);
      next.delete("edit");
      setParams(next, { replace: true });
    }
  };

  const openEdit = () => {
    setEmail(identity?.email ?? "");
    setPhone(identity?.phone ?? "");
    setOtp("");
    setOtpSentFor("");
    setErr("");
    setEditing(true);
  };

  const cancelEdit = () => {
    clearEditParam();
    setEditing(false);
    setOtp("");
    setOtpSentFor("");
    setErr("");
  };

  const copyValue = async (key: string, value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      toast.success(`Đã sao chép ${label}.`);
      window.setTimeout(() => setCopiedKey((cur) => (cur === key ? null : cur)), 2000);
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
      clearEditParam();
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

  const missingExtra = profile.extraFields.filter((f) => !f.filled);
  const shownName = doctorProfile?.displayName ?? fullName;

  return (
    <div className="account-layout">
      <PageHead
        eyebrow="Hồ sơ cá nhân"
        title="Tài khoản của tôi"
        text="Quản lý thông tin liên hệ, bảo mật đăng nhập và mã định danh tài khoản."
      />

      <section className="panel account-hero" aria-label="Tổng quan tài khoản">
        <div className="account-hero-meta">
          <div className="account-avatar" aria-hidden>
            {initials(shownName)}
          </div>
          <div className="grow">
            <h2 className="account-name">{shownName}</h2>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              {roles.map((r) => (
                <Pill key={r} tone="info">
                  {ROLE_LABEL[r]}
                </Pill>
              ))}
              {profile.totalCount > 0 && (
                <Pill tone={profile.complete ? "ok" : "wait"}>
                  {profile.complete ? "Hồ sơ đầy đủ" : `Còn thiếu ${profile.missing.length} mục`}
                </Pill>
              )}
            </div>
          </div>
        </div>
        {!editing && (
          <button type="button" className="btn primary sm" onClick={openEdit}>
            <Pencil size={14} aria-hidden /> Chỉnh sửa thông tin
          </button>
        )}
      </section>

      {!editing && profile.missing.length > 0 && (
        <Notice
          tone={profile.missingImportant.length > 0 ? "warn" : "info"}
          actions={
            <button type="button" className="btn sm primary" onClick={openEdit}>
              Bổ sung ngay
            </button>
          }
        >
          Tài khoản còn thiếu thông tin: <b>{profile.missing.map((f) => f.shortLabel).join(", ")}</b>.
        </Notice>
      )}

      <div className="grid2">
        <div>
          <Panel
            title="Thông tin liên hệ & hồ sơ"
            subtitle="Dùng để nhận xác nhận và nhắc lịch khám"
            actions={
              !editing && (
                <button type="button" className="btn sm" onClick={openEdit}>
                  <Pencil size={13} aria-hidden /> Cập nhật
                </button>
              )
            }
          >
            <div className="info-list">
              <div className="info-row">
                <span className="info-icon" aria-hidden>
                  <Mail size={17} />
                </span>
                <div className="info-content">
                  <span className="info-label">Email nhận thông báo</span>
                  <div className="info-value">
                    {identity?.email ? (
                      <span>{identity.email}</span>
                    ) : (
                      <span className="muted">Chưa cập nhật</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="info-row">
                <span className="info-icon" aria-hidden>
                  <Phone size={17} />
                </span>
                <div className="info-content">
                  <span className="info-label">Số điện thoại</span>
                  <div className="info-value">
                    {currentPhone ? (
                      <span>{currentPhone}</span>
                    ) : (
                      <span className="muted">Chưa cập nhật</span>
                    )}
                  </div>
                </div>
              </div>

              {profile.extraFields.map((field) => (
                <div className="info-row" key={field.key}>
                  <span className="info-icon" aria-hidden>
                    <FileText size={17} />
                  </span>
                  <div className="info-content">
                    <span className="info-label">{field.label}</span>
                    <div className="info-value">
                      {field.filled ? (
                        <span>{field.displayValue}</span>
                      ) : (
                        <span className="muted">Chưa cập nhật</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {editing && (
              <div className="account-edit-box stack">
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
                    Đổi sang <strong>email mới</strong> yêu cầu xác nhận mã OTP 6 chữ số gửi tới hộp thư mới để tránh giả mạo.
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

                {missingExtra.length > 0 && (
                  <p className="muted" style={{ margin: 0 }}>
                    Các trường hồ sơ bổ sung ({missingExtra.map((f) => f.shortLabel).join(", ")}) sẽ được quản trị viên hoặc quầy tiếp nhận cập nhật khi cần.
                  </p>
                )}

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

          {isDoctor && (
            <Panel title="Hồ sơ chuyên môn" subtitle="Thông tin phân công khám chữa bệnh">
              <div className="info-list">
                <div className="info-row">
                  <span className="info-icon" aria-hidden>
                    <Stethoscope size={17} />
                  </span>
                  <div className="info-content">
                    <span className="info-label">Mã bác sĩ</span>
                    <div className="info-value mono">
                      {doctorProfile?.id ?? identity?.doctorId ?? "Chưa tạo hồ sơ"}
                    </div>
                  </div>
                </div>
                <div className="info-row">
                  <span className="info-icon" aria-hidden>
                    <FileText size={17} />
                  </span>
                  <div className="info-content">
                    <span className="info-label">Chuyên khoa</span>
                    <div className="info-value">
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
                    </div>
                  </div>
                </div>
                <div className="info-row">
                  <span className="info-icon" aria-hidden>
                    <ShieldCheck size={17} />
                  </span>
                  <div className="info-content">
                    <span className="info-label">Trạng thái nhận lịch</span>
                    <div className="info-value">
                      {dir.loading ? (
                        <span className="muted">Đang tải…</span>
                      ) : doctorProfile ? (
                        <Pill tone={doctorProfile.active ? "ok" : "wait"}>
                          {doctorProfile.active ? "Đang nhận lịch mới" : "Tạm ngưng nhận lịch"}
                        </Pill>
                      ) : (
                        <Pill tone="wait">Chưa kích hoạt hồ sơ</Pill>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
          )}
        </div>

        <div>
          <Panel title="Bảo mật & đăng nhập">
            <div className="security-list">
              <div className="security-item">
                <Lock size={16} aria-hidden />
                <span>Dữ liệu liên hệ được mã hóa AES-GCM trong cơ sở dữ liệu.</span>
              </div>
              <div className="security-item">
                <MailCheck size={16} aria-hidden />
                <span>Xác thực OTP 6 chữ số bắt buộc khi thay đổi email.</span>
              </div>
            </div>
            {changePassword && (
              <button type="button" className="btn block" style={{ marginTop: 14 }} onClick={changePassword}>
                <KeyRound size={15} aria-hidden /> Đổi mật khẩu
              </button>
            )}
          </Panel>

          <Panel title="Mã định danh & hỗ trợ" subtitle="Dùng khi đối soát hoặc cần hỗ trợ kỹ thuật">
            <div className="id-group">
              {identity?.username && (
                <div>
                  <div className="info-label">Tên đăng nhập</div>
                  <div className="id-box" style={{ marginTop: 4 }}>
                    <span className="id-code">{identity.username}</span>
                  </div>
                </div>
              )}

              <div>
                <div className="info-label">Mã tài khoản</div>
                <div className="id-box" style={{ marginTop: 4 }}>
                  <span className="id-code">{identity?.id ?? "—"}</span>
                  {identity?.id && (
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => void copyValue("account", identity.id, "mã tài khoản")}
                      title="Sao chép mã tài khoản"
                    >
                      {copiedKey === "account" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copiedKey === "account" ? "Đã chép" : "Sao chép"}
                    </button>
                  )}
                </div>
                {roles.includes("PATIENT") && (
                  <p className="muted" style={{ margin: "6px 0 0", fontSize: 13.5 }}>
                    Cung cấp mã tài khoản này khi cần phòng khám hỗ trợ đăng nhập.
                  </p>
                )}
              </div>

              {identity?.patientId && (
                <div>
                  <div className="info-label">Mã bệnh nhân</div>
                  <div className="id-box" style={{ marginTop: 4 }}>
                    <span className="id-code">{identity.patientId}</span>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => void copyValue("patient", identity.patientId!, "mã bệnh nhân")}
                      title="Sao chép mã bệnh nhân"
                    >
                      {copiedKey === "patient" ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copiedKey === "patient" ? "Đã chép" : "Sao chép"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
