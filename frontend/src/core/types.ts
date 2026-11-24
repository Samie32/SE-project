// Kiểu dữ liệu dùng chung. Khớp backend thực thi (docs/api/openapi.json) —
// IN_PERSON/REMOTE, ADMINISTRATOR, camelCase, thời điểm ISO-8601 UTC.
// Phần chưa có backend bám theo hợp đồng thiết kế (docs/api/openapi.yaml).

export type Role = "PATIENT" | "DOCTOR" | "RECEPTIONIST" | "ADMINISTRATOR" | "AUDITOR";
export const ALL_ROLES: Role[] = ["PATIENT", "DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR"];

/** GET /api/me/profile; không suy patientId/doctorId từ user ID. */
export interface Identity {
  id: string;
  username?: string | null;
  roles: Role[];
  doctorId?: string | null;
  patientId?: string | null;
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  hometown?: string | null;
  permanentAddress?: string | null;
  personalInfoUpdatedAt?: string | null;
  personalInfoNextEditAt?: string | null;
  active?: boolean | number;
  attributes?: Record<string, unknown> | null;
  [extra: string]: unknown;
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

export type NoShowReason = "PATIENT_ABSENT" | "COULD_NOT_CONTACT" | "TECHNICAL_ISSUE" | "OTHER";

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
  noShowReason?: NoShowReason | null;
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
  appointmentVersion?: number;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  dueAt: string;
  estimatedStartAt?: string | null;
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
  startAt?: string;
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

export type AuditActionCategory =
  | "ACCESS_CONTROL"
  | "CLINICAL"
  | "APPOINTMENT"
  | "TELEHEALTH"
  | "CATALOG"
  | "NOTIFICATION"
  | "AUDIT";

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
  chainSeq?: number | null;
  prevHash?: string | null;
  eventHash?: string | null;
}

export interface AuditFilterParams {
  actorId?: string;
  resourceId?: string;
  from?: string;
  to?: string;
  result?: string;
  action?: string;
  category?: AuditActionCategory | "";
  actorType?: "USER" | "SYSTEM" | "";
  correlationId?: string;
  excludeReadNoise?: boolean;
}

export interface AuditQuery extends AuditFilterParams {
  limit: number;
  offset?: number;
  cursorCreatedAt?: string;
  cursorId?: string;
}

export interface AuditSummary {
  totalEvents: number;
  deniedEvents: number;
  failureEvents: number;
  accessControlEvents: number;
  recordAmendedEvents: number;
  systemEvents: number;
  chainedEvents: number;
  legacyUnchainedEvents: number;
  latestEventAt: string | null;
}

export interface AuditExportResponse {
  filename: string;
  contentType: string;
  exportedAt: string;
  rowCount: number;
  maxRows: number;
  truncated: boolean;
  contentSha256: string;
  csv: string;
}

export interface AuditIntegrityReport {
  status: "VERIFIED" | "TAMPERED" | "LEGACY_ONLY";
  algorithm: string;
  verifiedAt: string;
  checkedCount: number;
  totalChainedCount: number;
  legacyUnchainedCount: number;
  truncated: boolean;
  headSeq: number;
  headHash: string;
  firstBrokenSeq: number | null;
  firstBrokenEventId: string | null;
  mismatchReason: string | null;
}

export interface AuditArchiveBatch {
  id: string;
  fromCreatedAt: string;
  toCreatedAt: string;
  eventCount: number;
  firstChainSeq: number | null;
  lastChainSeq: number | null;
  batchHash: string;
  retentionDays: number;
  createdBy: string | null;
  createdAt: string;
  notes: string | null;
}

export interface AuditRetentionStatus {
  hotRetentionDays: number;
  archiveRetentionDays: number;
  exportMaxRows: number;
  deletionPolicy: string;
  totalEvents: number;
  oldestEventAt: string | null;
  newestEventAt: string | null;
  eligibleForArchiveCount: number;
  archiveCutoffAt: string;
  archiveBatchCount: number;
  recentBatches: AuditArchiveBatch[];
}
