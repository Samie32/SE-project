import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getDoctors,
  getMyAppointments,
  getMe,
  getSpecialties,
} from "../api/appointments";
import type { Appointment, Doctor, Specialty, UserProfile } from "../types";
type PortalData = {
  appointments: Appointment[];
  doctors: Doctor[];
  specialties: Specialty[];
  profile: UserProfile | null;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
};
const Context = createContext<PortalData | null>(null);
export const message = (e: unknown) =>
  e instanceof Error ? e.message : "Đã xảy ra lỗi. Vui lòng thử lại.";
export function PortalProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [me, docs, specs] = await Promise.all([
        getMe(),
        getDoctors(),
        getSpecialties(),
      ]);
      if (!me.roles.includes("PATIENT"))
        throw new Error(
          "Cổng này dành cho bệnh nhân. Vui lòng dùng tài khoản bệnh nhân.",
        );
      const rows: Appointment[] = [];
      // API arrays are paginated: read all pages to avoid hiding upcoming appointments behind old records.
      for (let offset = 0; ; offset += 100) {
        const page = await getMyAppointments({ limit: 100, offset });
        rows.push(...page);
        if (page.length < 100) break;
      }
      if (current !== generation.current) return;
      setProfile(me);
      setDoctors(docs.filter((d) => d.active !== false));
      setSpecialties(specs);
      setAppointments(rows.sort((a, b) => a.startAt.localeCompare(b.startAt)));
    } catch (e) {
      if (current === generation.current) setError(message(e));
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return (
    <Context.Provider
      value={{
        appointments,
        doctors,
        specialties,
        profile,
        loading,
        error,
        reload,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePortal() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing PortalProvider");
  return value;
}
export function doctorName(doctor?: Doctor) {
  const name = doctor?.displayName || doctor?.name;
  return name
    ? /^BS\./i.test(name)
      ? name
      : "BS. " + name
    : "Bác sĩ phụ trách";
}
