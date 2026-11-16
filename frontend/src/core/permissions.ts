import type { Role } from "./types";

export type Permission =
  // Bệnh nhân
  | "patient.portal"
  // Bác sĩ
  | "doctor.portal"
  // Nhân viên
  | "dashboard.view"
  | "appointments.read"
  | "checkin.perform"
  | "queue.manage"
  | "notifications.view"
  // Quản trị
  | "doctors.manage"
  | "specialties.manage"
  | "permissions.manage"
  | "schedules.manage"
  // Kiểm toán
  | "audit.view";

/**
 * Chính sách giao diện. Phản chiếu Access.Actor.require ở backend, nhưng ẩn menu
 * KHÔNG phải ranh giới bảo mật: backend kiểm tra lại mọi lệnh gọi.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  PATIENT: ["patient.portal"],
  DOCTOR: ["doctor.portal"],
  RECEPTIONIST: [
    "dashboard.view",
    "appointments.read",
    "checkin.perform",
    "queue.manage",
    "notifications.view",
  ],
  ADMINISTRATOR: [
    "dashboard.view",
    "appointments.read",
    "doctors.manage",
    "specialties.manage",
    "permissions.manage",
    "schedules.manage",
    "notifications.view",
  ],
  AUDITOR: ["audit.view"],
};

export function hasPermission(roles: readonly Role[], permission: Permission) {
  return roles.some((r) => ROLE_PERMISSIONS[r]?.includes(permission));
}

/** Trang đầu theo vai trò (ưu tiên khi có nhiều vai trò). */
export function homePath(roles: readonly Role[]): string {
  if (roles.includes("ADMINISTRATOR") || roles.includes("RECEPTIONIST")) return "/staff";
  if (roles.includes("DOCTOR")) return "/doctor";
  if (roles.includes("AUDITOR")) return "/audit";
  if (roles.includes("PATIENT")) return "/patient";
  return "/account";
}
