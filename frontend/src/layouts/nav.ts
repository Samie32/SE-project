import {
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileHeart,
  History,
  LayoutDashboard,
  ListOrdered,
  Network,
  ShieldCheck,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
  Video,
  BookOpenCheck,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/core/permissions";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  section: string;
  permission: Permission;
  /** Khớp chính xác (trang tổng quan). */
  end?: boolean;
}

// Nguồn duy nhất cho menu + breadcrumb. Route được định nghĩa trong App.tsx.
export const NAV_ITEMS: NavItem[] = [
  // Bệnh nhân
  { path: "/patient", label: "Tổng quan", icon: LayoutDashboard, section: "CỔNG BỆNH NHÂN", permission: "patient.portal", end: true },
  { path: "/patient/booking", label: "Đặt lịch khám", icon: CalendarDays, section: "CỔNG BỆNH NHÂN", permission: "patient.portal" },
  { path: "/patient/appointments", label: "Lịch khám của tôi", icon: CalendarClock, section: "CỔNG BỆNH NHÂN", permission: "patient.portal" },
  { path: "/patient/records", label: "Hồ sơ & đơn thuốc", icon: FileHeart, section: "CỔNG BỆNH NHÂN", permission: "patient.portal" },
  { path: "/patient/telehealth", label: "Khám từ xa", icon: Video, section: "CỔNG BỆNH NHÂN", permission: "patient.portal" },
  // Bác sĩ
  { path: "/doctor", label: "Tổng quan hôm nay", icon: LayoutDashboard, section: "CỔNG BÁC SĨ", permission: "doctor.portal", end: true },
  { path: "/doctor/schedule", label: "Lịch làm việc & nghỉ", icon: CalendarCheck, section: "CỔNG BÁC SĨ", permission: "doctor.portal" },
  { path: "/doctor/appointments", label: "Lịch hẹn của tôi", icon: ClipboardList, section: "CỔNG BÁC SĨ", permission: "doctor.portal" },
  { path: "/doctor/queue", label: "Hàng đợi khám", icon: ListOrdered, section: "CỔNG BÁC SĨ", permission: "doctor.portal" },
  { path: "/doctor/consultation", label: "Khám bệnh & kê đơn", icon: BookOpenCheck, section: "CỔNG BÁC SĨ", permission: "doctor.portal" },
  { path: "/doctor/telehealth", label: "Phòng khám từ xa", icon: Video, section: "CỔNG BÁC SĨ", permission: "doctor.portal" },
  // Nhân viên
  { path: "/staff", label: "Dashboard", icon: LayoutDashboard, section: "VẬN HÀNH", permission: "dashboard.view", end: true },
  { path: "/staff/reception", label: "Tiếp đón / Check-in", icon: Users, section: "VẬN HÀNH", permission: "checkin.perform" },
  { path: "/staff/queue", label: "Hàng đợi khám", icon: ListOrdered, section: "VẬN HÀNH", permission: "queue.manage" },
  // Quản trị
  { path: "/admin/doctors", label: "Danh mục bác sĩ", icon: Stethoscope, section: "QUẢN TRỊ HỆ THỐNG", permission: "doctors.manage" },
  { path: "/admin/specialties", label: "Danh mục chuyên khoa", icon: Network, section: "QUẢN TRỊ HỆ THỐNG", permission: "specialties.manage" },
  { path: "/admin/schedules", label: "Lịch làm việc bác sĩ", icon: CalendarCheck, section: "QUẢN TRỊ HỆ THỐNG", permission: "schedules.manage" },
  { path: "/admin/permissions", label: "Phân quyền người dùng", icon: UserCog, section: "QUẢN TRỊ HỆ THỐNG", permission: "permissions.manage" },
  // Hệ thống
  { path: "/staff/notifications", label: "Trung tâm thông báo", icon: Bell, section: "HỆ THỐNG", permission: "notifications.view" },
  { path: "/audit", label: "Nhật ký kiểm toán", icon: ShieldCheck, section: "HỆ THỐNG", permission: "audit.view" },
];

export const ACCOUNT_ITEM = { path: "/account", label: "Tài khoản của tôi", icon: UserRound, section: "TÀI KHOẢN" };
export const HISTORY_ICON = History;
