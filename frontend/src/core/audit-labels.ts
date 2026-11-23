import { UUID_RE, type Tone } from "./labels";
import type { AuditActionCategory } from "./types";

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  // M01 — Xác thực & Tài khoản
  ACCOUNT_REGISTERED: "Đăng ký tài khoản bệnh nhân",
  PROFILE_READ: "Xem hồ sơ cá nhân",
  CONTACT_OTP_SENT: "Gửi mã OTP xác thực email",
  CONTACT_UPDATED: "Cập nhật thông tin liên hệ",
  USERS_READ: "Xem danh sách nhân sự",
  STAFF_CREATED: "Tạo tài khoản nhân sự",
  STAFF_UPDATED: "Cập nhật tài khoản nhân sự",
  ROLES_CHANGED: "Thay đổi phân quyền nhân sự",
  PATIENT_ACCOUNT_LOOKUP: "Tra cứu tài khoản bệnh nhân",
  PATIENT_ACCOUNT_LOCKED_SECURITY_REVIEW: "Khóa tài khoản bệnh nhân (Rà soát bảo mật)",
  PATIENT_ACCOUNT_LOCKED_POLICY_REVIEW: "Khóa tài khoản bệnh nhân (Rà soát quy định)",
  PATIENT_ACCOUNT_LOCKED_PATIENT_REQUEST: "Khóa tài khoản bệnh nhân (Yêu cầu bệnh nhân)",
  PATIENT_ACCOUNT_UNLOCKED_SECURITY_REVIEW: "Mở khóa tài khoản bệnh nhân (Rà soát bảo mật)",
  PATIENT_ACCOUNT_UNLOCKED_POLICY_REVIEW: "Mở khóa tài khoản bệnh nhân (Rà soát quy định)",
  PATIENT_ACCOUNT_UNLOCKED_PATIENT_REQUEST: "Mở khóa tài khoản bệnh nhân (Yêu cầu bệnh nhân)",
  // M02 & M03 — Danh mục & Lịch làm việc
  SPECIALTY_CREATED: "Tạo chuyên khoa",
  SPECIALTY_UPDATED: "Cập nhật chuyên khoa",
  DOCTOR_CREATED: "Tạo hồ sơ bác sĩ",
  DOCTOR_UPDATED: "Cập nhật hồ sơ bác sĩ",
  CLINIC_HOURS_UPDATED: "Cập nhật giờ hoạt động phòng khám",
  CLINIC_HOLIDAY_CREATED: "Thêm lịch nghỉ lễ",
  CLINIC_HOLIDAY_REMOVED: "Xóa lịch nghỉ lễ",
  AVAILABILITY_CREATED: "Tạo ca làm việc bác sĩ",
  AVAILABILITY_REMOVED: "Xóa ca làm việc bác sĩ",
  TIME_OFF_CREATED: "Đăng ký thời gian nghỉ bác sĩ",
  TIME_OFF_REMOVED: "Xóa thời gian nghỉ bác sĩ",
  // M04 & M08 — Lịch hẹn, Tiếp đón & Hàng đợi
  APPOINTMENT_BOOKED: "Đặt lịch khám",
  APPOINTMENT_RESCHEDULED: "Đổi lịch khám",
  APPOINTMENT_CANCELLED: "Hủy lịch khám",
  APPOINTMENT_CHECKED_IN: "Check-in tiếp đón",
  APPOINTMENT_IN_PROGRESS: "Bắt đầu ca khám",
  APPOINTMENT_COMPLETED: "Hoàn tất ca khám",
  APPOINTMENT_NO_SHOW: "Ghi nhận vắng mặt",
  APPOINTMENT_DELAY_NOTICE_QUEUED: "Tạo thông báo chậm giờ hẹn",
  APPOINTMENT_READ: "Xem chi tiết lịch hẹn",
  APPOINTMENT_LIST_READ: "Xem danh sách lịch hẹn",
  QUEUE_READ: "Xem hàng đợi khám",
  QUEUE_CALLED: "Gọi bệnh nhân vào khám",
  QUEUE_SKIPPED: "Bỏ lượt, đưa về cuối hàng",
  // M05 — Hồ sơ lâm sàng & Đơn thuốc
  RECORD_DRAFT: "Lưu bản nháp bệnh án",
  RECORD_FINAL: "Hoàn tất hồ sơ bệnh án",
  RECORD_AMENDED: "Chỉnh sửa bổ sung bệnh án",
  RECORD_READ: "Xem hồ sơ bệnh án",
  PATIENT_RECORDS_READ: "Xem lịch sử bệnh án bệnh nhân",
  PRESCRIPTION_CREATED: "Tạo đơn thuốc nháp",
  PRESCRIPTION_UPDATED: "Cập nhật đơn thuốc nháp",
  PRESCRIPTION_ISSUED: "Phát hành đơn thuốc",
  ENCOUNTER_PRESCRIPTIONS_READ: "Xem đơn thuốc của ca khám",
  PATIENT_PRESCRIPTIONS_READ: "Xem lịch sử đơn thuốc bệnh nhân",
  // M09 — Khám từ xa WebRTC
  TELEHEALTH_CREATED: "Khởi tạo phòng khám từ xa",
  TELEHEALTH_READ: "Xem trạng thái phòng khám từ xa",
  TELEHEALTH_JOINED: "Tham gia phòng khám từ xa",
  TELEHEALTH_STARTED: "Bắt đầu phiên khám từ xa",
  TELEHEALTH_ENDED: "Kết thúc phiên khám từ xa",
  TELEHEALTH_ACTIVE: "Kết nối lại phiên khám từ xa",
  TELEHEALTH_RECONNECTING: "Tạm gián đoạn phiên khám từ xa",
  TELEHEALTH_SIGNAL_SENT: "Gửi tín hiệu WebRTC",
  TELEHEALTH_SIGNALS_READ: "Đọc tín hiệu WebRTC",
  // M06 & Hệ thống
  NOTIFICATION_SENT: "Gửi email thông báo thành công",
  NOTIFICATION_SKIPPED: "Bỏ qua thông báo lỗi thời",
  NOTIFICATION_RETRY: "Xếp lịch thử lại email thông báo",
  NOTIFICATION_FAILED: "Gửi email thông báo thất bại",
  COMMAND_REPLAYED: "Phát lại yêu cầu trùng khóa",
  // M07 — Kiểm toán
  AUDIT_SEARCH: "Tra cứu nhật ký kiểm toán",
  AUDIT_EXPORT: "Xuất biên bản kiểm toán CSV",
  AUDIT_INTEGRITY_VERIFIED: "Kiểm chứng toàn vẹn chuỗi kiểm toán",
  AUDIT_ARCHIVE_CREATED: "Niêm phong lô lưu trữ kiểm toán",
};

