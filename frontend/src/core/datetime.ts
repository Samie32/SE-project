// Mọi thời điểm backend là ISO-8601 UTC; hiển thị theo giờ phòng khám Asia/Ho_Chi_Minh (UTC+7, không DST).
export const TZ = "Asia/Ho_Chi_Minh";

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const dateTimeSecFmt = new Intl.DateTimeFormat("vi-VN", {
  timeZone: TZ,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** YYYY-MM-DD của một thời điểm theo giờ phòng khám. */
export const dayKey = (iso: string | Date) => dayFmt.format(new Date(iso));
export const todayKey = () => dayKey(new Date());
export const formatTime = (iso: string) => timeFmt.format(new Date(iso));
export const formatDate = (iso: string) => dateFmt.format(new Date(iso));
export const formatDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const formatDateTimeSec = (iso: string) => dateTimeSecFmt.format(new Date(iso));
export const formatClock = (d: Date) => dateTimeSecFmt.format(d);

export function addDays(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Thứ hai đầu tuần chứa `key`. */
export function weekStart(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = Thứ Hai
  return addDays(key, -dow);
}

/** Ngày đầu tháng (YYYY-MM-01) chứa `key`. */
export const monthStart = (key: string): string => `${key.slice(0, 7)}-01`;

/** Dịch tháng theo `delta`, trả về YYYY-MM-01. */
export function addMonths(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 10);
}

/** Nhãn tháng năm tiếng Việt, ví dụ "tháng 11 năm 2026". */
export function monthLabel(key: string): string {
  const d = new Date(`${monthStart(key)}T12:00:00Z`);
  const s = new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", month: "long", year: "numeric" }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Danh sách ngày YYYY-MM-DD cho lưới lịch tháng (từ Thứ Hai đầu tuần của ngày 1 đến Chủ Nhật cuối tuần của ngày cuối tháng). */
export function monthGridDays(key: string): string[] {
  const first = monthStart(key);
  const nextFirst = addMonths(first, 1);
  const last = addDays(nextFirst, -1);
  const start = weekStart(first);
  const lastDow = (new Date(`${last}T00:00:00Z`).getUTCDay() + 6) % 7;
  const end = addDays(last, 6 - lastDow);
  const days: string[] = [];
  for (let cur = start; cur <= end; cur = addDays(cur, 1)) days.push(cur);
  return days;
}

export function longDate(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}

export function weekdayShort(key: string): string {
  const d = new Date(`${key}T12:00:00Z`);
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "UTC", weekday: "short" }).format(d);
}

/** Ranh giới ngày giờ phòng khám → ISO instant. */
export const startOfDayIso = (key: string) => new Date(`${key}T00:00:00+07:00`).toISOString();
export const endOfDayIso = (key: string) => new Date(`${key}T23:59:59.999+07:00`).toISOString();

/** "2026-11-12" + "08:30" (giờ phòng khám) → ISO UTC. */
export const localToIso = (day: string, time: string) =>
  new Date(`${day}T${time}:00+07:00`).toISOString();

export function minutesSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

export const MIN = 60_000;
/** BR-08: đổi/hủy khi còn ≥ 2 giờ trước giờ bắt đầu. */
export const canRescheduleOrCancel = (startAt: string, now = Date.now()) =>
  !!startAt && new Date(startAt).getTime() - now >= 2 * 60 * MIN;
/** Phòng chờ từ xa: start-10' đến start+15'. */
export const inJoinWindow = (startAt: string, now = Date.now()) => {
  const s = new Date(startAt).getTime();
  return now >= s - 10 * MIN && now < s + 15 * MIN;
};
/** Check-in: start-15' đến start+15'. */
export const inCheckinWindow = (startAt: string, now = Date.now()) => {
  const s = new Date(startAt).getTime();
  return now >= s - 15 * MIN && now < s + 15 * MIN;
};
/** NO_SHOW từ start+15'. */
export const canMarkNoShow = (startAt: string, now = Date.now()) =>
  now >= new Date(startAt).getTime() + 15 * MIN;

export const canSendDelayNotice = (
  appointment: { startAt: string; status: string; mode: string },
  now = Date.now(),
) =>
  dayKey(appointment.startAt) === dayKey(new Date(now)) &&
  ((appointment.status === "CONFIRMED" && !canMarkNoShow(appointment.startAt, now)) ||
    (appointment.status === "CHECKED_IN" && appointment.mode === "IN_PERSON"));
