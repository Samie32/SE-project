import { api } from "@/core/client";
import { asBool } from "@/core/labels";
import type { Doctor, DoctorRow, DoctorUpdateInput, Role, Specialty } from "@/core/types";

export async function listSpecialties(): Promise<Specialty[]> {
  const rows = await api.get<Specialty[]>("/specialties");
  return rows.map((r) => ({ ...r, active: asBool(r.active) }));
}
// POST /api/specialties { name } — ADMINISTRATOR.
export const createSpecialty = (name: string) => api.post<Specialty>("/specialties", { name });

/** API trả một dòng cho mỗi (bác sĩ, chuyên khoa); gom theo id. */
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
        userId: r.userId,
      });
    }
  }
  return [...map.values()];
}
export async function listDoctors(): Promise<Doctor[]> {
  return groupDoctors(await api.get<DoctorRow[]>("/doctors"));
}
// POST /api/doctors { userId, specialtyIds } — ADMINISTRATOR.
export const createDoctor = (userId: string, specialtyIds: string[]) =>
  api.post<{ id: string }>("/doctors", { userId, specialtyIds });
// PUT /api/doctors/{id} { active, displayName, specialtyIds } — ADMINISTRATOR.
export const updateDoctor = (id: string, body: DoctorUpdateInput) =>
  api.put<{ id: string }>(`/doctors/${id}`, body);

// PUT /api/users/{id}/roles — ADMINISTRATOR.
export const setUserRoles = (userId: string, roles: Role[]) =>
  api.put<void>(`/users/${userId}/roles`, { roles });
// PUT /api/me/contact — chủ tài khoản.
export const updateContact = (email: string) => api.put<void>("/me/contact", { email });
