import { api, qs } from "@/core/client";
import type { Availability, AvailabilityInput, AppointmentMode, Slot, TimeOff } from "@/core/types";

// GET/POST /api/doctors/{id}/availability | time-off — bác sĩ sở hữu hoặc quản trị.
export const listAvailability = (doctorId: string) =>
  api.get<Availability[]>(`/doctors/${doctorId}/availability`);
export const createAvailability = (doctorId: string, body: AvailabilityInput) =>
  api.post<Availability>(`/doctors/${doctorId}/availability`, body);
export const listTimeOff = (doctorId: string) => api.get<TimeOff[]>(`/doctors/${doctorId}/time-off`);
export const createTimeOff = (doctorId: string, body: { startAt: string; endAt: string }) =>
  api.post<TimeOff>(`/doctors/${doctorId}/time-off`, body);

// GET /api/slots?date=YYYY-MM-DD[&doctorId&specialtyId&mode]
export const listSlots = (p: {
  date: string;
  doctorId?: string;
  specialtyId?: string;
  mode?: AppointmentMode;
}) => api.get<Slot[]>(`/slots${qs(p)}`);
