import { api } from "./client";
import type { NotificationJob } from "@/types";

// GET /api/notification-jobs — RECEPTIONIST / ADMINISTRATOR; newest 100 jobs, no paging params.
export const listNotificationJobs = () =>
  api.get<NotificationJob[]>("/notification-jobs");
