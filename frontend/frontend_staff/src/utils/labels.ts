import type { AppointmentMode, AppointmentStatus, Role } from "@/types";

export type Tone = "" | "ok" | "wait" | "bluepill" | "bad" | "purple";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  CONFIRMED: { label: "Đã xác nhận", tone: "bluepill" },
  CHECKED_IN: { label: "Đã check-in", tone: "ok" },
  IN_PROGRESS: { label: "Đang khám", tone: "purple" },
  COMPLETED: { label: "Hoàn tất", tone: "ok" },
  CANCELLED: { label: "Đã hủy", tone: "bad" },
  NO_SHOW: { label: "Vắng mặt", tone: "bad" },
};

export const MODE_LABEL: Record<AppointmentMode, string> = {
  IN_PERSON: "Trực tiếp",
  REMOTE: "Từ xa",
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMINISTRATOR: "Quản trị viên",
  RECEPTIONIST: "Lễ tân",
  AUDITOR: "Kiểm toán viên",
  DOCTOR: "Bác sĩ",
  PATIENT: "Bệnh nhân",
};

export const NOTIFICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "PENDING", tone: "wait" },
  PROCESSING: { label: "PROCESSING", tone: "bluepill" },
  SENT: { label: "SENT", tone: "ok" },
  FAILED: { label: "FAILED", tone: "bad" },
  SKIPPED: { label: "SKIPPED", tone: "" },
};

export const shortId = (id: string) => (id ? id.slice(0, 8) : "—");

export const initials = (text: string) => {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0][0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0][1] ?? "");
  return (a + b).toUpperCase();
};

export const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
