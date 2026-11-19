// Cơ sở dữ liệu trong bộ nhớ cho chế độ giả lập (chỉ nạp khi VITE_MOCK=true).
import { addDays, localToIso, todayKey } from "@/core/datetime";
import type { NoShowReason, NotificationJob, Role } from "@/core/types";
import { DEFAULT_CLINIC_HOURS, type ClinicDayHours } from "@/core/clinic-hours";

export interface MUser { id: string; name: string; email: string; roles: Role[]; active: boolean; username?: string; staff?: boolean; subject?: string }
export interface MDoctor { id: string; userId: string; active: boolean; specialtyIds: string[] }
export interface MSpecialty { id: string; name: string; active: boolean }
export interface MAvail { id: string; doctorId: string; startAt: string; endAt: string; slotMinutes: number; mode: string }
export interface MTimeOff { id: string; doctorId: string; startAt: string; endAt: string }
export interface MSlot { id: string; availabilityId: string; doctorId: string; startAt: string; endAt: string; mode: string }
export interface MAppt {
  id: string; patientId: string; doctorId: string; slotId: string; startAt: string; endAt: string;
  mode: string; status: string; version: number; cancellationReason: string | null; encounterId: string | null;
  noShowReason?: NoShowReason | null;
}
export interface MTicket { id: string; appointmentId: string; doctorId: string; patientId: string; position: number; status: string; version?:number; checkedInAt: string; day: string }
export interface MRecord {
  id: string; encounterId: string; appointmentId: string; patientId: string; doctorId: string; version: number;
  status: string; content: string; createdAt: string; updatedAt: string; supersedesId: string | null; amendmentReason: string | null;
}
export interface MRx { id: string; encounterId: string; patientId: string; doctorId: string; status: string; version: number; items: unknown[]; issuedAt?: string }
export interface MSession { id: string; appointmentId: string; status: string; version: number; patientAdmitted: boolean }
export interface MAudit { id: string; actorId: string | null; action: string; resourceId: string; createdAt: string; result: string; correlationId: string }
export interface MNotif extends NotificationJob { sendAt: number }

export interface MHoliday { id: string; startDate: string; endDate: string; name: string; closed: boolean; opensAt: string | null; closesAt: string | null }

export interface DB {
  clinicHours: ClinicDayHours[];
  clinicHolidays: MHoliday[];
  users: MUser[]; doctors: MDoctor[]; specialties: MSpecialty[]; avail: MAvail[]; timeoff: MTimeOff[]; slots: MSlot[];
  appts: MAppt[]; tickets: MTicket[]; records: MRecord[]; rx: MRx[]; sessions: MSession[]; audit: MAudit[]; notifs: MNotif[];
  idem: Record<string, { hash: string; status: number; body: unknown }>;
}

// New demo dataset; preserve the old v2 entry rather than overwriting users' old mock data.
const KEY = "clinic_mock_db_v3";
let uid = 1000;
export const mid = () => {
  const n = (++uid).toString(16).padStart(12, "0");
  return `a${Math.random().toString(16).slice(2, 9).padEnd(7, "0")}-0000-4000-8000-${n}`.slice(0, 36);
};
const U = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const demoUsernames = new Map(
  ["admin", "doctor", "patient", "patient2", "receptionist", "auditor", "doctor2"]
    .map((username, index) => [U(index + 1), username]),
);
export const mockUsername = (user: MUser) => user.username ?? demoUsernames.get(user.id) ?? null;
export const SP1 = "10000000-0000-0000-0000-000000000001";
export const SP2 = "10000000-0000-0000-0000-000000000002";
export const D1 = "20000000-0000-0000-0000-000000000001";
export const D2 = "20000000-0000-0000-0000-000000000002";

export function genSlots(a: MAvail): MSlot[] {
  const out: MSlot[] = [];
  const end = Date.parse(a.endAt);
  for (let t = Date.parse(a.startAt); t + a.slotMinutes * 60000 <= end; t += a.slotMinutes * 60000)
    out.push({ id: mid(), availabilityId: a.id, doctorId: a.doctorId, startAt: new Date(t).toISOString(), endAt: new Date(t + a.slotMinutes * 60000).toISOString(), mode: a.mode });
  return out;
}

