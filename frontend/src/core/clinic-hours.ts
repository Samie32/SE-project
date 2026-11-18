export interface ClinicDayHours {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
}

export interface WeeklyClinicHours {
  days: ClinicDayHours[];
}

export const CLINIC_WEEKDAYS = ["Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ nhật"];

export const DEFAULT_CLINIC_HOURS: ClinicDayHours[] = CLINIC_WEEKDAYS.map((_, index) => ({
  dayOfWeek: index + 1,
  opensAt: index === 6 ? null : "08:00",
  closesAt: index === 6 ? null : "17:00",
}));

const HH_MM = /^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

export function isValidClinicDay(day: ClinicDayHours) {
  return (day.opensAt === null && day.closesAt === null)
    || (typeof day.opensAt === "string" && typeof day.closesAt === "string"
      && HH_MM.test(day.opensAt) && HH_MM.test(day.closesAt) && day.opensAt < day.closesAt);
}

export function clinicWindow(date: string, days: readonly ClinicDayHours[]) {
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay() || 7;
  const day = days.find(item => item.dayOfWeek === weekday);
  return day?.opensAt && day.closesAt ? { start: day.opensAt, end: day.closesAt } : null;
}

export function clinicDayMinutes(day: ClinicDayHours): number {
  if (!isValidClinicDay(day) || day.opensAt === null || day.closesAt === null) return 0;
  const [oh, om] = day.opensAt.split(":").map(Number);
  const [ch, cm] = day.closesAt.split(":").map(Number);
  return (ch * 60 + cm) - (oh * 60 + om);
}

export function formatDurationMinutes(minutes: number): string {
  if (minutes <= 0) return "0 giờ";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} phút`;
  if (mins === 0) return `${hours} giờ`;
  return `${hours} giờ ${mins} phút`;
}

export interface ClinicHoursPreset {
  id: string;
  label: string;
  description: string;
  days: ClinicDayHours[];
}

function buildWeek(fn: (dayOfWeek: number) => [string, string] | null): ClinicDayHours[] {
  return CLINIC_WEEKDAYS.map((_, index) => {
    const dayOfWeek = index + 1;
    const range = fn(dayOfWeek);
    return {
      dayOfWeek,
      opensAt: range ? range[0] : null,
      closesAt: range ? range[1] : null,
    };
  });
}

export const CLINIC_HOURS_PRESETS: ClinicHoursPreset[] = [
  {
    id: "standard",
    label: "Mặc định (T2–T7)",
    description: "08:00 – 17:00 · Nghỉ Chủ nhật",
    days: DEFAULT_CLINIC_HOURS,
  },
  {
    id: "weekdays",
    label: "Hành chính (T2–T6)",
    description: "08:00 – 17:00 · Nghỉ T7 & CN",
    days: buildWeek(d => (d <= 5 ? ["08:00", "17:00"] : null)),
  },
  {
    id: "saturday-morning",
    label: "Sáng Thứ Bảy",
    description: "T2–T6: 08:00–17:00 · T7: 08:00–12:00",
    days: buildWeek(d => (d <= 5 ? ["08:00", "17:00"] : d === 6 ? ["08:00", "12:00"] : null)),
  },
  {
    id: "full-week",
    label: "Cả tuần (T2–CN)",
    description: "07:30 – 17:30 · Mở cửa 7 ngày",
    days: buildWeek(() => ["07:30", "17:30"]),
  },
];
