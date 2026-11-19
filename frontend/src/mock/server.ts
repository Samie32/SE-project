// Backend giả lập: bám backend thật (Access, CatalogService, ScheduleService, AppointmentService)
// và hợp đồng thiết kế openapi.yaml cho các phần chưa có. CHỈ dùng cho `npm run dev:mock`.
import { canSendDelayNotice, dayKey, MIN } from "@/core/datetime";
import { NO_SHOW_REASON } from "@/core/labels";
import { scheduleIntervalError, slotDurationError } from "@/core/schedule-rules";
import { isValidClinicDay, type ClinicDayHours } from "@/core/clinic-hours";
import { ACCOUNT_UUID, PATIENT_ACCOUNT_REASONS } from "@/api/patient-accounts";
import { getDb, genSlots, mid, mockUsername, persist, type DB, type MAppt, type MNotif, type MTicket } from "./db";

class P extends Error { constructor(public status: number, public detail: string) { super(detail); } }
const need = (c: unknown, status: number, detail: string) => { if (!c) throw new P(status, detail); };
const res = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const prob = (e: P) => res(e.status, { type: "about:blank", title: "Error", status: e.status, detail: e.detail });

interface Actor { id: string; roles: string[] }
interface Ctx { db: DB; actor: Actor; body: any; query: URLSearchParams; params: string[]; headers: Headers; now: number }
const ACTIVE = ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

const req = (a: Actor, ...roles: string[]) => need(roles.some((r) => a.roles.includes(r)), 403, "Insufficient permission");
const audit = (db: DB, actor: string | null, action: string, resource: string, now: number, result = "SUCCESS") =>
  db.audit.push({ id: mid(), actorId: actor, action, resourceId: resource, createdAt: new Date(now).toISOString(), result, correlationId: mid() });
const isDoctorOf = (db: DB, a: Actor, doctorId: string) => {
  if (a.roles.includes("ADMINISTRATOR")) return true;
  req(a, "DOCTOR");
  return db.doctors.some((d) => d.id === doctorId && d.userId === a.id);
};
const myDoctorIds = (db: DB, a: Actor) => db.doctors.filter((d) => d.userId === a.id).map((d) => d.id);
const find = <T extends { id: string }>(list: T[], id: string) => { const x = list.find((i) => i.id === id); need(x, 404, "Resource not found"); return x as T; };
const overlap = (aS: string, aE: string, bS: string, bE: string) => Date.parse(aS) < Date.parse(bE) && Date.parse(aE) > Date.parse(bS);
const page = <T,>(list: T[], q: URLSearchParams, def = 20): T[] => {
  const limit = Number(q.get("limit") ?? def), offset = Number(q.get("offset") ?? 0);
  need(Number.isInteger(limit) && limit >= 1 && limit <= 100 && offset >= 0, 400, "Invalid pagination");
  return list.slice(offset, offset + limit);
};
const strip = (a: MAppt) => ({ ...a });
const outPatientAppointment = ({ noShowReason: _reason, ...appointment }: MAppt) => appointment;
const outNotification = ({ sendAt: _sendAt, ...job }: MNotif) => job;
const outTicket = (t: MTicket) => ({ id: t.id, appointmentId: t.appointmentId, position: t.position, status: t.status, doctorId: t.doctorId, patientId: t.patientId, createdAt: t.checkedInAt, queueDate:t.day, version:t.version ?? 0 });
const outRecord = (r: DB["records"][number]) => ({ ...r });
const outSession = (s: DB["sessions"][number]) => ({ id: s.id, appointmentId: s.appointmentId, status: s.status, version: s.version });
const user = (db: DB, id: string) => db.users.find((u) => u.id === id);
const isStaff = (db: DB, account: DB["users"][number]) =>
  account.staff ?? (account.roles.some(role => role !== "PATIENT") || db.doctors.some(doctor => doctor.userId === account.id));
const requireDoctorPaused = (db: DB, id: string) =>
  need(!db.doctors.some(doctor => doctor.userId === id && doctor.active), 409, "Pause doctor scheduling first");

/** Lặp lại yêu cầu cùng Idempotency-Key trả đúng kết quả cũ. */
function idem(c: Ctx, op: string, fn: () => unknown, status = 200): Response {
  const key = c.headers.get("Idempotency-Key");
  need(key, 400, "Invalid request");
  const k = `${c.actor.id}|${op}|${key}`;
  const hash = JSON.stringify([c.params, c.body ?? null]);
  const prev = c.db.idem[k];
  if (prev) {
    need(prev.hash === hash, 409, "Constraint conflict");
    return res(prev.status, prev.body);
  }
  const out = fn();
  const st = out === undefined ? 204 : status;
  c.db.idem[k] = { hash, status: st, body: out };
  return res(st, out);
}

type Handler = (c: Ctx) => Response | unknown;
const routes: [string, RegExp, Handler][] = [];
const on = (method: string, path: string, h: Handler) =>
  routes.push([method, new RegExp("^" + path.replace(/:[a-zA-Z]+/g, "([^/]+)") + "$"), h]);

// ---------- danh tính & danh mục ----------
on("GET", "/clinic/hours", (c) => ({ days: c.db.clinicHours }));
on("PUT", "/clinic/hours", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const days: ClinicDayHours[] = c.body?.days;
  need(Array.isArray(days) && days.length === 7 && days.every(day =>
    day && Number.isInteger(day.dayOfWeek) && day.dayOfWeek >= 1 && day.dayOfWeek <= 7
    && isValidClinicDay(day)) && new Set(days.map(day => day.dayOfWeek)).size === 7, 422, "Invalid clinic hours");
  need(!c.db.avail.some(shift => Date.parse(shift.endAt) > c.now
    && scheduleIntervalError(shift.startAt, shift.endAt, -Infinity, days)),
  409, "Clinic hours conflict with an existing shift");
  c.db.clinicHours = [...days].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  audit(c.db, c.actor.id, "CLINIC_HOURS_UPDATED", "clinic-hours", c.now);
  return { days: c.db.clinicHours };
});
on("GET", "/clinic/holidays", (c) => c.db.clinicHolidays ?? []);
on("POST", "/clinic/holidays", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const { startDate, endDate, name, closed, opensAt, closesAt } = c.body ?? {};
  need(typeof startDate === "string" && typeof endDate === "string" && startDate <= endDate && typeof name === "string" && name.trim().length > 0, 422, "Invalid clinic holiday");
  const list = c.db.clinicHolidays ?? (c.db.clinicHolidays = []);
  need(!list.some(h => h.startDate <= endDate && startDate <= h.endDate), 409, "Clinic holiday overlaps an existing holiday");
  const item = { id: mid(), startDate, endDate, name: name.trim(), closed: Boolean(closed), opensAt: closed ? null : opensAt, closesAt: closed ? null : closesAt };
  list.push(item);
  audit(c.db, c.actor.id, "CLINIC_HOLIDAY_CREATED", item.id, c.now);
  return item;
});
on("DELETE", "/clinic/holidays/:id", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const list = c.db.clinicHolidays ?? [];
  const idx = list.findIndex(h => h.id === c.params[0]);
  need(idx >= 0, 404, "Resource not found");
  const [removed] = list.splice(idx, 1);
  audit(c.db, c.actor.id, "CLINIC_HOLIDAY_REMOVED", removed.id, c.now);
  return res(204);
});