function seed(): DB {
  const db: DB = {
    clinicHours: DEFAULT_CLINIC_HOURS.map(day => ({ ...day })),
    clinicHolidays: [],
    users: [
      { id: U(1), name: "Trần Quản Trị", email: "admin@example.test", roles: ["ADMINISTRATOR"], active: true },
      { id: U(2), name: "Nguyễn Minh Khoa", email: "doctor@example.test", roles: ["DOCTOR"], active: true },
      { id: U(3), name: "Lê Thu Hà", email: "patient@example.test", roles: ["PATIENT"], active: true },
      { id: U(4), name: "Võ Minh Trí", email: "patient2@example.test", roles: ["PATIENT"], active: true },
      { id: U(5), name: "Phạm Lan Anh", email: "receptionist@example.test", roles: ["RECEPTIONIST"], active: true },
      { id: U(6), name: "Đặng Kiểm Toán", email: "auditor@example.test", roles: ["AUDITOR"], active: true },
      { id: U(7), name: "Hoàng Gia Bảo", email: "doctor2@example.test", roles: ["DOCTOR"], active: true },
    ],
    doctors: [
      { id: D1, userId: U(2), active: true, specialtyIds: [SP1] },
      { id: D2, userId: U(7), active: true, specialtyIds: [SP2] },
    ],
    specialties: [
      { id: SP1, name: "General practice", active: true },
      { id: SP2, name: "Nội tổng quát", active: true },
    ],
    avail: [], timeoff: [], slots: [], appts: [], tickets: [], records: [], rx: [], sessions: [], audit: [], notifs: [], idem: {},
  };
  const today = todayKey();
  const addAv = (doctorId: string, day: string, from: string, to: string, mode: string, mins = 20) => {
    const a: MAvail = { id: mid(), doctorId, startAt: localToIso(day, from), endAt: localToIso(day, to), slotMinutes: mins, mode };
    db.avail.push(a);
    db.slots.push(...genSlots(a));
  };
  for (let i = 0; i <= 7; i++) {
    const day = addDays(today, i);
    if (new Date(`${day}T12:00:00Z`).getUTCDay() === 0) continue;
    addAv(D1, day, "08:00", "12:00", "IN_PERSON");
    addAv(D2, day, "08:00", "16:00", "IN_PERSON", 30);
    addAv(D1, day, "13:00", "17:00", "REMOTE");
  }
  const mk = (patient: string, doctor: string, startAt: string, mode: string, status: string, extra: Partial<MAppt> = {}) => {
    const slot = db.slots.find((s) => s.doctorId === doctor && s.startAt === startAt && s.mode === mode);
    const a: MAppt = {
      id: mid(), patientId: patient, doctorId: doctor, slotId: slot?.id ?? mid(), startAt,
      endAt: slot?.endAt ?? new Date(Date.parse(startAt) + 20 * 60000).toISOString(), mode, status, version: 0,
      cancellationReason: null, encounterId: null, ...extra,
    };
    db.appts.push(a);
    return a;
  };
  const now = Date.now();
  // slot gần nhất theo bội 20 phút
  const snap = (offsetMin: number) => {
    const t = Math.round((now + offsetMin * 60000) / (20 * 60000)) * 20 * 60000;
    return new Date(t).toISOString();
  };
  const hasSlot = (doctor: string, startAt: string, mode: string) => db.slots.some((s) => s.doctorId === doctor && s.startAt === startAt && s.mode === mode);
  // Lịch sử: hoàn tất (hồ sơ FINAL + đơn thuốc đã phát hành) — dùng slot giả quá khứ
  const pastStart = new Date(now - 7 * 86400000).toISOString();
  const done = mk(U(3), D1, pastStart, "IN_PERSON", "COMPLETED", { version: 4, encounterId: mid() });
  db.records.push({ id: mid(), encounterId: done.encounterId!, appointmentId: done.id, patientId: U(3), doctorId: D1, version: 2, status: "FINAL", createdAt: pastStart, updatedAt: pastStart, supersedesId: null, amendmentReason: null,
    content: JSON.stringify({ v: 1, symptoms: "Ho khan, sổ mũi 3 ngày, không sốt.", diagnosis: "Viêm mũi họng cấp", plan: "Nghỉ ngơi, uống đủ nước, tái khám nếu sốt trên 38.5°C.", notes: "", vitals: { bloodPressure: "120/80", heartRate: "78", temperature: "36.8", weight: "54", height: "160" } }) });
  db.rx.push({ id: mid(), encounterId: done.encounterId!, patientId: U(3), doctorId: D1, status: "ISSUED", version: 2, issuedAt: pastStart,
    items: [{ medicineName: "Paracetamol 500mg", doseText: "1 viên", route: "Uống", frequency: "Khi sốt, cách nhau ≥ 6 giờ", durationText: "3 ngày" }] });
  mk(U(4), D1, new Date(now - 3 * 86400000).toISOString(), "IN_PERSON", "CANCELLED", { version: 1, cancellationReason: "Bận việc đột xuất" });
  // Hôm nay
  const s1 = snap(-5);
  if (hasSlot(D1, s1, "IN_PERSON")) {
    const a = mk(U(3), D1, s1, "IN_PERSON", "CHECKED_IN", { version: 1 });
    db.tickets.push({ id: mid(), appointmentId: a.id, doctorId: D1, patientId: U(3), position: 1, status: "WAITING", checkedInAt: new Date(now - 4 * 60000).toISOString(), day: today });
  }
  const s2 = snap(20);
  if (hasSlot(D1, s2, "IN_PERSON") && s2 !== s1) mk(U(4), D1, s2, "IN_PERSON", "CONFIRMED");
  const s3 = snap(60);
  if (hasSlot(D2, s3, "IN_PERSON")) mk(U(3), D2, s3, "IN_PERSON", "CONFIRMED");
  // Từ xa trong cửa sổ tham gia
  const r = snap(5);
  const rs = db.slots.find((s) => s.doctorId === D1 && s.mode === "REMOTE" && Date.parse(s.startAt) > now + 86400000);
  mk(U(3), D1, rs?.startAt ?? r, "REMOTE", "CONFIRMED");
  const rt = { id: mid(), doctorId: D1, startAt: new Date(Math.round(now / 1800000) * 1800000).toISOString(), endAt: new Date(Math.round(now / 1800000) * 1800000 + 1800000).toISOString(), mode: "REMOTE" };
  db.slots.push({ ...rt, availabilityId: db.avail[0].id });
  mk(U(4), D1, rt.startAt, "REMOTE", "CONFIRMED", { slotId: rt.id, endAt: rt.endAt });
  db.audit.push(
    { id: mid(), actorId: U(1), action: "DOCTOR_CREATED", resourceId: D1, createdAt: new Date(now - 86400000).toISOString(), result: "SUCCESS", correlationId: mid() },
    { id: mid(), actorId: U(3), action: "APPOINTMENT_BOOKED", resourceId: done.id, createdAt: new Date(now - 8 * 86400000).toISOString(), result: "SUCCESS", correlationId: mid() },
  );
  db.notifs.push({ id: mid(), appointmentId: done.id, eventType: "BOOKED", status: "SENT", attempts: 1, lastError: null, dueAt: new Date(now - 8 * 86400000).toISOString(), sendAt: 0 });
  return db;
}

let db: DB | null = null;
export function getDb(): DB {
  if (db) return db;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as DB;
      db = { ...saved, clinicHours: saved.clinicHours ?? DEFAULT_CLINIC_HOURS };
      return db;
    }
  } catch { /* ignore */ }
  db = seed();
  persist();
  return db;
}
export function persist() {
  try { if (db) sessionStorage.setItem(KEY, JSON.stringify(db)); } catch { /* ignore */ }
}
export function resetDb() {
  db = null;
  try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
  getDb();
}
