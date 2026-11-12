import { api, newIdempotencyKey, requireBackend } from "./client";
import type { QueueTicket } from "@/types";

/**
 * NOT IMPLEMENTED IN BACKEND YET. Contract: docs/api/openapi.yaml
 *   POST /appointments/{appointmentId}/check-in   (RECEPTIONIST, Idempotency-Key)
 *   → QueueTicket; repeating the call returns the same ticket.
 * Guarded by VITE_BACKEND_CHECKIN: while false this never touches the network
 * and never fabricates a success.
 */
export async function checkIn(
  appointmentId: string,
  idempotencyKey: string = newIdempotencyKey(),
): Promise<QueueTicket> {
  requireBackend("checkin");
  return api.post<QueueTicket>(
    `/appointments/${appointmentId}/check-in`,
    undefined,
    idempotencyKey,
  );
}