on("GET", "/me", (c) => ({ id: c.actor.id, roles: c.actor.roles }));
on("GET", "/me/profile", c => ({id:c.actor.id,roles:c.actor.roles,displayName:user(c.db,c.actor.id)?.name ?? "",active:true,patientId:c.actor.roles.includes("PATIENT") ? c.actor.id : null,doctorId:c.db.doctors.find(d => d.userId === c.actor.id)?.id ?? null}));
on("GET", "/appointments/:id", c => {
  const a=find(c.db.appts,c.params[0]);
  need(a.patientId === c.actor.id || c.actor.roles.some(r => ["RECEPTIONIST","ADMINISTRATOR"].includes(r)) || isDoctorOf(c.db,c.actor,a.doctorId),404,"Resource not found");
  return a.patientId === c.actor.id ? outPatientAppointment(a) : strip(a);
});
on("PUT", "/me/contact", (c) => {
  need(typeof c.body?.email === "string" && /^\S+@\S+\.\S+$/.test(c.body.email), 400, "Invalid request");
  const u = user(c.db, c.actor.id); if (u) u.email = c.body.email;
  audit(c.db, c.actor.id, "CONTACT_UPDATED", c.actor.id, c.now);
  return res(200);
});
on("GET", "/users", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const term = (c.query.get("q") ?? "").trim().toLowerCase();
  need(term.length <= 255, 400, "Invalid search query");
  const role = c.query.get("role");
  const active = c.query.get("active");
  const accounts = c.db.users.filter(account => isStaff(c.db, account)).map(account => ({
    id: account.id, displayName: account.name, active: account.active, roles: account.roles,
    username: mockUsername(account),
    doctorId: c.db.doctors.find(doctor => doctor.userId === account.id)?.id ?? null,
  }));
  return page(accounts.filter(account => (account.displayName.toLowerCase().includes(term)
    || account.username?.toLowerCase().includes(term))
    && (!active || String(account.active) === active)
    && (!role || account.roles.some(value => value === role)
      || (role === "UNASSIGNED" && !account.roles.some(value => value !== "PATIENT"))))
    .sort((a, b) => a.displayName.localeCompare(b.displayName) || a.id.localeCompare(b.id)), c.query);
});
function patientAccount(c: Ctx) {
  req(c.actor, "ADMINISTRATOR");
  const id = c.params[0].toLowerCase();
  need(ACCOUNT_UUID.test(id), 400, "Invalid request");
  const account = find(c.db.users, id);
  need(id !== c.actor.id && !isStaff(c.db, account)
    && account.roles.length === 1 && account.roles[0] === "PATIENT", 404, "Resource not found");
  return account;
}

on("GET", "/patient-accounts/:id", (c) => {
  const account = patientAccount(c);
  audit(c.db, c.actor.id, "PATIENT_ACCOUNT_LOOKUP", account.id, c.now);
  return { id: account.id, displayName: account.name, active: account.active };
});
on("PUT", "/patient-accounts/:id/access", (c) => {
  const { active, reason } = c.body ?? {};
  need(typeof active === "boolean" && PATIENT_ACCOUNT_REASONS.includes(reason), 400, "Invalid request");
  const account = patientAccount(c);
  if (active !== account.active) {
    account.active = active;
    audit(c.db, c.actor.id, `PATIENT_ACCOUNT_${active ? "UNLOCKED" : "LOCKED"}_${reason}`, account.id, c.now);
  }
  return { id: account.id, displayName: account.name, active: account.active };
});

