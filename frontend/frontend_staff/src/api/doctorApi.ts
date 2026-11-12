import { api } from "./client";
import type {
  Availability,
  Doctor,
  DoctorRow,
  DoctorUpdateInput,
  TimeOff,
} from "@/types";

const asBool = (v: unknown) => v === true || v === 1 || v === "1";

/** The API returns one row per (doctor, specialty); group them by doctor id. */
export function groupDoctors(rows: DoctorRow[]): Doctor[] {
  const map = new Map<string, Doctor>();
  for (const r of rows) {
    const d = map.get(r.id);
    if (d) {
      if (!d.specialtyIds.includes(r.specialtyId)) d.specialtyIds.push(r.specialtyId);
    } else {
      map.set(r.id, {
        id: r.id,
        displayName: r.displayName,
        active: asBool(r.active),
        specialtyIds: [r.specialtyId],
      });
    }
  }
  return [...map.values()];
}

export async function listDoctors(): Promise<Doctor[]> {
  return groupDoctors(await api.get<DoctorRow[]>("/doctors"));
}

// POST /api/doctors { userId, specialtyIds } — ADMINISTRATOR only.
export const createDoctor = (userId: string, specialtyIds: string[]) =>
  api.post<{ id: string }>("/doctors", { userId, specialtyIds });

// PUT /api/doctors/{id} { active, displayName, specialtyIds } — ADMINISTRATOR only.
export const updateDoctor = (id: string, body: DoctorUpdateInput) =>
  api.put<{ id: string }>(`/doctors/${id}`, body);

// GET /api/doctors/{id}/availability | time-off — owner doctor or ADMINISTRATOR.
export const listAvailability = (id: string) =>
  api.get<Availability[]>(`/doctors/${id}/availability`);
export const listTimeOff = (id: string) =>
  api.get<TimeOff[]>(`/doctors/${id}/time-off`);
