import type { AppointmentMode, AppointmentStatus, Role, SessionStatus, QueueStatus } from "./types";

export type Tone = "" | "ok" | "wait" | "info" | "bad" | "purple";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  CONFIRMED: { label: "Đã xác nhận", tone: "info" },
  CHECKED_IN: { label: "Đã check-in", tone: "ok" },
  IN_PROGRESS: { label: "Đang khám", tone: "purple" },
  COMPLETED: { label: "Hoàn tất", tone: "ok" },
  CANCELLED: { label: "Đã hủy", tone: "bad" },
  NO_SHOW: { label: "Vắng mặt", tone: "bad" },
};

export const MODE_LABEL: Record<AppointmentMode, string> = {
  IN_PERSON: "Khám trực tiếp",
  REMOTE: "Khám từ xa",
};
export const MODE_SHORT: Record<AppointmentMode, string> = {
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

export const QUEUE_STATUS: Record<QueueStatus, { label: string; tone: Tone }> = {
  WAITING: { label: "Đang chờ", tone: "wait" },
  CALLED: { label: "Đã gọi", tone: "info" },
  IN_SERVICE: { label: "Đang khám", tone: "purple" },
  DONE: { label: "Đã xong", tone: "ok" },
};

export const SESSION_STATUS: Record<SessionStatus, { label: string; tone: Tone }> = {
  CREATED: { label: "Đã tạo phiên", tone: "info" },
  WAITING: { label: "Phòng chờ", tone: "wait" },
  ACTIVE: { label: "Đang khám", tone: "ok" },
  RECONNECTING: { label: "Đang kết nối lại", tone: "wait" },
  ENDED: { label: "Đã kết thúc", tone: "" },
  CANCELLED: { label: "Đã hủy", tone: "bad" },
};

export const NOTIFICATION_STATUS: Record<string, { label: string; tone: Tone }> = {
  PENDING: { label: "Đang chờ gửi", tone: "wait" },
  PROCESSING: { label: "Đang xử lý", tone: "info" },
  SENT: { label: "Đã gửi", tone: "ok" },
  DELIVERED: { label: "Đã nhận", tone: "ok" },
  FAILED: { label: "Thất bại", tone: "bad" },
  SKIPPED: { label: "Bỏ qua", tone: "" },
};
export const NOTIFICATION_EVENT: Record<string, string> = {
  BOOKED: "Xác nhận đặt lịch",
  RESCHEDULED: "Xác nhận đổi lịch",
  CANCELLED: "Xác nhận hủy lịch",
  REMINDER: "Nhắc lịch",
};

export const shortId = (id: string | null | undefined) => (id ? id.slice(0, 8) : "—");
/** Mã hiển thị cho lịch hẹn / bệnh nhân (backend không trả tên bệnh nhân). */
export const apptCode = (id: string) => "LH-" + id.slice(0, 8).toUpperCase();
export const patientCode = (id: string) => "BN-" + id.slice(-8).toUpperCase();

export const initials = (text: string) => {
  const parts = text.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const a = parts[0][0] ?? "";
  const b = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : (parts[0][1] ?? "");
  return (a + b).toUpperCase();
};

export const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const doctorLabel = (name?: string) =>
  name ? (/^(BS\.?|Bác sĩ)\s/i.test(name) ? name : "BS. " + name) : "Bác sĩ phụ trách";

export const asBool = (v: unknown) => v === true || v === 1 || v === "1" || v === "true";