on("POST", "/staff", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const { subject, username, displayName } = c.body ?? {};
  need(typeof subject === "string" && /^[\da-f]{8}(-[\da-f]{4}){3}-[\da-f]{12}$/i.test(subject)
    && typeof username === "string" && username.trim() && typeof displayName === "string" && displayName.trim(), 400, "Invalid request");
  const existing = c.db.users.find(account => (account.subject ?? account.id) === subject.toLowerCase());
  if (existing) {
    need(isStaff(c.db, existing), 409, "Patient account cannot be enrolled as staff");
    return res(201, { id: existing.id });
  }
  const id = mid();
  c.db.users.push({ id, subject: subject.toLowerCase(), username: username.trim(),
    name: displayName.trim(), email: "", roles: [], active: true, staff: true });
  audit(c.db, c.actor.id, "STAFF_CREATED", id, c.now);
  return res(201, { id });
});
on("POST", "/staff/provision", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const { username, displayName, email, temporaryPassword, roles, specialtyIds } = c.body ?? {};
  need(typeof username === "string" && /^[a-z0-9][a-z0-9._-]{2,63}$/i.test(username)
    && typeof displayName === "string" && displayName.trim() && typeof email === "string" && email.includes("@")
    && typeof temporaryPassword === "string" && temporaryPassword.length >= 12 && Array.isArray(specialtyIds), 400, "Invalid request");
  need(Array.isArray(roles) && roles.length && roles.every(role =>
    ["DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR"].includes(role)), 422, "Invalid roles");
  const doctor = roles.includes("DOCTOR");
  need(doctor === (specialtyIds.length > 0), 422, "Doctor specialties required");
  need(!c.db.users.some(account => mockUsername(account)?.toLowerCase() === username.toLowerCase()
    || account.email.toLowerCase() === email.toLowerCase()), 409, "Staff username or email already exists");
  (specialtyIds as string[]).forEach(id => find(c.db.specialties.filter(item => item.active), id));
  const id = mid();
  c.db.users.push({ id, username: username.toLowerCase(), name: displayName.trim(),
    email, roles: [...new Set(roles)] as never, active: true, staff: true });
  audit(c.db, c.actor.id, "STAFF_CREATED", id, c.now);
  if (doctor) {
    const doctorId = mid();
    c.db.doctors.push({ id: doctorId, userId: id, active: false, specialtyIds: [...new Set<string>(specialtyIds)] });
    audit(c.db, c.actor.id, "DOCTOR_CREATED", doctorId, c.now);
  }
  audit(c.db, c.actor.id, "ROLES_CHANGED", id, c.now);
  return res(201, { id });
});
on("PUT", "/staff/:id", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const account = find(c.db.users.filter(row => isStaff(c.db, row)), c.params[0]);
  const { displayName, active } = c.body ?? {};
  need(typeof displayName === "string" && displayName.trim() && typeof active === "boolean", 400, "Invalid request");
  need(active || account.id !== c.actor.id, 409, "Cannot disable your own account");
  if (!active && account.active) requireDoctorPaused(c.db, account.id);
  account.staff = true;
  account.name = displayName.trim();
  account.active = active;
  audit(c.db, c.actor.id, "STAFF_UPDATED", account.id, c.now);
  return res(200);
});
on("PUT", "/users/:id/roles", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const roles: string[] = c.body?.roles ?? [];
  const u = find(c.db.users.filter(account => isStaff(c.db, account)), c.params[0]);
  need(Array.isArray(roles) && roles.every(r => ["DOCTOR", "RECEPTIONIST", "ADMINISTRATOR", "AUDITOR"].includes(r)
    || (r === "PATIENT" && u.roles.includes("PATIENT"))), 422, "Invalid roles");
  need(c.actor.id !== u.id, 409, "Self role changes are not allowed");
  if (roles.includes("DOCTOR")) need(c.db.doctors.some((d) => d.userId === u.id), 409, "Create doctor profile first");
  else if (u.roles.includes("DOCTOR")) requireDoctorPaused(c.db, u.id);
  u.staff = true;
  u.roles = roles as never;
  audit(c.db, c.actor.id, "ROLES_CHANGED", u.id, c.now);
  return res(200);
});
on("GET", "/specialties", (c) => {
  const all = c.query.get("includeInactive") === "true" && c.actor.roles.includes("ADMINISTRATOR");
  return c.db.specialties
    .filter((s) => all || s.active)
    .sort((a, b) => a.name.localeCompare(b.name));
});
on("POST", "/specialties", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const name = String(c.body?.name ?? "").trim();
  need(name, 422, "Name required");
  need(!c.db.specialties.some((s) => s.name.toLowerCase() === name.toLowerCase()), 409, "Constraint conflict");
  const s = { id: mid(), name, active: true };
  c.db.specialties.push(s);
  audit(c.db, c.actor.id, "SPECIALTY_CREATED", s.id, c.now);
  return res(201, s);
});
on("PUT", "/specialties/:id", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const s = find(c.db.specialties, c.params[0]);
  const name = String(c.body?.name ?? "").trim();
  need(name, 422, "Name required");
  need(!c.db.specialties.some((item) => item.id !== s.id && item.name.toLowerCase() === name.toLowerCase()), 409, "Constraint conflict");
  s.name = name;
  s.active = Boolean(c.body?.active);
  audit(c.db, c.actor.id, "SPECIALTY_UPDATED", s.id, c.now);
  return s;
});
on("GET", "/doctors", (c) =>
  c.db.doctors.flatMap((d) => d.specialtyIds.map((sid) => ({ id: d.id, active: d.active, displayName: user(c.db, d.userId)?.name ?? "", specialtyId: sid }))));
on("POST", "/doctors", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const u = find(c.db.users.filter(account => account.active && isStaff(c.db, account)), String(c.body?.userId));
  const sids: string[] = c.body?.specialtyIds ?? [];
  need(sids.length > 0, 400, "Invalid request");
  need(!c.db.doctors.some((d) => d.userId === u.id), 409, "Constraint conflict");
  sids.forEach((s) => find(c.db.specialties, s));
  const d = { id: mid(), userId: u.id, active: false, specialtyIds: [...new Set(sids)] };
  c.db.doctors.push(d);
  audit(c.db, c.actor.id, "DOCTOR_CREATED", d.id, c.now);
  return res(201, { id: d.id, userId: d.userId, active: false });
});
on("PUT", "/doctors/:id", (c) => {
  req(c.actor, "ADMINISTRATOR");
  const d = find(c.db.doctors, c.params[0]);
  const { active, displayName, specialtyIds } = c.body ?? {};
  need(typeof active === "boolean" && String(displayName ?? "").trim() && Array.isArray(specialtyIds) && specialtyIds.length, 400, "Invalid request");
  if (active) {
    const account = user(c.db, d.userId);
    need(account?.active && account.roles.includes("DOCTOR"), 409, "Doctor account must be active and have the doctor role");
  }
  if (!active)
    need(!c.db.appts.some((a) => a.doctorId === d.id && Date.parse(a.endAt) > c.now && ACTIVE.includes(a.status)), 409, "Doctor has active appointments");
  d.active = active;
  d.specialtyIds = [...new Set<string>(specialtyIds)];
  const u = user(c.db, d.userId); if (u) u.name = String(displayName).trim();
  audit(c.db, c.actor.id, "DOCTOR_UPDATED", d.id, c.now);
  return { id: d.id, userId: d.userId, active: d.active };
});

