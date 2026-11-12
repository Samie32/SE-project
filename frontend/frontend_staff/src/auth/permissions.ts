import type { Role } from "@/types";

export type Permission =
  | "dashboard.view"
  | "appointments.read"
  | "doctors.manage"
  | "specialties.manage"
  | "permissions.manage"
  | "checkin.perform"
  | "queue.manage"
  | "notifications.view"
  | "audit.view";

/**
 * UI policy only. It mirrors the backend rules (Access.Actor.require in the
 * controllers) but hiding things is never the security boundary: every call is
 * re-checked by the backend and 401/403 are handled in the UI.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMINISTRATOR: [
    "dashboard.view",
    "appointments.read",
    "doctors.manage",
    "specialties.manage",
    "permissions.manage",
    "notifications.view",
  ],
  RECEPTIONIST: [
    "dashboard.view",
    "appointments.read",
    "checkin.perform",
    "queue.manage",
    "notifications.view",
  ],
  // Dashboard for AUDITOR shows only data the backend lets that role read
  // (doctors / specialties catalog). Appointments are not exposed to it.
  AUDITOR: ["dashboard.view", "audit.view"],
  DOCTOR: [],
  PATIENT: [],
};

export const PERMISSION_LABEL: Record<Permission, string> = {
  "dashboard.view": "Xem Dashboard",
  "appointments.read": "Xem danh sách lịch hẹn",
  "doctors.manage": "Quản lý bác sĩ",
  "specialties.manage": "Quản lý chuyên khoa",
  "permissions.manage": "Phân quyền người dùng",
  "checkin.perform": "Check-in bệnh nhân",
  "queue.manage": "Quản lý hàng đợi",
  "notifications.view": "Xem thông báo",
  "audit.view": "Xem nhật ký kiểm toán",
};

export function hasPermission(roles: readonly Role[], permission: Permission) {
  return roles.some((r) => ROLE_PERMISSIONS[r]?.includes(permission));
}
