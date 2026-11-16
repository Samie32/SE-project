import { useAsync } from "@/core/useAsync";
import { scanAppointments } from "@/api/appointments";

/** Toàn bộ lịch hẹn (lễ tân/quản trị) hoặc lịch được gán (bác sĩ), gom nhiều trang. */
export const useAppointments = () => useAsync(() => scanAppointments(), []);