// ---------- lịch làm việc & slot ----------
const doctorGuard = (c: Ctx, id: string) => {
  find(c.db.doctors, id);
  need(isDoctorOf(c.db, c.actor, id), 403, "Doctor assignment required");
};
on("DELETE", "/availability/:id", c=>{
  const shift=find(c.db.avail,c.params[0]);doctorGuard(c,shift.doctorId);
  need(Date.parse(shift.startAt)>c.now,409,"Past schedules are retained");
  const slots=new Set(c.db.slots.filter(s=>s.availabilityId===shift.id).map(s=>s.id));
  need(!c.db.appts.some(a=>slots.has(a.slotId)),409,"Availability with appointment history cannot be deleted");
  c.db.slots=c.db.slots.filter(s=>s.availabilityId!==shift.id);
  c.db.avail=c.db.avail.filter(a=>a.id!==shift.id);
  audit(c.db,c.actor.id,"AVAILABILITY_REMOVED",shift.id,c.now);
  return res(204);
});
on("DELETE", "/time-off/:id", c=>{
  const timeOff=find(c.db.timeoff,c.params[0]);doctorGuard(c,timeOff.doctorId);
  need(Date.parse(timeOff.startAt)>c.now,409,"Past schedules are retained");
  c.db.timeoff=c.db.timeoff.filter(t=>t.id!==timeOff.id);
  audit(c.db,c.actor.id,"TIME_OFF_REMOVED",timeOff.id,c.now);
  return res(204);
});
on("GET", "/doctors/:id/availability", (c) => { doctorGuard(c, c.params[0]); return c.db.avail.filter((a) => a.doctorId === c.params[0]).sort((a, b) => a.startAt.localeCompare(b.startAt)); });
on("GET", "/doctors/:id/time-off", (c) => { doctorGuard(c, c.params[0]); return c.db.timeoff.filter((a) => a.doctorId === c.params[0]).sort((a, b) => a.startAt.localeCompare(b.startAt)); });
on("POST", "/doctors/:id/availability", (c) => {
  doctorGuard(c, c.params[0]);
  const { startAt, endAt, slotMinutes, mode } = c.body ?? {};
  need(startAt && endAt && Date.parse(startAt) < Date.parse(endAt) && Number.isInteger(slotMinutes) && slotMinutes >= 1 && slotMinutes <= 540 && ["IN_PERSON", "REMOTE"].includes(mode), 400, "Invalid request");
  need(Date.parse(startAt) > c.now, 422, "Availability must be in the future");
  const issue=scheduleIntervalError(startAt,endAt,c.now,c.db.clinicHours)||slotDurationError(startAt,endAt,slotMinutes);
  need(!issue,422,issue);
  need(!c.db.avail.some((a) => a.doctorId === c.params[0] && overlap(a.startAt, a.endAt, startAt, endAt)), 409, "Constraint conflict");
  const a = { id: mid(), doctorId: c.params[0], startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString(), slotMinutes, mode };
  c.db.avail.push(a);
  c.db.slots.push(...genSlots(a));
  audit(c.db, c.actor.id, "AVAILABILITY_CREATED", a.id, c.now);
  return res(201, a);
});
on("POST", "/doctors/:id/time-off", (c) => {
  doctorGuard(c, c.params[0]);
  const { startAt, endAt } = c.body ?? {};
  need(startAt && endAt && Date.parse(startAt) < Date.parse(endAt), 400, "Invalid request");
  const issue=scheduleIntervalError(startAt,endAt,c.now,c.db.clinicHours);
  need(!issue,422,issue);
  need(!c.db.appts.some((a) => a.doctorId === c.params[0] && ACTIVE.includes(a.status) && overlap(a.startAt, a.endAt, startAt, endAt)), 409, "Constraint conflict");
  const t = { id: mid(), doctorId: c.params[0], startAt: new Date(startAt).toISOString(), endAt: new Date(endAt).toISOString() };
  c.db.timeoff.push(t);
  audit(c.db, c.actor.id, "TIME_OFF_CREATED", t.id, c.now);
  return res(201, t);
});
const slotFree = (db: DB, s: DB["slots"][number], ignoreAppt?: string) =>
  !db.timeoff.some((t) => t.doctorId === s.doctorId && overlap(t.startAt, t.endAt, s.startAt, s.endAt)) &&
  !db.appts.some((a) => a.id !== ignoreAppt && a.doctorId === s.doctorId && ACTIVE.includes(a.status) && overlap(a.startAt, a.endAt, s.startAt, s.endAt));
on("GET", "/slots", (c) => {
  const date = c.query.get("date");
  need(date && /^\d{4}-\d{2}-\d{2}$/.test(date), 400, "Invalid request");
  const doctorId = c.query.get("doctorId"), spec = c.query.get("specialtyId"), mode = c.query.get("mode");
  return c.db.slots
    .filter((s) => dayKey(s.startAt) === date && Date.parse(s.startAt) > c.now && (!doctorId || s.doctorId === doctorId) && (!mode || s.mode === mode))
    .filter((s) => c.db.doctors.find((d) => d.id === s.doctorId)?.active)
    .filter((s) => !spec || c.db.doctors.find((d) => d.id === s.doctorId)?.specialtyIds.includes(spec))
    .filter((s) => slotFree(c.db, s))
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
});

