import { useState } from "react";
import { setUserRoles } from "@/api/authApi";
import { errorMessage } from "@/api/client";
import { useStaffAuth } from "@/auth/AuthProvider";
import { PERMISSION_LABEL, ROLE_PERMISSIONS, type Permission } from "@/auth/permissions";
import { config } from "@/config";
import { useToast } from "@/components/Toast";
import { ConfirmDialog, Field, Metric, PageHead, Panel, Pill } from "@/components/ui";
import { ROLE_LABEL, UUID_RE } from "@/utils/labels";
import { ALL_ROLES, type Role } from "@/types";

const ROLE_NOTE: Record<Role, string> = {
  ADMINISTRATOR: "Quản lý danh mục, phân quyền, thông báo",
  RECEPTIONIST: "Check-in, hàng đợi, thông báo",
  AUDITOR: "Tra cứu nhật ký kiểm toán",
  DOCTOR: "Cổng bác sĩ (cần hồ sơ bác sĩ)",
  PATIENT: "Cổng bệnh nhân (mặc định khi đăng ký)",
};

export function PermissionsPage() {
  const { identity } = useStaffAuth();
  const toast = useToast();
  const [userId, setUserId] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [errors, setErrors] = useState<{ userId?: string; roles?: string }>({});
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState("");

  const toggle = (r: Role, on: boolean) => setRoles((x) => (on ? [...x, r] : x.filter((y) => y !== r)));

  const validate = () => {
    const e: { userId?: string; roles?: string } = {};
    const id = userId.trim();
    if (!UUID_RE.test(id)) e.userId = "Nhập đúng mã tài khoản (UUID).";
    else if (id.toLowerCase() === identity?.id.toLowerCase())
      e.userId = "Không thể tự thay đổi vai trò của chính mình.";
    if (roles.length === 0) e.roles = "Chọn ít nhất một vai trò.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const apply = async () => {
    setBusy(true);
    setApiError("");
    try {
      await setUserRoles(userId.trim(), roles);
      toast.success("Đã cập nhật vai trò. Người dùng cần đăng nhập lại để áp dụng.");
      setConfirm(false);
      setUserId("");
      setRoles([]);
    } catch (e) {
      setApiError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(identity?.id ?? "");
      toast.success("Đã sao chép mã tài khoản.");
    } catch {
      toast.error("Không sao chép được. Hãy chọn và sao chép thủ công.");
    }
  };

  const features: [string, string, "ok" | "wait" | "bad", string][] = [
    ["Danh tính & vai trò", "GET /api/me", "ok", "Đã nối"],
    ["Đổi vai trò người dùng", "PUT /api/users/{id}/roles", "ok", "Đã nối"],
    ["Danh sách người dùng", "GET /api/users (đề xuất)", "bad", "Chờ backend"],
    ["Bác sĩ (xem/thêm/sửa/ngưng)", "GET/POST /api/doctors, PUT /api/doctors/{id}", "ok", "Đã nối"],
    ["Chuyên khoa (xem/thêm)", "GET/POST /api/specialties", "ok", "Đã nối"],
    ["Chuyên khoa (sửa/xóa)", "PUT/DELETE /api/specialties/{id} (đề xuất)", "bad", "Chờ backend"],
    ["Danh sách lịch hẹn", "GET /api/appointments", "ok", "Đã nối (không có tên bệnh nhân)"],
    ["Check-in", "POST /api/appointments/{id}/check-in", config.backend.checkin ? "ok" : "bad", config.backend.checkin ? "Đã bật" : "Chờ backend"],
    ["Hàng đợi", "GET /api/queue-tickets (đề xuất), POST …/queue/next, …/skip", config.backend.queue ? "ok" : "bad", config.backend.queue ? "Đã bật" : "Chờ backend"],
    ["Thông báo", "GET /api/notification-jobs", "ok", "Đã nối"],
    ["Nhật ký kiểm toán", "GET /api/audit-events", config.backend.audit ? "ok" : "bad", config.backend.audit ? "Đã bật" : "Chờ backend"],
  ];

  return (
    <>
      <PageHead eyebrow="QUẢN TRỊ / BẢO MẬT" title="Quản lý phân quyền" />
      <div className="notice warn">
        ⚠ Ẩn menu và nút theo vai trò chỉ giúp giao diện gọn. Quyền thực tế do backend kiểm tra cho từng API
        (vai trò lấy từ cơ sở dữ liệu, không từ token hay trình duyệt).
      </div>

      <div className="metrics metrics5">
        {ALL_ROLES.map((r) => (
          <Metric
            key={r}
            label={ROLE_LABEL[r]}
            icon="☑"
            value={<span style={{ fontSize: 15 }}>{r}</span>}
            hint={ROLE_NOTE[r]}
          />
        ))}
      </div>

      <div className="grid2">
        <Panel title="Cấp / đổi vai trò" subtitle="Thay thế toàn bộ vai trò hiện có của tài khoản đích">
          <Field
            label="Mã tài khoản (UUID) *"
            error={errors.userId}
            hint="Backend chưa có API danh sách người dùng, nên cần nhập mã tài khoản."
          >
            <input
              className="field"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
          </Field>
          <Field label="Vai trò mới *" error={errors.roles} hint="DOCTOR chỉ gán được khi đã có hồ sơ bác sĩ (trang Danh mục bác sĩ).">
            <div className="checkgrid">
              {ALL_ROLES.map((r) => (
                <label className="chk" key={r}>
                  <input type="checkbox" checked={roles.includes(r)} onChange={(e) => toggle(r, e.target.checked)} />{" "}
                  {ROLE_LABEL[r]} <small className="muted">({r})</small>
                </label>
              ))}
            </div>
          </Field>
          <button
            className="btn primary"
            onClick={() => {
              setApiError("");
              if (validate()) setConfirm(true);
            }}
          >
            Áp dụng vai trò…
          </button>
        </Panel>

        <Panel title="Tài khoản của bạn" subtitle="Lấy từ GET /api/me">
          <div className="qline">
            <span className="muted">Mã tài khoản</span>
            <code style={{ wordBreak: "break-all" }}>{identity?.id}</code>
          </div>
          <div className="row" style={{ marginBottom: 12 }}>
            <button className="btn" onClick={copy}>
              Sao chép mã
            </button>
          </div>
          <div className="row">
            {identity?.roles.map((r) => (
              <Pill key={r} tone="bluepill">
                {ROLE_LABEL[r]}
              </Pill>
            ))}
          </div>
        </Panel>
      </div>

      <Panel
        title="Ma trận quyền của giao diện"
        subtitle="Chức năng hiển thị theo vai trò (chỉ đọc; chính sách thật nằm ở backend)"
      >
        <div className="tablewrap">
          <table className="permtable">
            <thead>
              <tr>
                <th>Chức năng</th>
                {ALL_ROLES.map((r) => (
                  <th key={r}>{ROLE_LABEL[r]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.keys(PERMISSION_LABEL) as Permission[]).map((p) => (
                <tr key={p}>
                  <td>{PERMISSION_LABEL[p]}</td>
                  {ALL_ROLES.map((r) => (
                    <td key={r}>{ROLE_PERMISSIONS[r].includes(p) ? "✓" : "—"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Trạng thái kết nối chức năng" subtitle="Chức năng nào đã nối backend, chức năng nào còn chờ API">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Chức năng</th>
                <th>API</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {features.map(([name, api, tone, label]) => (
                <tr key={name}>
                  <td>{name}</td>
                  <td>
                    <code>{api}</code>
                  </td>
                  <td>
                    <Pill tone={tone}>{label}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {confirm && (
        <ConfirmDialog
          title="Xác nhận thay đổi quyền"
          danger
          confirmLabel="Xác nhận thay đổi"
          busy={busy}
          error={apiError}
          onConfirm={apply}
          onCancel={() => setConfirm(false)}
          message={
            <>
              Tài khoản <code>{userId.trim()}</code> sẽ có vai trò:{" "}
              <b>{roles.map((r) => ROLE_LABEL[r]).join(", ")}</b>. Các vai trò cũ bị thay thế hoàn toàn.
            </>
          }
        />
      )}
    </>
  );
}