const ACCOUNT_REASON_VI: Record<string, string> = {
  SECURITY_REVIEW: "Rà soát bảo mật",
  POLICY_REVIEW: "Rà soát quy định",
  PATIENT_REQUEST: "Yêu cầu bệnh nhân",
};

export const AUDIT_RESULT_LABEL: Record<string, string> = {
  SUCCESS: "Thành công",
  DENIED: "Bị từ chối",
  FAILURE: "Thất bại",
};

export const AUDIT_RESULT_TONE: Record<string, Tone> = {
  SUCCESS: "ok",
  DENIED: "wait",
  FAILURE: "bad",
};

export const AUDIT_CATEGORY_OPTIONS: { id: AuditActionCategory; label: string }[] = [
  { id: "ACCESS_CONTROL", label: "Phân quyền & Tài khoản" },
  { id: "CLINICAL", label: "Lâm sàng (Bệnh án & Đơn)" },
  { id: "APPOINTMENT", label: "Lịch hẹn & Hàng đợi" },
  { id: "TELEHEALTH", label: "Khám từ xa WebRTC" },
  { id: "CATALOG", label: "Danh mục & Lịch làm việc" },
  { id: "NOTIFICATION", label: "Thông báo email" },
  { id: "AUDIT", label: "Hoạt động kiểm toán" },
];

export const AUDIT_READ_NOISE_ACTIONS = new Set([
  "PROFILE_READ",
  "AUDIT_SEARCH",
  "APPOINTMENT_LIST_READ",
  "APPOINTMENT_READ",
  "QUEUE_READ",
  "USERS_READ",
  "TELEHEALTH_READ",
  "TELEHEALTH_SIGNALS_READ",
  "TELEHEALTH_SIGNAL_SENT",
]);