// ---------- lịch hẹn ----------
const notify = (c: Ctx, a: MAppt, eventType: string, estimatedStartAt: string | null = null) => {
  const job = { id: mid(), appointmentId: a.id, appointmentVersion: a.version, eventType, status: "PENDING", attempts: 0,
    lastError: null, dueAt: new Date(c.now).toISOString(), estimatedStartAt, sendAt: c.now + 2500 };
  c.db.notifs.push(job);
  return outNotification(job);
};
const patientOnly = (c: Ctx) => { req(c.actor, "PATIENT"); return c.actor.id; };
on("GET", "/appointments", (c) => {
  const a = c.actor;
  let rows = c.db.appts;
  if (a.roles.includes("RECEPTIONIST") || a.roles.includes("ADMINISTRATOR")) rows = c.db.appts;
  else if (a.roles.includes("DOCTOR")) rows = c.db.appts.filter((x) => myDoctorIds(c.db, a).includes(x.doctorId));
  else rows = c.db.appts.filter((x) => x.patientId === a.id);
  return page([...rows].sort((x, y) => x.startAt.localeCompare(y.startAt) || x.id.localeCompare(y.id)), c.query)
    .map((appointment) => appointment.patientId === a.id ? outPatientAppointment(appointment) : strip(appointment));
});
on("POST", "/appointments", (c) => {
  const pid = patientOnly(c);
  return idem(c, "book", () => {
    const slot = find(c.db.slots, String(c.body?.slotId));
    need(Date.parse(slot.startAt) > c.now, 409, "Constraint conflict");
    need(c.db.doctors.find((d) => d.id === slot.doctorId)?.active, 409, "Constraint conflict");
    need(slotFree(c.db, slot), 409, "Constraint conflict");
    need(!c.db.appts.some((a) => a.patientId === pid && ACTIVE.includes(a.status) && overlap(a.startAt, a.endAt, slot.startAt, slot.endAt)), 409, "Constraint conflict");
    const a: MAppt = { id: mid(), patientId: pid, doctorId: slot.doctorId, slotId: slot.id, startAt: slot.startAt, endAt: slot.endAt, mode: slot.mode, status: "CONFIRMED", version: 0, cancellationReason: null, encounterId: null };
    c.db.appts.push(a);
    notify(c, a, "BOOKED");
    audit(c.db, pid, "APPOINTMENT_BOOKED", a.id, c.now);
    return strip(a);
  }, 201);
});
const own = (c: Ctx, id: string) => { const pid = patientOnly(c); const a = find(c.db.appts, id); need(a.patientId === pid, 404, "Resource not found"); return a; };
const editable = (c: Ctx, a: MAppt) => {
  need(c.body?.version === a.version, 409, "Concurrent modification; retry request");
  need(a.status === "CONFIRMED" && Date.parse(a.startAt) - c.now >= 120 * MIN, 409, "Constraint conflict");
};
on("POST", "/appointments/:id/reschedule", (c) => idem(c, "reschedule", () => {
  const a = own(c, c.params[0]); editable(c, a);
  const s = find(c.db.slots, String(c.body?.slotId));
  need(s.doctorId === a.doctorId && s.mode === a.mode && Date.parse(s.startAt) > c.now && slotFree(c.db, s, a.id), 409, "Constraint conflict");
  need(!c.db.appts.some((x) => x.id !== a.id && x.patientId === a.patientId && ACTIVE.includes(x.status) && overlap(x.startAt, x.endAt, s.startAt, s.endAt)), 409, "Constraint conflict");
  Object.assign(a, { slotId: s.id, startAt: s.startAt, endAt: s.endAt, version: a.version + 1 });
  notify(c, a, "RESCHEDULED"); audit(c.db, a.patientId, "APPOINTMENT_RESCHEDULED", a.id, c.now);
  return strip(a);
}));
on("POST", "/appointments/:id/cancel", (c) => idem(c, "cancel", () => {
  const a = own(c, c.params[0]); editable(c, a);
  const reason = String(c.body?.reason ?? "").trim();
  need(reason && reason.length <= 1000, 400, "Invalid request");
  Object.assign(a, { status: "CANCELLED", cancellationReason: reason, version: a.version + 1 });
  notify(c, a, "CANCELLED"); audit(c.db, a.patientId, "APPOINTMENT_CANCELLED", a.id, c.now);
  return strip(a);
}));

on("POST", "/appointments/:id/delay-notice", (c) => {
  req(c.actor, "RECEPTIONIST");
  return idem(c, "delay-notice", () => {
    const a = find(c.db.appts, c.params[0]);
    const { version, estimatedStartAt } = c.body ?? {};
    need(Number.isInteger(version) && version >= 0, 400, "Invalid request");
    need(version === a.version, 409, "Concurrent modification; retry request");
    need(canSendDelayNotice(a, c.now), 409, "Appointment cannot receive a delay notice");
    if (estimatedStartAt != null) {
      const estimate = typeof estimatedStartAt === "string" ? Date.parse(estimatedStartAt) : NaN;
      need(estimate > Math.max(c.now, Date.parse(a.startAt)) && dayKey(estimatedStartAt) === dayKey(a.startAt),
        422, "Invalid estimated appointment time");
    }
    need(!c.db.notifs.some(job => job.appointmentId === a.id && job.appointmentVersion === a.version &&
      job.eventType === "DELAY_NOTICE"), 409, "Delay notice already queued");
    const job = notify(c, a, "DELAY_NOTICE", estimatedStartAt);
    audit(c.db, c.actor.id, "APPOINTMENT_DELAY_NOTICE_QUEUED", a.id, c.now);
    return job;
  });
});

// ---------- check-in & hàng đợi ----------
on("POST", "/appointments/:id/check-in", (c) => idem(c, "checkin", () => {
  req(c.actor, "RECEPTIONIST");
  const a = find(c.db.appts, c.params[0]);
  const existing = c.db.tickets.find((t) => t.appointmentId === a.id);
  if (existing) return outTicket(existing);
  need(a.mode === "IN_PERSON" && a.status === "CONFIRMED", 409, "Constraint conflict");
  const s = Date.parse(a.startAt);
  need(c.now >= s - 15 * MIN && c.now < s + 15 * MIN, 409, "Constraint conflict");
  const day = dayKey(a.startAt);
  const pos = Math.max(0, ...c.db.tickets.filter((t) => t.doctorId === a.doctorId && t.day === day).map((t) => t.position)) + 1;
  const t: MTicket = { id: mid(), appointmentId: a.id, doctorId: a.doctorId, patientId: a.patientId, position: pos, status: "WAITING", checkedInAt: new Date(c.now).toISOString(), day };
  c.db.tickets.push(t);
  Object.assign(a, { status: "CHECKED_IN", version: a.version + 1 });
  audit(c.db, c.actor.id, "CHECKED_IN", a.id, c.now);
  return outTicket(t);
}));
on("GET", "/doctors/:id/queue", (c) => {
  req(c.actor, "RECEPTIONIST", "ADMINISTRATOR", "DOCTOR");
  const date = c.query.get("date"), doctorId = c.params[0], status = null;
  need(date,400,"Invalid request");
  const mine = c.actor.roles.includes("DOCTOR") && !c.actor.roles.includes("ADMINISTRATOR") && !c.actor.roles.includes("RECEPTIONIST") ? myDoctorIds(c.db, c.actor) : null;
  if (mine && doctorId) need(mine.includes(doctorId), 403, "Doctor assignment required");
  return c.db.tickets
    .filter((t) => (!date || t.day === date) && (!doctorId || t.doctorId === doctorId) && (!status || t.status === status) && (!mine || mine.includes(t.doctorId)))
    .sort((a, b) => a.position - b.position).map(outTicket);
});
on("POST", "/doctors/:id/queue/next", (c) => idem(c, "callnext", () => {
  need(isDoctorOf(c.db, c.actor, c.params[0]), 403, "Doctor assignment required");
  const day = c.query.get("date");
  need(day,400,"Invalid request");
  need(!c.db.tickets.some(t => t.doctorId === c.params[0] && t.day === day && ["CALLED","IN_SERVICE"].includes(t.status)),409,"Constraint conflict");
  const t = c.db.tickets.filter((x) => x.doctorId === c.params[0] && x.day === day && x.status === "WAITING").sort((a, b) => a.position - b.position)[0];
  if (!t) return undefined;
  t.status = "CALLED"; t.version=(t.version ?? 0)+1;
  audit(c.db, c.actor.id, "QUEUE_CALLED", t.id, c.now);
  return outTicket(t);
}));
on("POST", "/queue-tickets/:id/skip", (c) => {
  req(c.actor, "RECEPTIONIST");
  const t = find(c.db.tickets, c.params[0]);
  need(String(c.body?.reason ?? "").trim(), 400, "Invalid request");
  need(c.body?.version === (t.version ?? 0),409,"Concurrent modification; retry request");
  need(t.status === "CALLED", 409, "Constraint conflict");
  t.position = Math.max(...c.db.tickets.filter((x) => x.doctorId === t.doctorId && x.day === t.day).map((x) => x.position)) + 1;
  t.status = "WAITING"; t.version=(t.version ?? 0)+1;
  audit(c.db, c.actor.id, "QUEUE_SKIPPED", t.id, c.now);
  return outTicket(t);
});

