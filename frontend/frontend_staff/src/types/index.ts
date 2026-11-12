export type Role =
  | "ADMINISTRATOR"
  | "RECEPTIONIST"
  | "AUDITOR"
  | "DOCTOR"
  | "PATIENT";

export const ALL_ROLES: Role[] = [
  "ADMINISTRATOR",
  "RECEPTIONIST",
  "AUDITOR",
  "DOCTOR",
  "PATIENT",
];
export const STAFF_ROLES: Role[] = ["ADMINISTRATOR", "RECEPTIONIST", "AUDITOR"];

/** GET /api/me → Access.Actor */
export interface Identity {
  id: string;
  roles: Role[];
}

/** GET /api/specialties (only active rows are returned by the backend) */
export interface Specialty {
  id: string;
  name: string;
  active: boolean;
}

/** One row of GET /api/doctors: a doctor appears once per specialty. */
export interface DoctorRow {
  id: string;
  active: boolean | number | string;
  displayName: string;
  specialtyId: string;
}

/** Doctor after grouping rows by id. */
export interface Doctor {
  id: string;
  displayName: string;
  active: boolean;
  specialtyIds: string[];
}

export interface DoctorUpdateInput {
  active: boolean;
  displayName: string;
  specialtyIds: string[];
}

export type AppointmentStatus =
  | "CONFIRMED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";
export type AppointmentMode = "IN_PERSON" | "REMOTE";

/** GET /api/appointments (raw table row; no patient name/phone is exposed). */
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
  cancellationReason: string | null;
}

export interface Availability {
  id: string;
  doctorId: string;
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

/** GET /api/notification-jobs */
export interface NotificationJob {
  id: string;
  appointmentId: string;
  eventType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  dueAt: string;
}

// ---- Contracts that the backend has NOT implemented yet (docs/api/openapi.yaml) ----

export type QueueStatus = "WAITING" | "CALLED" | "IN_SERVICE" | "DONE";

/** openapi.yaml QueueTicket (POST /appointments/{id}/check-in, /queue/next, /skip). */
export interface QueueTicket {
  id: string;
  appointmentId: string;
  position: number;
  status: QueueStatus;
  // Fields below are NOT in the design contract; the queue list endpoint
  // is a proposal the backend team must confirm.
  doctorId?: string;
  patientId?: string;
  checkedInAt?: string;
}

/** openapi.yaml Audit (GET /audit-events). */
export interface AuditEvent {
  id: string;
  actorId: string | null;
  action: string;
  resourceId: string;
  timestamp: string;
  result: string;
  correlationId: string;
  ipAddress?: string | null; // only shown if the backend provides it
}

export interface AuditQuery {
  limit: number;
  offset: number;
  actorId?: string;
  resourceId?: string;
  from?: string;
  to?: string;
}
