import { api } from "@/core/client";
import type { WeeklyClinicHours } from "@/core/clinic-hours";

export interface ClinicHoliday {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export interface ClinicHolidayInput {
  startDate: string;
  endDate: string;
  name: string;
  closed: boolean;
  opensAt: string | null;
  closesAt: string | null;
}

export const getClinicHours = () => api.get<WeeklyClinicHours>("/clinic/hours");
export const updateClinicHours = (body: WeeklyClinicHours) => api.put<WeeklyClinicHours>("/clinic/hours", body);
export const listClinicHolidays = () => api.get<ClinicHoliday[]>("/clinic/holidays");
export const createClinicHoliday = (body: ClinicHolidayInput) => api.post<ClinicHoliday>("/clinic/holidays", body);
export const deleteClinicHoliday = (id: string) => api.delete<void>(`/clinic/holidays/${id}`);
