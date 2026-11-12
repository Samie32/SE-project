import type { Permission } from "@/auth/permissions";

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  section: string;
  permission: Permission;
}

// Single source of truth for menu + routes + breadcrumb (icons follow the prototype).
export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Dashboard", icon: "▦", section: "TỔNG QUAN", permission: "dashboard.view" },
  { path: "/reception", label: "Tiếp đón / Check-in", icon: "♧", section: "VẬN HÀNH", permission: "checkin.perform" },
  { path: "/queue", label: "Hàng đợi khám", icon: "☷", section: "VẬN HÀNH", permission: "queue.manage" },
  { path: "/doctors", label: "Danh mục bác sĩ", icon: "♙", section: "QUẢN TRỊ HỆ THỐNG", permission: "doctors.manage" },
  { path: "/specialties", label: "Danh mục chuyên khoa", icon: "◈", section: "QUẢN TRỊ HỆ THỐNG", permission: "specialties.manage" },
  { path: "/permissions", label: "Phân quyền", icon: "☑", section: "QUẢN TRỊ HỆ THỐNG", permission: "permissions.manage" },
  { path: "/notifications", label: "Thông báo", icon: "✉", section: "HỆ THỐNG", permission: "notifications.view" },
  { path: "/audit", label: "Nhật ký kiểm toán", icon: "◷", section: "HỆ THỐNG", permission: "audit.view" },
];
