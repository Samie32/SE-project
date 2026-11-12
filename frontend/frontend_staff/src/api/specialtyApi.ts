import { api } from "./client";
import type { Specialty } from "@/types";

const asBool = (v: unknown) => v === true || v === 1 || v === "1";

export async function listSpecialties(): Promise<Specialty[]> {
  const rows = await api.get<Specialty[]>("/specialties");
  return rows.map((r) => ({ ...r, active: asBool(r.active) }));
}

// POST /api/specialties { name } — ADMINISTRATOR only.
export const createSpecialty = (name: string) =>
  api.post<Specialty>("/specialties", { name });
