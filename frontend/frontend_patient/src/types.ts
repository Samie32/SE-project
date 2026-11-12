// ─── Domain types ────────────────────────────────────────────────────────────

export interface Specialty {
  id: string;
  name: string;
  active?: boolean;
}

export interface Doctor {
  id: string;
  userId?: string;
  displayName?: string;
  name?: string;
  specialtyId: string;
  specialtyName?: string;
  active?: boolean;
}

export interface Slot {
  id: string;
  startAt: string; // ISO-8601 UTC
  endAt: string; // ISO-8601 UTC
  doctorId: string;
  mode: "IN_PERSON" | "REMOTE";
  available?: boolean;
}

export type AppointmentStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "NO_SHOW";

export type AppointmentMode = "IN_PERSON" | "REMOTE";

export interface Appointment {
  id: string;
  patientId?: string;
  doctorId: string;
  doctorName?: string;
  specialtyId?: string;
  specialtyName?: string;
  slotId: string;
  startAt: string; // ISO-8601 UTC
  endAt: string; // ISO-8601 UTC
  mode: AppointmentMode;
  status: AppointmentStatus;
  version: number;
  cancellationReason?: string;
  cancelReason?: string;
}

export interface BookingPayload {
  slotId: string;
}

export interface ReschedulePayload {
  slotId: string;
  version: number;
}

export interface CancelPayload {
  reason: string;
  version: number;
}

export interface MedicalRecord {
  id: string;
  appointmentId: string;
  patientName: string;
  doctorName: string;
  symptoms: string;
  diagnosis: string;
  notes: string;
  status: "DRAFT" | "FINAL";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  dosage: string;
  quantity: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  appointmentId: string;
  items: PrescriptionItem[];
  status: "DRAFT" | "ISSUED";
  issuedAt?: string;
}

export interface UserProfile {
  id: string;
  username?: string;
  email?: string;
  roles: string[];
}