// ---------- tiến trình lần khám ----------
on("POST", "/appointments/:id/progress", (c) => idem(c, "progress", () => {
  const a = find(c.db.appts, c.params[0]);
  const { targetStatus, version, noShowReason, sendRebookingEmail } = c.body ?? {};
  need(["IN_PROGRESS", "COMPLETED", "NO_SHOW"].includes(targetStatus) && Number.isInteger(version), 400, "Invalid request");
  need(noShowReason == null || (typeof noShowReason === "string" && Object.prototype.hasOwnProperty.call(NO_SHOW_REASON, noShowReason)), 400, "Invalid request");
  need(sendRebookingEmail == null || typeof sendRebookingEmail === "boolean", 400, "Invalid request");
  need(targetStatus === "NO_SHOW" || (noShowReason == null && !sendRebookingEmail), 422, "Follow-up fields require NO_SHOW");
  need(version === a.version, 409, "Concurrent modification; retry request");
  if (targetStatus === "NO_SHOW") {
    need(a.status === "CONFIRMED" && c.now >= Date.parse(a.startAt) + 15 * MIN, 409, "Constraint conflict");
    if (a.mode === "IN_PERSON") req(c.actor, "RECEPTIONIST");
    else need(isDoctorOf(c.db, c.actor, a.doctorId), 403, "Doctor assignment required");
    a.status = "NO_SHOW";
    a.noShowReason = noShowReason ?? null;
    const session = c.db.sessions.find((s) => s.appointmentId === a.id && ["CREATED", "WAITING"].includes(s.status));
    if (session) Object.assign(session, { status: "CANCELLED", version: session.version + 1, patientAdmitted: false });
  } else {
    need(isDoctorOf(c.db, c.actor, a.doctorId), 403, "Doctor assignment required");
    if (targetStatus === "IN_PROGRESS") {
      need(a.mode === "IN_PERSON" && a.status === "CHECKED_IN", 409, "Constraint conflict");
      const t = c.db.tickets.find((x) => x.appointmentId === a.id);
      need(t?.status === "CALLED", 409, "Constraint conflict");
      t!.status = "IN_SERVICE";
      a.status = "IN_PROGRESS";
      a.encounterId = a.encounterId ?? mid();
    } else {
      need(a.status === "IN_PROGRESS" && a.encounterId, 409, "Constraint conflict");
      need(c.db.records.some((r) => r.encounterId === a.encounterId && r.status === "FINAL"), 422, "FINAL record required");
      if (a.mode === "REMOTE") need(c.db.sessions.find((s) => s.appointmentId === a.id)?.status === "ENDED", 422, "Ended session required");
      a.status = "COMPLETED";
      const t = c.db.tickets.find((x) => x.appointmentId === a.id); if (t) t.status = "DONE";
    }
  }
  a.version++;
  if (targetStatus === "NO_SHOW" && sendRebookingEmail) notify(c, a, "NO_SHOW_REBOOKING");
  audit(c.db, c.actor.id, "APPOINTMENT_" + targetStatus, a.id, c.now);
  return strip(a);
}));

