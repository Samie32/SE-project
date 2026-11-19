import { api, qs } from "@/core/client";
import { requireBackend } from "@/core/client";
import { dayKey } from "@/core/datetime";
import type { Appointment, AppointmentStatus, NoShowReason, NotificationJob } from "@/core/types";

export const PAGE_SIZE = 100; // tối đa của backend

export const listAppointmentsPage = (limit = PAGE_SIZE, offset = 0) =>
  api.get<Appointment[]>(`/appointments${qs({ limit, offset })}`);

export const getAppointment = (id: string) => api.get<Appointment>(`/appointments/${id}`);

export interface AppointmentScan {
  items: Appointment[];
  /** true khi chạm giới hạn số trang trước khi hết dữ liệu. */
  truncated: boolean;
}

/**
 * Đọc đủ các trang GET /api/appointments (backend sắp theo start_at). Bệnh nhân chỉ thấy lịch của mình,
 * bác sĩ thấy lịch được gán, lễ tân/quản trị thấy toàn bộ. `untilDay` dừng sớm khi trang đã qua ngày đó.
 */
export async function scanAppointments(opts: {
  untilDay?: string;
  maxPages?: number;
} = {}): Promise<AppointmentScan> {
  const maxPages = opts.maxPages ?? 20;
  const items: Appointment[] = [];
  for (let page = 0; page < maxPages; page++) {
    const rows = await listAppointmentsPage(PAGE_SIZE, page * PAGE_SIZE);
    items.push(...rows);
    if (rows.length < PAGE_SIZE) return { items, truncated: false };
    const last = rows[rows.length - 1];
    if (opts.untilDay && dayKey(last.startAt) > opts.untilDay) return { items, truncated: false };
  }
  return { items, truncated: true };
}

// POST /api/appointments { slotId } + Idempotency-Key (bệnh nhân)
export const bookAppointment = (slotId: string, key: string) =>
  api.post<Appointment>("/appointments", { slotId }, key);
export const rescheduleAppointment = (id: string, slotId: string, version: number, key: string) =>
  api.post<Appointment>(`/appointments/${id}/reschedule`, { slotId, version }, key);
export const cancelAppointment = (id: string, reason: string, version: number, key: string) =>
  api.post<Appointment>(`/appointments/${id}/cancel`, { reason, version }, key);

export interface DelayNoticeInput {
  version: number;
  estimatedStartAt?: string;
}

export const sendDelayNotice = (id: string, input: DelayNoticeInput, key: string) =>
  api.post<NotificationJob>(`/appointments/${id}/delay-notice`, input, key);

export interface NoShowFollowUp {
  noShowReason?: NoShowReason;
  sendRebookingEmail?: boolean;
}

/**
 * POST /api/appointments/{id}/progress { targetStatus, version } + Idempotency-Key.
 * Bắt đầu khám trực tiếp (IN_PROGRESS), hoàn tất (COMPLETED), vắng mặt (NO_SHOW).
 */
export async function progressAppointment(
  id: string,
  targetStatus: Extract<AppointmentStatus, "IN_PROGRESS" | "COMPLETED" | "NO_SHOW">,
  version: number,
  key: string,
  followUp?: NoShowFollowUp,
) {
  requireBackend("progress");
  return api.post<Appointment>(`/appointments/${id}/progress`, { targetStatus, version, ...followUp }, key);
}
