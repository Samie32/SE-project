import { api, requireBackend } from "./client";
import type { AuditEvent, AuditQuery } from "@/types";

/**
 * NOT IMPLEMENTED IN BACKEND YET (the backend only WRITES audit_event rows).
 * Contract: docs/api/openapi.yaml GET /audit-events?limit&offset&actorId&resourceId&from&to
 * Read-only by design: this module intentionally exposes no write/delete call.
 * Guarded by VITE_BACKEND_AUDIT.
 */
export async function listAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
  requireBackend("audit");
  const q = new URLSearchParams({
    limit: String(query.limit),
    offset: String(query.offset),
  });
  if (query.actorId) q.set("actorId", query.actorId);
  if (query.resourceId) q.set("resourceId", query.resourceId);
  if (query.from) q.set("from", query.from);
  if (query.to) q.set("to", query.to);
  return api.get<AuditEvent[]>(`/audit-events?${q.toString()}`);
}
