import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { scanAppointments } from "@/api/appointments";
import { errorMessage } from "@/core/client";
import { useSession } from "@/core/session";
import type { Appointment } from "@/core/types";

interface PatientCtx {
  patientId: string;
  appointments: Appointment[];
  loading: boolean;
  error: string;
  truncated: boolean;
  reload: () => Promise<void>;
}
const Ctx = createContext<PatientCtx | null>(null);
export const usePatient = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePatient phải nằm trong PatientProvider");
  return v;
};

/** Lịch hẹn của bệnh nhân (backend tự giới hạn theo tài khoản). patientId lấy từ /me/profile, không suy ra từ user ID. */
export function PatientProvider() {
  const { identity } = useSession();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  const gen = useRef(0);

  const reload = useCallback(async () => {
    const id = ++gen.current;
    setError("");
    try {
      const r = await scanAppointments();
      if (id !== gen.current) return;
      setAppointments(r.items);
      setTruncated(r.truncated);
    } catch (e) {
      if (id === gen.current) setError(errorMessage(e));
    } finally {
      if (id === gen.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    const t = setInterval(() => void reload(), 60_000);
    return () => { gen.current++; clearInterval(t); };
  }, [reload]);

  const value = useMemo(
    () => ({ patientId: identity?.patientId ?? "", appointments, loading, error, truncated, reload }),
    [identity?.patientId, appointments, loading, error, truncated, reload],
  );
  return (
    <Ctx.Provider value={value}>
      <Outlet />
    </Ctx.Provider>
  );
}