export const AUDIT_HIGH_RISK_ACTIONS = new Set([
  "ROLES_CHANGED",
  "RECORD_AMENDED",
  "AUDIT_EXPORT",
  "AUDIT_ARCHIVE_CREATED",
  "STAFF_CREATED",
  "STAFF_UPDATED",
]);

export function isHighRiskAuditAction(action: string, result?: string): boolean {
  if (result === "DENIED" || result === "FAILURE") return true;
  if (AUDIT_HIGH_RISK_ACTIONS.has(action)) return true;
  return action.startsWith("PATIENT_ACCOUNT_LOCKED_") || action.startsWith("PATIENT_ACCOUNT_UNLOCKED_");
}

export function auditActionLabel(action: string, result?: string): string {
  if (!action) return "—";
  if (action === "TELEHEALTH_JOINED" && result === "DENIED") {
    return "Từ chối tham gia phòng khám từ xa";
  }
  const exact = AUDIT_ACTION_LABELS[action];
  if (exact) return exact;
  if (action === "PRESCRIPTION_LIST_READ") return "Xem lịch sử đơn thuốc bệnh nhân";
  if (action === "RECORD_LIST_READ") return "Xem lịch sử bệnh án bệnh nhân";
  if (action === "RECORD_SAVED") return "Lưu bản nháp bệnh án";
  if (action === "RECORD_FINALIZED") return "Hoàn tất hồ sơ bệnh án";
  if (action === "PRESCRIPTION_SAVED") return "Tạo đơn thuốc nháp";
  if (action.startsWith("PATIENT_ACCOUNT_LOCKED_")) {
    const reason = action.slice("PATIENT_ACCOUNT_LOCKED_".length);
    return `Khóa tài khoản bệnh nhân (${ACCOUNT_REASON_VI[reason] ?? reason})`;
  }
  if (action.startsWith("PATIENT_ACCOUNT_UNLOCKED_")) {
    const reason = action.slice("PATIENT_ACCOUNT_UNLOCKED_".length);
    return `Mở khóa tài khoản bệnh nhân (${ACCOUNT_REASON_VI[reason] ?? reason})`;
  }
  return action;
}

/** Cách 1: rút gọn UUID 36 ký tự (4 đầu…8 cuối) để không vỡ cột bảng; giữ full UUID cho Modal/Copy/API/Export. */
export function formatCompactId(id: string | null | undefined): string {
  if (!id) return "—";
  const trimmed = id.trim();
  if (UUID_RE.test(trimmed)) {
    return `${trimmed.slice(0, 4)}…${trimmed.slice(-8)}`;
  }
  if (trimmed.length > 22) {
    return `${trimmed.slice(0, 10)}…${trimmed.slice(-8)}`;
  }
  return trimmed;
}

export function auditResourceContext(action: string, resourceId: string, actorId: string | null): string {
  if (actorId && resourceId === actorId) return "Chính mình";
  if (resourceId === "clinic-hours") return "Giờ phòng khám";
  if (action === "AUDIT_EXPORT") return "Biên bản CSV";
  if (action === "AUDIT_INTEGRITY_VERIFIED") return "Chuỗi kiểm toán";
  if (action === "AUDIT_ARCHIVE_CREATED") return "Lô lưu trữ";
  if (action.startsWith("APPOINTMENT_")) return "Lịch hẹn";
  if (action.startsWith("QUEUE_")) return action === "QUEUE_READ" ? "Bác sĩ" : "Phiếu chờ";
  if (action === "PATIENT_RECORDS_READ" || action === "PATIENT_PRESCRIPTIONS_READ" || action === "PRESCRIPTION_LIST_READ") {
    return "Bệnh nhân";
  }
  if (action.startsWith("RECORD_")) return "Bệnh án";
  if (action === "ENCOUNTER_PRESCRIPTIONS_READ") return "Ca khám";
  if (action.startsWith("PRESCRIPTION_")) return "Đơn thuốc";
  if (action.startsWith("TELEHEALTH_")) return "Phòng từ xa";
  if (action.startsWith("DOCTOR_")) return "Bác sĩ";
  if (action.startsWith("SPECIALTY_")) return "Chuyên khoa";
  if (action.startsWith("AVAILABILITY_")) return "Ca làm việc";
  if (action.startsWith("TIME_OFF_")) return "Lịch nghỉ BS";
  if (action.startsWith("CLINIC_HOLIDAY_")) return "Ngày lễ";
  if (action.startsWith("NOTIFICATION_")) return "Thông báo";
  if (action === "COMMAND_REPLAYED") return "Thao tác lặp";
  if (action === "CONTACT_OTP_SENT" || action === "CONTACT_UPDATED") return "Liên hệ";
  if (
    action === "ROLES_CHANGED" ||
    action.startsWith("STAFF_") ||
    action.startsWith("PATIENT_ACCOUNT_") ||
    action === "ACCOUNT_REGISTERED"
  ) {
    return "Tài khoản";
  }
  return "Đối tượng";
}

