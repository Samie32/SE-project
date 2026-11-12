import { api } from "./client";
import type { Appointment } from "@/types";
import { dayKey } from "@/utils/datetime";

export const PAGE_SIZE = 100; // backend maximum

export interface AppointmentScan {
  items: Appointment[];
  /** true when the page cap was hit before the end of the data/day */
  truncated: boolean;
}

/**
 * GET /api/appointments?limit&offset (ADMINISTRATOR / RECEPTIONIST see all).
 * Results are ordered by start_at, so when `untilDay` is given we can stop as
 * soon as a page reaches a later day.
 */
export async function scanAppointments(opts: {
  untilDay?: string;
  maxPages?: number;
}): Promise<AppointmentScan> {
  const maxPages = opts.maxPages ?? 20;
  const items: Appointment[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await api.get<Appointment[]>(
      `/appointments?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`,
    );
    items.push(...rows);
    if (rows.length < PAGE_SIZE) return { items, truncated: false };
    const last = rows[rows.length - 1];
    if (opts.untilDay && dayKey(last.startAt) > opts.untilDay)
      return { items, truncated: false };
  }
  return { items, truncated: true };
}