// ---------- hồ sơ & đơn thuốc ----------
const encounterAppt = (c: Ctx, enc: string) => c.db.appts.find((a) => a.encounterId === enc);
const doctorOfEncounter = (c: Ctx, enc: string) => { const a = encounterAppt(c, enc); need(a, 404, "Resource not found"); need(isDoctorOf(c.db, c.actor, a!.doctorId) && !c.actor.roles.includes("ADMINISTRATOR"), 403, "Doctor assignment required"); return a!; };
on("GET", "/patients/:id/records", (c) => {
  const pid = c.params[0];
  let rows = c.db.records.filter((r) => r.patientId === pid);
  if (c.actor.roles.includes("PATIENT") && c.actor.id === pid) rows = rows.filter((r) => r.status === "FINAL");
  else {
    req(c.actor, "DOCTOR");
    const mine = myDoctorIds(c.db, c.actor);
    need(c.db.appts.some((a) => a.patientId === pid && mine.includes(a.doctorId)), 403, "Doctor assignment required");
    rows = rows.filter((r) => r.status === "FINAL");
  }
  audit(c.db, c.actor.id, "RECORD_LIST_READ", pid, c.now);
  return page(rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), c.query, 100).map(outRecord);
});
on("PUT", "/encounters/:id/record", (c) => {
  const a = doctorOfEncounter(c, c.params[0]);
  const { version, content, status } = c.body ?? {};
  need(typeof content === "string" && content.length > 0 && ["DRAFT", "FINAL"].includes(status) && Number.isInteger(version), 400, "Invalid request");
  const cur = c.db.records.filter((r) => r.encounterId === c.params[0]).sort((x, y) => y.version - x.version)[0];
  need(!cur || cur.status === "DRAFT", 409, "FINAL record is immutable");
  need((cur?.version ?? 0) === version, 409, "Concurrent modification; retry request");
  const iso = new Date(c.now).toISOString();
  if (cur) Object.assign(cur, { content, status, version: cur.version + 1, updatedAt: iso });
  else c.db.records.push({ id: mid(), encounterId: c.params[0], appointmentId: a.id, patientId: a.patientId, doctorId: a.doctorId, version: 1, status, content, createdAt: iso, updatedAt: iso, supersedesId: null, amendmentReason: null });
  const out = c.db.records.find((r) => r.encounterId === c.params[0] && r.supersedesId === null)!;
  audit(c.db, c.actor.id, status === "FINAL" ? "RECORD_FINALIZED" : "RECORD_SAVED", out.id, c.now);
  return outRecord(out);
});
on("POST", "/records/:id/amendments", (c) => {
  const base = find(c.db.records, c.params[0]);
  doctorOfEncounter(c, base.encounterId);
  const { content, reason, version } = c.body ?? {};
  need(content && reason && Number.isInteger(version), 400, "Invalid request");
  const latest = c.db.records.filter((r) => r.encounterId === base.encounterId && r.status === "FINAL").sort((x, y) => y.version - x.version)[0];
  need(latest && latest.version === version && latest.id === base.id, 409, "Concurrent modification; retry request");
  const iso = new Date(c.now).toISOString();
  const r = { ...latest, id: mid(), version: latest.version + 1, content, status: "FINAL", createdAt: iso, updatedAt: iso, supersedesId: latest.id, amendmentReason: String(reason) };
  c.db.records.push(r);
  audit(c.db, c.actor.id, "RECORD_AMENDED", r.id, c.now);
  return res(201, outRecord(r));
});
const validItem = (i: any) => ["medicineName", "doseText", "route", "frequency", "durationText"].every((k) => typeof i?.[k] === "string" && i[k].trim());
on("POST", "/encounters/:id/prescriptions", (c) => {
  const a = doctorOfEncounter(c, c.params[0]);
  const items = c.body?.items;
  need(Array.isArray(items) && items.every((i: unknown) => typeof i === "object"), 400, "Invalid request");
  let rx = c.db.rx.find((r) => r.encounterId === c.params[0] && r.status === "DRAFT");
  need(!c.db.rx.some((r) => r.encounterId === c.params[0] && r.status === "ISSUED"), 409, "Constraint conflict");
  if (rx) Object.assign(rx, { items, version: rx.version + 1 });
  else { rx = { id: mid(), encounterId: c.params[0], patientId: a.patientId, doctorId: a.doctorId, status: "DRAFT", version: 1, items }; c.db.rx.push(rx); }
  audit(c.db, c.actor.id, "PRESCRIPTION_SAVED", rx.id, c.now);
  return res(201, rx);
});
on("POST", "/prescriptions/:id/issue", (c) => idem(c, "issue", () => {
  const rx = find(c.db.rx, c.params[0]);
  doctorOfEncounter(c, rx.encounterId);
  if (rx.status === "ISSUED") return rx;
  need(c.body?.version === rx.version, 409, "Concurrent modification; retry request");
  need(rx.items.length > 0 && rx.items.every(validItem), 422, "Prescription items incomplete");
  Object.assign(rx, { status: "ISSUED", version: rx.version + 1, issuedAt: new Date(c.now).toISOString() });
  audit(c.db, c.actor.id, "PRESCRIPTION_ISSUED", rx.id, c.now);
  return rx;
}));
on("GET", "/patients/:id/prescriptions", (c) => {
  const pid = c.params[0];
  if (!(c.actor.roles.includes("PATIENT") && c.actor.id === pid)) {
    req(c.actor, "DOCTOR");
    need(c.db.appts.some((a) => a.patientId === pid && myDoctorIds(c.db, c.actor).includes(a.doctorId)), 403, "Doctor assignment required");
  }
  audit(c.db, c.actor.id, "PRESCRIPTION_LIST_READ", pid, c.now);
  return c.db.rx.filter((r) => r.patientId === pid && r.status === "ISSUED");
});

// ---------- khám từ xa ----------
on("GET", "/appointments/:id/telehealth-session", (c) => {
  const a = find(c.db.appts, c.params[0]);
  need(a.patientId === c.actor.id || isDoctorOf(c.db, c.actor, a.doctorId), 404, "Not found");
  const room = c.db.sessions.find((s) => s.appointmentId === a.id);
  if (!room) throw new P(404, "Not found");
  return outSession(room);
});
on("POST", "/appointments/:id/telehealth-session", (c) => idem(c, "prepare", () => {
  const a = find(c.db.appts, c.params[0]);
  need(a.patientId === c.actor.id || isDoctorOf(c.db, c.actor, a.doctorId), 403, "Insufficient permission");
  need(a.mode === "REMOTE" && ["CONFIRMED", "IN_PROGRESS"].includes(a.status), 409, "Constraint conflict");
  let s = c.db.sessions.find((x) => x.appointmentId === a.id);
  if (!s) { s = { id: mid(), appointmentId: a.id, status: "CREATED", version: 0, patientAdmitted: false }; c.db.sessions.push(s); }
  return outSession(s);
}));
const sess = (c: Ctx) => { const s = find(c.db.sessions, c.params[0]); return { s, a: find(c.db.appts, s.appointmentId) }; };
on("POST", "/telehealth-sessions/:id/join", (c) => {
  need(typeof c.body?.consent === "boolean", 400, "Invalid request");
  const { s, a } = sess(c);
  need(!["ENDED", "CANCELLED"].includes(s.status), 409, "Constraint conflict");
  const start = Date.parse(a.startAt);
  if (c.actor.id === a.patientId) {
    need(c.body.consent === true,422,"Patient consent required");
    if (s.status === "CREATED") {
      need(c.now >= start - 10 * MIN && c.now < start + 15 * MIN, 409, "Constraint conflict");
      s.status = "WAITING"; s.patientAdmitted = true; s.version++;
    }
  } else {
    need(isDoctorOf(c.db, c.actor, a.doctorId), 403, "Doctor assignment required");
    need(["ACTIVE", "RECONNECTING"].includes(s.status), 409, "Constraint conflict");
  }
  audit(c.db, c.actor.id, "TELEHEALTH_JOINED", s.id, c.now);
  return { sessionId: s.id, token: "mock-room-token-" + mid(), expiresAt: new Date(c.now + 5 * MIN).toISOString(), signalingUrl:`/api/telehealth-sessions/${s.id}/signals` };
});
on("POST", "/telehealth-sessions/:id/start", (c) => {
  const { s, a } = sess(c);
  need(isDoctorOf(c.db, c.actor, a.doctorId), 403, "Doctor assignment required");
  need(c.body?.version === s.version, 409, "Concurrent modification; retry request");
  const start = Date.parse(a.startAt);
  need(s.status === "WAITING" && s.patientAdmitted && c.now >= start && c.now < start + 15 * MIN, 409, "Constraint conflict");
  s.status = "ACTIVE"; s.version++;
  a.status = "IN_PROGRESS"; a.version++; a.encounterId = a.encounterId ?? mid();
  audit(c.db, c.actor.id, "TELEHEALTH_STARTED", s.id, c.now);
  return outSession(s);
});
on("POST", "/telehealth-sessions/:id/end", (c) => {
  const { s, a } = sess(c);
  need(isDoctorOf(c.db, c.actor, a.doctorId), 403, "Doctor assignment required");
  need(c.body?.version === s.version, 409, "Concurrent modification; retry request");
  need(["ACTIVE", "RECONNECTING"].includes(s.status), 409, "Constraint conflict");
  s.status = "ENDED"; s.version++;
  audit(c.db, c.actor.id, "TELEHEALTH_ENDED", s.id, c.now);
  return outSession(s);
});


