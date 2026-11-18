import { api, apiFetch, ApiError, qs, requireBackend } from "@/core/client";
import type { AuditEvent, AuditQuery, JoinToken, MedicalRecord, NotificationJob, Prescription, PrescriptionItem, QueueStatus, QueueTicket, TelehealthSession, SignalMessage } from "@/core/types";

export const listNotificationJobs = () => api.get<NotificationJob[]>("/notification-jobs");

export function checkIn(appointmentId: string, key: string) {
  requireBackend("checkin");
  return api.post<QueueTicket>(`/appointments/${appointmentId}/check-in`, undefined, key);
}
export async function listQueue(p: {date:string; doctorId:string; status?:QueueStatus}) {
  requireBackend("queue");
  const rows = await api.get<QueueTicket[]>(`/doctors/${p.doctorId}/queue${qs({date:p.date})}`);
  return p.status ? rows.filter(row => row.status === p.status) : rows;
}
export async function callNext(doctorId: string, date: string, key: string) {
  requireBackend("queue");
  // Không nuốt 404 của baseline thành hàng rỗng. 204 là mục tiêu BE-04.
  return (await api.post<QueueTicket | undefined>(`/doctors/${doctorId}/queue/next${qs({date})}`, undefined, key)) ?? null;
}
export function skipTicket(ticketId: string, reason: string, version: number, key: string) {
  requireBackend("queue");
  return api.post<QueueTicket>(`/queue-tickets/${ticketId}/skip`, {reason,version}, key);
}

async function history<T>(path: string): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += 100) {
    const rows = await api.get<T[]>(path + qs({limit:100,offset}));
    result.push(...rows);
    if (rows.length < 100) return result;
  }
}
export function listPatientRecords(patientId: string) {
  requireBackend("clinical");
  return history<MedicalRecord>(`/patients/${patientId}/records`);
}
export async function getEncounterRecord(encounterId: string) {
  requireBackend("clinical");
  try { return await api.get<MedicalRecord>(`/encounters/${encounterId}/record`); }
  catch (error) { if (error instanceof ApiError && error.status === 404) return null; throw error; }
}
export function listEncounterPrescriptions(encounterId: string) {
  requireBackend("clinical");
  return api.get<Prescription[]>(`/encounters/${encounterId}/prescriptions`);
}
export function saveRecord(encounterId: string, body: {version:number; content:string; status:"DRAFT"|"FINAL"}, key:string) {
  requireBackend("clinical");
  return api.put<MedicalRecord>(`/encounters/${encounterId}/record`, body, key);
}
export function amendRecord(recordId: string, body: {content:string; reason:string; version:number}, key:string) {
  requireBackend("clinical");
  return api.post<MedicalRecord>(`/records/${recordId}/amendments`, body, key);
}
export function createPrescription(encounterId: string, items: PrescriptionItem[], key:string) {
  requireBackend("clinical");
  return api.post<Prescription>(`/encounters/${encounterId}/prescriptions`, {items}, key);
}
export function updatePrescription(id:string, version:number, items:PrescriptionItem[], key:string) {
  requireBackend("clinical");
  return api.put<Prescription>(`/prescriptions/${id}`, {version,items}, key);
}
export function issuePrescription(id:string, version:number, key:string) {
  requireBackend("clinical");
  return api.post<Prescription>(`/prescriptions/${id}/issue`, {version}, key);
}
export function listPatientPrescriptions(patientId: string) {
  requireBackend("clinical");
  return history<Prescription>(`/patients/${patientId}/prescriptions`);
}

export function prepareSession(appointmentId:string, key:string) {
  requireBackend("telehealth");
  return api.post<TelehealthSession>(`/appointments/${appointmentId}/telehealth-session`, undefined, key);
}
export function getSession(id:string, signal?:AbortSignal) {
  requireBackend("telehealth");
  return apiFetch<TelehealthSession>(`/telehealth-sessions/${id}`, {signal});
}
export function getAppointmentSession(appointmentId: string) {
  requireBackend("telehealth");
  return api.get<TelehealthSession>(`/appointments/${appointmentId}/telehealth-session`);
}
export function joinSession(id:string, consent:boolean, signal?:AbortSignal) {
  requireBackend("telehealth");
  return apiFetch<JoinToken>(`/telehealth-sessions/${id}/join`, {method:"POST",body:JSON.stringify({consent}),signal});
}
export function startSession(id:string, version:number, key:string) {
  requireBackend("telehealth");
  return api.post<TelehealthSession>(`/telehealth-sessions/${id}/start`, {version}, key);
}
export function endSession(id:string, version:number, key:string) {
  requireBackend("telehealth");
  return api.post<TelehealthSession>(`/telehealth-sessions/${id}/end`, {version}, key);
}
export function updateConnection(id:string, version:number, state:"ACTIVE"|"RECONNECTING", token:string, signal?:AbortSignal) {
  requireBackend("telehealth");
  return apiFetch<TelehealthSession>(`/telehealth-sessions/${id}/connection`, {method:"POST",headers:{"X-Room-Token":token},body:JSON.stringify({version,state}),signal});
}
export function pollSignals(id:string, token:string, after=0, signal?:AbortSignal) {
  requireBackend("telehealth");
  return apiFetch<SignalMessage[]>(`/telehealth-sessions/${id}/signals${qs({after})}`, {headers:{"X-Room-Token":token},signal});
}
export function sendSignal(id:string, token:string, kind:SignalMessage["kind"], payload:string, signal?:AbortSignal) {
  requireBackend("telehealth");
  return apiFetch<{accepted:true}>(`/telehealth-sessions/${id}/signals`, {method:"POST",headers:{"X-Room-Token":token},body:JSON.stringify({kind,payload}),signal});
}
export function listAuditEvents(q:AuditQuery) {
  requireBackend("audit");
  return api.get<AuditEvent[]>(`/audit-events${qs({...q})}`);
}
