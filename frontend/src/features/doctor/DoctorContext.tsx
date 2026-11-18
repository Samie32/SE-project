import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { scanAppointments } from "@/api/appointments";
import { errorMessage } from "@/core/client";
import { useSession } from "@/core/session";
import type { Appointment } from "@/core/types";

interface DoctorCtx {
  /** doctor.id của người dùng hiện tại (khác user.id). undefined khi chưa xác định được. */
  doctorId: string | undefined;
  resolving: boolean;
  error: string;
  appointments: Appointment[];
  loading: boolean;
  truncated: boolean;
  reload: () => Promise<void>;
}
const Ctx = createContext<DoctorCtx | null>(null);
export const useDoctor = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useDoctor phải nằm trong DoctorProvider");
  return v;
};

/** Danh tính bác sĩ lấy trực tiếp từ profile đã xác thực. */
export function DoctorProvider() {
  const { identity } = useSession();
  const doctorId = identity?.doctorId ?? undefined;
  const resolving = false;
  const [error, setError] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const gen = useRef(0);

  const reload = useCallback(async () => {
    const id = ++gen.current;
    setError("");
    try {
      const r = await scanAppointments();
      if (id !== gen.current) return;
      setAppointments(r.items); setTruncated(r.truncated);
    } catch (e) { if (id === gen.current) setError(errorMessage(e)); }
    finally { if (id === gen.current) setLoading(false); }
  }, []);
  useEffect(() => { void reload(); return () => { gen.current++; }; }, [reload]);

  const profileError = doctorId ? error : "Tài khoản chưa có hồ sơ bác sĩ. Hãy liên hệ quản trị viên.";
  const value = useMemo(() => ({ doctorId, resolving, error:profileError, appointments, loading, truncated, reload }), [doctorId, resolving, profileError, appointments, loading, truncated, reload]);
  return <Ctx.Provider value={value}><Outlet /></Ctx.Provider>;
}