on("GET", "/telehealth-sessions/:id", c => {
  const {s,a}=sess(c); need(a.patientId === c.actor.id || isDoctorOf(c.db,c.actor,a.doctorId),404,"Resource not found"); return outSession(s);
});
on("GET", "/encounters/:id/record", c => {
  const a=encounterAppt(c,c.params[0]); need(a,404,"Resource not found");
  const own=a!.patientId === c.actor.id;
  need(own || isDoctorOf(c.db,c.actor,a!.doctorId),404,"Resource not found");
  const r=c.db.records.filter(r => r.encounterId === c.params[0] && (!own || r.status === "FINAL")).sort((a,b)=>b.version-a.version)[0];
  need(r,404,"Resource not found"); return outRecord(r);
});
on("GET", "/encounters/:id/prescriptions", c => {
  const a=encounterAppt(c,c.params[0]); need(a,404,"Resource not found");
  const own=a!.patientId === c.actor.id;
  need(own || isDoctorOf(c.db,c.actor,a!.doctorId),404,"Resource not found");
  return c.db.rx.filter(r => r.encounterId === c.params[0] && (!own || r.status === "ISSUED"));
});
on("PUT", "/prescriptions/:id", c => {
  const rx=find(c.db.rx,c.params[0]); doctorOfEncounter(c,rx.encounterId);
  need(rx.status === "DRAFT" && c.body?.version === rx.version,409,"Concurrent modification; retry request");
  need(Array.isArray(c.body?.items) && c.body.items.every(validItem),400,"Invalid request");
  Object.assign(rx,{items:c.body.items,version:rx.version+1}); return rx;
});
// ---------- thông báo & kiểm toán ----------
on("GET", "/notification-jobs", (c) => {
  req(c.actor, "RECEPTIONIST", "ADMINISTRATOR");
  return [...c.db.notifs].sort((a, b) => b.dueAt.localeCompare(a.dueAt)).slice(0, 100).map(outNotification);
});
on("GET", "/audit-events", (c) => {
  req(c.actor, "AUDITOR");
  const q = c.query, actorId = q.get("actorId"), resourceId = q.get("resourceId"), from = q.get("from"), to = q.get("to");
  need(!actorId || /^[0-9a-f-]{36}$/i.test(actorId), 400, "Invalid request");
  const rows = c.db.audit
    .filter((e) => (!actorId || e.actorId === actorId) && (!resourceId || e.resourceId === resourceId) && (!from || e.createdAt >= from) && (!to || e.createdAt < to))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return page(rows, q);
});

export async function mockFetch(input: string, init: RequestInit): Promise<Response> {
  await new Promise((r) => setTimeout(r, 80 + Math.random() * 150));
  const url = new URL(input, "http://mock.local");
  const path = url.pathname.replace(/^\/api/, "");
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  try {
    const db = getDb();
    const token = (headers.get("Authorization") ?? "").replace("Bearer mock.", "");
    const u = db.users.find((x) => x.id === token);
    need(u, 401, "Invalid identity");
    need(u!.active, 403, "Account disabled");
    const now = Date.now();
    // Outbox giả lập: PENDING → SENT sau ~2,5 giây.
    db.notifs.forEach((job) => {
      if (job.status !== "PENDING" || now < job.sendAt) return;
      const appointment = db.appts.find(a => a.id === job.appointmentId);
      if (job.eventType === "DELAY_NOTICE" && appointment &&
        (job.appointmentVersion !== appointment.version || !canSendDelayNotice(appointment, now) ||
          (job.estimatedStartAt && Date.parse(job.estimatedStartAt) <= now))) {
        job.status = "SKIPPED";
        job.lastError = job.appointmentVersion !== appointment.version
          ? "OBSOLETE_VERSION" : "DELAY_NOTICE_NO_LONGER_APPLICABLE";
      } else {
        job.status = "SENT";
        job.attempts = 1;
      }
    });
    for (const [m, re, h] of routes) {
      const match = re.exec(path);
      if (m !== method || !match) continue;
      let body: unknown;
      try { body = init.body ? JSON.parse(String(init.body)) : undefined; } catch { throw new P(400, "Invalid request"); }
      const isCommand = (method === "POST" && /\/(check-in|progress|reschedule|cancel|next|skip|amendments|issue|telehealth-session|start|end)$/.test(path)) ||
        (method === "PUT" && /\/(record|prescriptions\/[^/]+)$/.test(path)) ||
        (method === "POST" && (/^\/appointments$/.test(path) || /^\/encounters\/[^/]+\/prescriptions$/.test(path)));
      if (isCommand) need(headers.get("Idempotency-Key"),400,"Valid Idempotency-Key required");
      const out = h({ db, actor: { id: u!.id, roles: u!.roles }, body, query: url.searchParams, params: match.slice(1), headers, now });
      persist();
      if (out instanceof Response) return out;
      return out === undefined ? res(204) : res(200, out);
    }
    throw new P(404, "Resource not found");
  } catch (e) {
    if (e instanceof P) return prob(e);
    console.error("[mock]", e);
    return prob(new P(503, "Storage or audit temporarily unavailable"));
  }
}
