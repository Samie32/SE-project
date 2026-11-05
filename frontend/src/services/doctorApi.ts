import type {
  Doctor,
  Availability,
  AvailabilityInput,
  TimeOff,
  TimeOffInput,
  Appointment,
  AppointmentStatus,
  QueueTicket,
  MedicalRecord,
  Prescription,
  PrescriptionItem,
  PatientHistoryItem,
  TelehealthSession,
} from '../types/doctor.ts';
import {
  CURRENT_DOCTOR,
  INITIAL_AVAILABILITIES,
  INITIAL_TIMEOFFS,
  INITIAL_APPOINTMENTS,
  INITIAL_QUEUES,
  SAMPLE_PATIENT_HISTORY,
  SAMPLE_RECORD,
  SAMPLE_PRESCRIPTION,
} from './mockData.ts';

const STORAGE_KEYS = {
  AVAILABILITIES: 'clinic_doctor_availabilities',
  TIMEOFFS: 'clinic_doctor_timeoffs',
  APPOINTMENTS: 'clinic_doctor_appointments',
  QUEUES: 'clinic_doctor_queues',
  RECORDS: 'clinic_doctor_records',
  PRESCRIPTIONS: 'clinic_doctor_prescriptions',
};

// Helper for local storage persistence
function getStorage<T>(key: string, initial: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initial;
  } catch {
    return initial;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

// Check if running in mock mode
const isMockForced = localStorage.getItem('clinic_use_mock');
const USE_MOCK = isMockForced !== null ? isMockForced === 'true' : (import.meta.env.VITE_USE_MOCK !== 'false');
const API_BASE = '/api';

function getHeaders(customHeaders: Record<string, string> = {}): HeadersInit {
  const token = localStorage.getItem('clinic_access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const doctorApi = {
  // Current doctor info
  getProfile: async (): Promise<Doctor> => {
    return CURRENT_DOCTOR;
  },

  // 1. Availability / Schedule (FR-05, UC-05)
  getAvailabilities: async (doctorId: string): Promise<Availability[]> => {
    if (USE_MOCK) {
      return getStorage<Availability[]>(STORAGE_KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES)
        .filter((a) => a.doctorId === doctorId);
    }
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createAvailability: async (doctorId: string, input: AvailabilityInput): Promise<Availability> => {
    if (USE_MOCK) {
      const list = getStorage<Availability[]>(STORAGE_KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES);
      const newAv: Availability = {
        id: `av-${Date.now()}`,
        doctorId,
        ...input,
      };
      const updated = [newAv, ...list];
      setStorage(STORAGE_KEYS.AVAILABILITIES, updated);
      return newAv;
    }
    const payload = {
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
      slotMinutes: input.slotMinutes,
      mode: input.mode === 'TELEHEALTH' ? 'REMOTE' : input.mode,
    };
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/availability`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  deleteAvailability: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      const list = getStorage<Availability[]>(STORAGE_KEYS.AVAILABILITIES, INITIAL_AVAILABILITIES);
      setStorage(STORAGE_KEYS.AVAILABILITIES, list.filter((a) => a.id !== id));
      return;
    }
    await fetch(`${API_BASE}/availability/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // 2. Time-Off / Leave (FR-06, UC-06)
  getTimeOffs: async (doctorId: string): Promise<TimeOff[]> => {
    if (USE_MOCK) {
      return getStorage<TimeOff[]>(STORAGE_KEYS.TIMEOFFS, INITIAL_TIMEOFFS)
        .filter((t) => t.doctorId === doctorId);
    }
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/time-off`, {
      headers: getHeaders(),
    });
    return res.json();
  },

  createTimeOff: async (doctorId: string, input: TimeOffInput): Promise<TimeOff> => {
    if (USE_MOCK) {
      const list = getStorage<TimeOff[]>(STORAGE_KEYS.TIMEOFFS, INITIAL_TIMEOFFS);
      const newTo: TimeOff = {
        id: `to-${Date.now()}`,
        doctorId,
        ...input,
        affectedAppointmentsCount: 0,
      };
      const updated = [newTo, ...list];
      setStorage(STORAGE_KEYS.TIMEOFFS, updated);
      return newTo;
    }
    const payload = {
      startAt: new Date(input.startAt).toISOString(),
      endAt: new Date(input.endAt).toISOString(),
    };
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/time-off`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  deleteTimeOff: async (id: string): Promise<void> => {
    if (USE_MOCK) {
      const list = getStorage<TimeOff[]>(STORAGE_KEYS.TIMEOFFS, INITIAL_TIMEOFFS);
      setStorage(STORAGE_KEYS.TIMEOFFS, list.filter((t) => t.id !== id));
      return;
    }
    await fetch(`${API_BASE}/time-off/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
  },

  // 3. Doctor Appointments (UC-09, UC-11)
  getAppointments: async (doctorId: string, status?: AppointmentStatus): Promise<Appointment[]> => {
    if (USE_MOCK) {
      const list = getStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
      return list.filter((a) => a.doctorId === doctorId && (!status || a.status === status));
    }
    const res = await fetch(`${API_BASE}/appointments?limit=50&offset=0`, {
      headers: getHeaders(),
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  updateAppointmentStatus: async (appointmentId: string, status: AppointmentStatus): Promise<Appointment> => {
    if (USE_MOCK) {
      const list = getStorage<Appointment[]>(STORAGE_KEYS.APPOINTMENTS, INITIAL_APPOINTMENTS);
      let updatedApp: Appointment | undefined;
      const updatedList = list.map((a) => {
        if (a.id === appointmentId) {
          updatedApp = { ...a, status };
          return updatedApp;
        }
        return a;
      });
      setStorage(STORAGE_KEYS.APPOINTMENTS, updatedList);
      if (!updatedApp) throw new Error('Appointment not found');
      return updatedApp;
    }
    const res = await fetch(`${API_BASE}/appointments/${appointmentId}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    return res.json();
  },

  // 4. Queue Tickets (UC-20)
  getQueue: async (doctorId: string): Promise<QueueTicket[]> => {
    if (USE_MOCK) {
      return getStorage<QueueTicket[]>(STORAGE_KEYS.QUEUES, INITIAL_QUEUES)
        .filter((q) => q.doctorId === doctorId);
    }
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/queue`);
    return res.json();
  },

  callNextTicket: async (doctorId: string): Promise<QueueTicket | null> => {
    if (USE_MOCK) {
      const list = getStorage<QueueTicket[]>(STORAGE_KEYS.QUEUES, INITIAL_QUEUES);
      const waitingIndex = list.findIndex((q) => q.doctorId === doctorId && q.status === 'WAITING');
      if (waitingIndex === -1) return null;

      // Mark current in_service or called to completed/done if any
      const updated = list.map((q) => {
        if (q.status === 'CALLED' || q.status === 'IN_SERVICE') {
          return { ...q, status: 'DONE' as const };
        }
        return q;
      });

      const calledTicket = {
        ...updated[waitingIndex],
        status: 'CALLED' as const,
        calledAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      };
      updated[waitingIndex] = calledTicket;

      setStorage(STORAGE_KEYS.QUEUES, updated);
      return calledTicket;
    }
    const res = await fetch(`${API_BASE}/doctors/${doctorId}/queue/next`, { method: 'POST' });
    return res.json();
  },

  skipTicket: async (ticketId: string): Promise<void> => {
    if (USE_MOCK) {
      const list = getStorage<QueueTicket[]>(STORAGE_KEYS.QUEUES, INITIAL_QUEUES);
      const updated = list.map((q) => (q.id === ticketId ? { ...q, status: 'SKIPPED' as const } : q));
      setStorage(STORAGE_KEYS.QUEUES, updated);
      return;
    }
    await fetch(`${API_BASE}/queue-tickets/${ticketId}/skip`, { method: 'POST' });
  },

  // 5. Medical Records (UC-12, UC-13)
  getRecord: async (encounterId: string): Promise<MedicalRecord> => {
    if (USE_MOCK) {
      const records = getStorage<Record<string, MedicalRecord>>(STORAGE_KEYS.RECORDS, {
        'enc-01': SAMPLE_RECORD,
      });
      return (
        records[encounterId] || {
          ...SAMPLE_RECORD,
          encounterId,
          id: `rec-${Date.now()}`,
          version: 1,
          status: 'DRAFT',
        }
      );
    }
    const res = await fetch(`${API_BASE}/encounters/${encounterId}/record`);
    return res.json();
  },

  saveRecord: async (record: MedicalRecord, finalize = false): Promise<MedicalRecord> => {
    if (USE_MOCK) {
      const records = getStorage<Record<string, MedicalRecord>>(STORAGE_KEYS.RECORDS, {
        'enc-01': SAMPLE_RECORD,
      });
      const updated: MedicalRecord = {
        ...record,
        status: finalize ? 'FINAL' : 'DRAFT',
        version: record.version + 1,
        updatedAt: new Date().toISOString(),
      };
      records[record.encounterId] = updated;
      setStorage(STORAGE_KEYS.RECORDS, records);
      return updated;
    }
    const res = await fetch(`${API_BASE}/encounters/${record.encounterId}/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...record, finalize }),
    });
    return res.json();
  },

  // 6. Prescriptions (UC-14)
  getPrescription: async (encounterId: string): Promise<Prescription> => {
    if (USE_MOCK) {
      const prescriptions = getStorage<Record<string, Prescription>>(STORAGE_KEYS.PRESCRIPTIONS, {
        'enc-01': SAMPLE_PRESCRIPTION,
      });
      return (
        prescriptions[encounterId] || {
          ...SAMPLE_PRESCRIPTION,
          encounterId,
          id: `pres-${Date.now()}`,
          status: 'DRAFT',
          items: [],
        }
      );
    }
    const res = await fetch(`${API_BASE}/encounters/${encounterId}/prescriptions`);
    return res.json();
  },

  savePrescription: async (
    encounterId: string,
    items: PrescriptionItem[],
    notes?: string,
    issue = false
  ): Promise<Prescription> => {
    if (USE_MOCK) {
      const prescriptions = getStorage<Record<string, Prescription>>(STORAGE_KEYS.PRESCRIPTIONS, {
        'enc-01': SAMPLE_PRESCRIPTION,
      });
      const updated: Prescription = {
        id: prescriptions[encounterId]?.id || `pres-${Date.now()}`,
        encounterId,
        patientId: 'pat-101',
        doctorId: CURRENT_DOCTOR.id,
        items,
        notes,
        status: issue ? 'ISSUED' : 'DRAFT',
        issuedAt: issue ? new Date().toISOString() : undefined,
      };
      prescriptions[encounterId] = updated;
      setStorage(STORAGE_KEYS.PRESCRIPTIONS, prescriptions);
      return updated;
    }
    const res = await fetch(`${API_BASE}/encounters/${encounterId}/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, notes, issue }),
    });
    return res.json();
  },

  // 7. Patient History (UC-12 - audited read)
  getPatientHistory: async (patientId: string): Promise<PatientHistoryItem[]> => {
    if (USE_MOCK) {
      console.log(`[AUDIT READ] Doctor ${CURRENT_DOCTOR.id} accessed medical history of patient ${patientId}`);
      return SAMPLE_PATIENT_HISTORY;
    }
    const res = await fetch(`${API_BASE}/patients/${patientId}/records`);
    return res.json();
  },

  // 8. Telehealth (UC-22, UC-23, UC-24)
  getTelehealthSession: async (sessionId: string): Promise<TelehealthSession> => {
    return {
      id: sessionId,
      appointmentId: 'app-05',
      doctorId: CURRENT_DOCTOR.id,
      patientId: 'pat-105',
      status: 'ACTIVE',
      roomToken: 'mock-jwt-token-room-video-123',
      roomUrl: 'https://video.cliniccare.vn/room-105',
      startedAt: new Date().toISOString(),
    };
  },
};
