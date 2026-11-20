import { useState, type FormEvent } from "react";
import { LockKeyhole, LockKeyholeOpen, Search } from "lucide-react";
import {
  isValidPatientLookupQuery,
  lookupPatientAccount,
  PATIENT_ACCOUNT_REASONS,
  updatePatientAccountAccess,
  type PatientAccount,
  type PatientAccountReason,
} from "@/api/patient-accounts";
import { ApiError, errorMessage } from "@/core/client";
import {
  ConfirmDialog,
  DetailList,
  Field,
  PageHead,
  Panel,
  Pill,
  useToast,
} from "@/ui";

const REASON_LABELS: Record<PatientAccountReason, string> = {
  SECURITY_REVIEW: "Rà soát bảo mật",
  POLICY_REVIEW: "Rà soát theo quy định",
  PATIENT_REQUEST: "Yêu cầu của bệnh nhân",
};

export function PatientAccountsPage() {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [account, setAccount] = useState<PatientAccount>();
  const [lookupError, setLookupError] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [reason, setReason] = useState<PatientAccountReason | "">("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const lookup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (lookingUp || confirming) return;
    const target = query.trim();
    setAccount(undefined);
    if (!isValidPatientLookupQuery(target)) {
      setLookupError(
        "Nhập chính xác mã tài khoản (UUID), email hoặc số điện thoại hợp lệ.",
      );
      return;
    }
    setLookingUp(true);
    setLookupError("");
    try {
      setAccount(await lookupPatientAccount(target));
    } catch (error) {
      setLookupError(
        error instanceof ApiError && error.status === 404
          ? "Không tìm thấy tài khoản bệnh nhân khớp chính xác thông tin đã nhập."
          : error instanceof ApiError && error.status === 409
            ? "Có nhiều tài khoản trùng thông tin liên hệ. Vui lòng nhập chính xác mã tài khoản (UUID)."
            : errorMessage(error),
      );
    } finally {
      setLookingUp(false);
    }
  };

  const save = async () => {
    if (!account || !reason || saving) return;
    const active = !account.active;
    setSaving(true);
    setSaveError("");
    try {
      setAccount(await updatePatientAccountAccess(account.id, active, reason));
      setConfirming(false);
      toast.success(
        active
          ? "Đã mở khóa tài khoản bệnh nhân."
          : "Đã khóa tài khoản bệnh nhân.",
      );
    } catch (error) {
      setSaveError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead title="Tài khoản bệnh nhân" />
      <div className="stack">
        <Panel title="Tra cứu tài khoản">
          <form className="stack" onSubmit={(event) => void lookup(event)}>
            <Field
              label="Mã tài khoản, email hoặc số điện thoại"
              error={lookupError}
              hint="Chỉ hiển thị kết quả khi nhập chính xác mã tài khoản (UUID), email hoặc số điện thoại của bệnh nhân."
            >
              {(id) => (
                <input
                  id={id}
                  className="field mono"
                  value={query}
                  placeholder="UUID, ten@example.com hoặc 0901234567"
                  autoComplete="off"
                  spellCheck={false}
                  aria-invalid={Boolean(lookupError)}
                  disabled={lookingUp || confirming}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setAccount(undefined);
                    setLookupError("");
                  }}
                />
              )}
            </Field>
            <div className="row">
              <button
                type="submit"
                className="btn primary"
                disabled={!query.trim() || lookingUp || confirming}
              >
                <Search size={16} aria-hidden />{" "}
                {lookingUp ? "Đang tra cứu…" : "Tra cứu"}
              </button>
            </div>
          </form>
        </Panel>
        {account && (
          <Panel title="Kết quả tra cứu">
            <DetailList
              rows={[
                ["Tên hiển thị", <strong>{account.displayName}</strong>],
                ["Mã tài khoản", <span className="mono">{account.id}</span>],
                [
                  "Trạng thái",
                  <Pill tone={account.active ? "ok" : "wait"}>
                    {account.active ? "Đang hoạt động" : "Đã khóa"}
                  </Pill>,
                ],
              ]}
            />
            <button
              type="button"
              className={account.active ? "btn danger" : "btn primary"}
              onClick={() => {
                setReason("");
                setSaveError("");
                setConfirming(true);
              }}
            >
              {account.active ? (
                <LockKeyhole size={16} aria-hidden />
              ) : (
                <LockKeyholeOpen size={16} aria-hidden />
              )}
              {account.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
            </button>
          </Panel>
        )}
      </div>
      {account && confirming && (
        <ConfirmDialog
          title={account.active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
          message={
            account.active ? (
              <>
                Khóa quyền truy cập ClinicCare của{" "}
                <strong>{account.displayName}</strong>, kể cả phiên đang đăng
                nhập.
              </>
            ) : (
              <>
                Khôi phục quyền truy cập ClinicCare của{" "}
                <strong>{account.displayName}</strong>.
              </>
            )
          }
          confirmLabel={account.active ? "Xác nhận khóa" : "Xác nhận mở khóa"}
          danger={account.active}
          busy={saving}
          disabled={!reason}
          error={saveError}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void save()}
        >
          <Field label="Lý do">
            {(id) => (
              <select
                id={id}
                className="field"
                required
                value={reason}
                disabled={saving}
                onChange={(event) =>
                  setReason(event.target.value as PatientAccountReason | "")
                }
              >
                <option value="">Chọn lý do</option>
                {PATIENT_ACCOUNT_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {REASON_LABELS[value]}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </ConfirmDialog>
      )}
    </>
  );
}
