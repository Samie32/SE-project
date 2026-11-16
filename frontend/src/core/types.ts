// Kiểu dữ liệu dùng chung. Khớp backend thực thi (docs/api/openapi.json) —
// IN_PERSON/REMOTE, ADMINISTRATOR, camelCase, thời điểm ISO-8601 UTC.
// Phần chưa có backend bám theo hợp đồng thiết kế (docs/api/openapi.yaml).

export type Role = "PATIENT" | "DOCTOR" | "RECEPTIONIST" | "ADMINISTRATOR" | "AUDITOR";
export const ALL_ROLES: Role[] = ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR"];

/** GET /api/me/profile; không suy patientId/doctorId từ user ID. */
export interface Identity {
  id: string;
  roles: Role[];
  doctorId?: string | null;
  patientId?: string | null;
  displayName?: string;
  active?: boolean | number;
}

export interface Specialty {
  id: string;
  name: string;
  active: boolean;
}

/** Một dòng GET /api/doctors: bác sĩ lặp theo từng chuyên khoa. */
export interface DoctorRow {
  id: string;
  active: boolean | number | string;
  displayName: string;
  specialtyId: string;
  userId?: string;
}
export interface Doctor {
  id: string;
  displayName: string;
  active: boolean;
  specialtyIds: string[];
  userId?: string;
}
export interface DoctorUpdateInput {
  active: boolean;
  displayName: string;
  specialtyIds: string[];
}

export type AppointmentMode = "IN_PERSON" | "REMOTE";
export type AppointmentStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  slotId: string;
  startAt: string;
  endAt: string;
  mode: AppointmentMode;
  status: AppointmentStatus;
  version: number;
  cancellationReason?: string | null;
  /** Có sau khi bắt đầu khám (hợp đồng thiết kế). */
  encounterId?: string | null;
}

export interface Slot {
  id: string;
  doctorId: string;
  availabilityId?: string;
  startAt: string;
  endAt: string;
  mode: AppointmentMode;
}

export interface Availability {
  id: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  slotMinutes: number;
  mode: AppointmentMode;
}
export interface AvailabilityInput {
  startAt: string;
  endAt: string;
  slotMinutes: number;
  mode: AppointmentMode;
}
export interface TimeOff {
  id: string;
  doctorId: string;
  startAt: string;
  endAt: string;
}

export interface NotificationJob {
  id: string;
  appointmentId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  dueAt: string;
}

// ---------- Hợp đồng tích hợp 1.0.0 ----------

export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "DONE";
export interface QueueTicket {
  id: string;
  appointmentId: string;
  position: number;
  status: QueueStatus;
  version: number;
  createdAt: string;
  queueDate: string;
  skipReason?: string | null;
  // Đề xuất mở rộng cho endpoint liệt kê hàng đợi:
  doctorId?: string;
  patientId?: string;
}

export type RecordStatus = "DRAFT" | "FINAL";
export interface MedicalRecord {
  id: string;
  encounterId: string;
  version: number;
  status: RecordStatus;
  /** Chuỗi bất biến phía backend; frontend lưu JSON {@link RecordContent}. */
  content: string;
  // Tùy chọn nếu backend trả thêm:
  appointmentId?: string;
  doctorId?: string;
  createdAt?: string;
  updatedAt?: string;
  supersedesId?: string | null;
  amendmentReason?: string | null;
}

export interface PrescriptionItem {
  medicineName: string;
  doseText: string;
  route: string;
  frequency: string;
  durationText: string;
}
export type PrescriptionStatus = "DRAFT" | "ISSUED";
export interface Prescription {
  id: string;
  encounterId: string;
  status: PrescriptionStatus;
  version: number;
  items: PrescriptionItem[];
  issuedAt?: string;
}

export type SessionStatus =
  | "CREATED"
  | "WAITING"
  | "ACTIVE"
  | "RECONNECTING"
  | "ENDED"
  | "CANCELLED";
export interface TelehealthSession {
  id: string;
  appointmentId: string;
  status: SessionStatus;
  version: number;
}
export interface JoinToken {
  sessionId: string;
  token: string;
  expiresAt: string;
  signalingUrl: string;
}

export interface SignalMessage {
  id: number;
  kind: "OFFER" | "ANSWER" | "ICE";
  payload: string;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  resourceId: string;
  createdAt: string;
  actorType?: "USER" | "SYSTEM";
  actorLabel?: string | null;
  result: string;
  correlationId: string;
}
export interface AuditQuery {
  limit: number;
  offset: number;
  actorId?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}
