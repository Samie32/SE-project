import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSession } from "./session";
import { listDoctors, listSpecialties } from "@/api/catalog";
import { errorMessage } from "./client";
import { doctorLabel } from "./labels";
import type { Doctor, Specialty } from "./types";

/** Danh mục dùng chung (bác sĩ, chuyên khoa) — tải một lần sau khi đăng nhập. */
interface Directory {
  doctors: Doctor[];
  specialties: Specialty[];
  loading: boolean;
  error: string;
  reload: () => void;
  doctorById: (id: string | undefined) => Doctor | undefined;
  /** "BS. Tên" hoặc "Bác sĩ phụ trách" nếu chưa biết. */
  doctorName: (id: string | undefined) => string;
  specialtyName: (id: string | undefined) => string;
  /** Tên các chuyên khoa của một bác sĩ, ngăn cách bằng dấu phẩy. */
  doctorSpecialties: (doctorId: string | undefined) => string;
}

const Ctx = createContext<Directory | null>(null);

export function DirectoryProvider({ children }: { children: ReactNode }) {
  const { roles } = useSession();
  const canRead = roles.some(r => ["PATIENT","DOCTOR","RECEPTIONIST","ADMINISTRATOR"].includes(r));
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const gen = useRef(0);

  const reload = useCallback(() => {
    const id = ++gen.current;
    if (!canRead) { setDoctors([]); setSpecialties([]); setLoading(false); setError(""); return; }
    setLoading(true);
    setError("");
    Promise.all([listDoctors(), listSpecialties()])
      .then(([d, s]) => {
        if (id !== gen.current) return;
        setDoctors(d);
        setSpecialties(s);
      })
      .catch((e: unknown) => {
        if (id === gen.current) setError(errorMessage(e));
      })
      .finally(() => {
        if (id === gen.current) setLoading(false);
      });
  }, [canRead]);
  useEffect(() => {
    reload();
    return () => {
      gen.current++;
    };
  }, [reload]);

  const value = useMemo<Directory>(() => {
    const dMap = new Map(doctors.map((d) => [d.id, d]));
    const sMap = new Map(specialties.map((s) => [s.id, s]));
    return {
      doctors,
      specialties,
      loading,
      error,
      reload,
      doctorById: (id) => (id ? dMap.get(id) : undefined),
      doctorName: (id) => doctorLabel(id ? dMap.get(id)?.displayName : undefined),
      specialtyName: (id) => (id ? (sMap.get(id)?.name ?? "—") : "—"),
      doctorSpecialties: (id) =>
        (id ? (dMap.get(id)?.specialtyIds ?? []) : []).map((s) => sMap.get(s)?.name ?? "—").join(", ") || "—",
    };
  }, [doctors, specialties, loading, error, reload]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDirectory(): Directory {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDirectory phải nằm trong DirectoryProvider");
  return v;
}
