import { api, newIdempotencyKey, requireBackend } from "./client";
import type { QueueStatus, QueueTicket } from "@/types";

// All functions are guarded by VITE_BACKEND_QUEUE (backend has no queue module yet).

/**
 * PROPOSED (not in openapi.yaml): the design has no endpoint that LISTS tickets.
 * Backend must add e.g. GET /queue-tickets?date=YYYY-MM-DD&doctorId=&status=
 * returning QueueTicket[] (with doctorId, patientId, checkedInAt).
 */
export async function listQueue(params: {
  date: string;
  doctorId?: string;
  status?: QueueStatus;
}): Promise<QueueTicket[]> {
  requireBackend("queue");
  const q = new URLSearchParams({ date: params.date });
  if (params.doctorId) q.set("doctorId", params.doctorId);
  if (params.status) q.set("status", params.status);
  return api.get<QueueTicket[]>(`/queue-tickets?${q.toString()}`);
}

/**
 * openapi.yaml: POST /doctors/{doctorId}/queue/next  (Idempotency-Key)
 * Design assigns this to the assigned DOCTOR; 204 = nothing waiting.
 * If receptionists must call patients, the backend contract has to allow it.
 */
export async function callNext(
  doctorId: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<QueueTicket | null> {
  requireBackend("queue");
  const res = await api.post<QueueTicket | undefined>(
    `/doctors/${doctorId}/queue/next`,
    undefined,
    idempotencyKey,
  );
  return res ?? null;
}

/** openapi.yaml: POST /queue-tickets/{ticketId}/skip { reason } (RECEPTIONIST) */
export async function skipTicket(
  ticketId: string,
  reason: string,
): Promise<QueueTicket> {
  requireBackend("queue");
  return api.post<QueueTicket>(`/queue-tickets/${ticketId}/skip`, { reason });
}