function stripDiacritics(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/** Khớp từ khóa tiếng Việt (không phân biệt dấu) hoặc mã hành động sang danh sách mã hành động chuẩn. */
export function matchAuditActionCodes(raw: string): string[] {
  const needle = stripDiacritics(raw.trim());
  if (!needle) return [];
  const matched: string[] = [];
  for (const [code, vi] of Object.entries(AUDIT_ACTION_LABELS)) {
    if (stripDiacritics(vi).includes(needle) || code.toLowerCase().includes(needle)) {
      matched.push(code);
    } else if (
      code === "TELEHEALTH_JOINED" &&
      stripDiacritics("Từ chối tham gia phòng khám từ xa").includes(needle)
    ) {
      matched.push(code);
    }
  }
  return matched;
}

/** Cho phép nhập nhãn tiếng Việt hoặc mã hành động chuẩn, ánh xạ sang tham số `action` gửi backend. */
export function resolveAuditActionFilter(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (/^[A-Z0-9_*]+$/.test(upper)) return upper;

  // Hỗ trợ chuỗi dạng "Chỉnh sửa bổ sung bệnh án (RECORD_AMENDED)" từ datalist
  const parenCode = /\(([A-Z0-9_]+)\)\s*$/.exec(trimmed);
  if (parenCode) return parenCode[1];

  const needle = stripDiacritics(trimmed);
  const matches = Object.entries(AUDIT_ACTION_LABELS).filter(
    ([code, vi]) => stripDiacritics(vi).includes(needle) || code.toLowerCase().includes(needle),
  );
  if (matches.length === 1) return matches[0][0];
  if (matches.length > 1) {
    const exact = matches.find(([, vi]) => stripDiacritics(vi) === needle);
    if (exact) return exact[0];
  }
  // Giữ nguyên từ khóa tiếng Việt (VD: "bệnh án", "đơn thuốc", "khóa tài khoản") để backend giải mã đủ mọi mã hành động khớp.
  return trimmed;
}

export const INTEGRITY_STATUS_LABEL: Record<string, { label: string; tone: Tone }> = {
  VERIFIED: { label: "Chuỗi băm nguyên vẹn", tone: "ok" },
  LEGACY_ONLY: { label: "Chỉ có dữ liệu trước chuỗi băm", tone: "info" },
  TAMPERED: { label: "Phát hiện dấu hiệu bất thường", tone: "bad" },
};

export const INTEGRITY_REASON_VI: Record<string, string> = {
  SEQUENCE_GAP: "Thiếu số thứ tự trong chuỗi (nghi ngờ xóa bản ghi ở giữa hoặc đầu chuỗi).",
  PREV_HASH_MISMATCH: "Liên kết prev_hash không khớp bản ghi liền trước.",
  HASH_MISMATCH: "Mã băm HMAC-SHA256 không khớp nội dung bản ghi (nghi ngờ bị chỉnh sửa trái phép).",
  HEAD_MISMATCH: "Đỉnh chuỗi audit_chain_head không khớp bản ghi cuối cùng (nghi ngờ cắt đuôi nhật ký).",
};

export const DELETION_POLICY_VI: Record<string, string> = {
  APPEND_ONLY_NO_APP_DELETE: "Chỉ ghi nối tiếp — ứng dụng tuyệt đối không xóa bản ghi audit_event (khóa bằng trigger CSDL).",
};
