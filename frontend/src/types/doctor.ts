// Types defined based on docs/api/openapi.yaml & docs/design

export type ConsultationMode = 'IN_PERSON' | 'TELEHEALTH';

export type AppointmentStatus =
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type QueueStatus = 'WAITING' | 'CALLED' | 'IN_SERVICE' | 'SKIPPED' | 'DONE';

export type RecordStatus = 'DRAFT' | 'FINAL';

export type PrescriptionStatus = 'DRAFT' | 'ISSUED';

export type TelehealthStatus = 'PREPARED' | 'ACTIVE' | 'RECONNECTING' | 'ENDED' | 'CANCELLED';

export interface Doctor {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  specialtyId: string;
  specialtyName: string;
  roomNumber: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
}

export interface Availability {
  id: string;
  doctorId: string;
  startAt: string; // ISO date-time
  endAt: string;   // ISO date-time
  slotMinutes: number;
  mode: ConsultationMode;
  repeatWeekly?: boolean;
}

export interface AvailabilityInput {
  startAt: string;
  endAt: string;
  slotMinutes: number;
  mode: ConsultationMode;
  repeatWeekly?: boolean;
}

export interface TimeOff {
  id: string;
  doctorId: string;
  startAt: string;
  endAt: string;
  reason?: string;
  affectedAppointmentsCount?: number;
}

export interface TimeOffInput {
  startAt: string;
  endAt: string;
  reason?: string;
}

export interface Appointment {
  id: string;
  code: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientGender: 'MALE' | 'FEMALE' | 'OTHER';
  patientDob: string;
  doctorId: string;
  doctorName: string;
  scheduledAt: string;
  slotMinutes: number;
  mode: ConsultationMode;
  status: AppointmentStatus;
  reason: string;
  ticketNumber?: number;
  telehealthSessionId?: string;
}

export interface QueueTicket {
  id: string;
  ticketNumber: number;
  appointmentId: string;
  doctorId: string;
  patientName: string;
  patientPhone: string;
  status: QueueStatus;
  checkInTime: string;
  calledAt?: string;
}

export interface MedicalRecord {
  id: string;
  encounterId: string;
  appointmentId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  symptoms: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
  };
  treatmentPlan: string;
  notes?: string;
  status: RecordStatus;
  version: number;
  updatedAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicationName: string;
  strength: string; // e.g. 500mg
  dosage: string;   // e.g. 1 viên
  frequency: string; // e.g. 2 lần/ngày sau ăn
  durationDays: number;
  quantity: number;
  unit: string;     // e.g. viên, gói, chai
  instructions: string;
}

export interface Prescription {
  id: string;
  encounterId: string;
  patientId: string;
  doctorId: string;
  status: PrescriptionStatus;
  items: PrescriptionItem[];
  issuedAt?: string;
  notes?: string;
}

export interface PatientHistoryItem {
  encounterId: string;
  date: string;
  doctorName: string;
  specialtyName: string;
  diagnosis: string;
  recordStatus: RecordStatus;
  prescriptionSummary?: string;
}

export interface TelehealthSession {
  id: string;
  appointmentId: string;
  doctorId: string;
  patientId: string;
  status: TelehealthStatus;
  roomToken?: string;
  roomUrl?: string;
  startedAt?: string;
  endedAt?: string;
}
