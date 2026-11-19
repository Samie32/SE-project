import { addDays, dayKey, formatTime, todayKey } from "./datetime";
import { clinicWindow, DEFAULT_CLINIC_HOURS, type ClinicDayHours } from "./clinic-hours";

export const SHIFT_PRESETS = [
  {id:"morning",label:"Ca sáng",start:"08:00",end:"12:00"},
  {id:"afternoon",label:"Ca chiều",start:"13:00",end:"17:00"},
] as const;

export function nextWorkingDay(days: readonly ClinicDayHours[] = DEFAULT_CLINIC_HOURS) {
  const tomorrow = addDays(todayKey(), 1);
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(tomorrow, offset);
    if (clinicWindow(day, days)) return day;
  }
  return tomorrow;
}

export function shiftPresets(date: string, days: readonly ClinicDayHours[]) {
  const window = clinicWindow(date, days);
  if (!window) return [];
  const halfDays = SHIFT_PRESETS.map(preset => ({
    ...preset,
    start: preset.id === "morning" ? window.start : (window.start > preset.start ? window.start : preset.start),
    end: preset.id === "afternoon" ? window.end : (window.end < preset.end ? window.end : preset.end),
  })).filter(preset => preset.start < preset.end);
  return halfDays.length ? halfDays : [{ id: "day", label: "Giờ hoạt động", ...window }];
}
export const overlaps=(start:string,end:string,other:{startAt:string;endAt:string})=>
  Date.parse(start)<Date.parse(other.endAt) && Date.parse(end)>Date.parse(other.startAt);

/** Same interval rules as BE ScheduleService; times are evaluated in clinic timezone. */
export function scheduleIntervalError(startAt:string,endAt:string,now=Date.now(), days: readonly ClinicDayHours[] = DEFAULT_CLINIC_HOURS):string {
  const start=Date.parse(startAt),end=Date.parse(endAt);
  if (!Number.isFinite(start)||!Number.isFinite(end)) return "Chọn đầy đủ ngày và giờ hợp lệ.";
  if (start>=end) return "Giờ kết thúc phải sau giờ bắt đầu.";
  if (start%60000 || end%60000) return "Thời gian cần chính xác đến phút.";
  if (dayKey(startAt)!==dayKey(endAt)) return "Mỗi ca hoặc khoảng nghỉ phải nằm trong cùng một ngày.";
  const window = clinicWindow(dayKey(startAt), days);
  if (!window) return "Phòng khám nghỉ ngày này.";
  if (formatTime(startAt) < window.start || formatTime(endAt) > window.end)
    return `Giờ phòng khám từ ${window.start} đến ${window.end} (giờ Việt Nam).`;
  if (start<=now) return "Thời gian bắt đầu phải ở trong tương lai.";
  return "";
}

export function slotDurationError(startAt:string,endAt:string,minutes:number):string {
  if (!Number.isInteger(minutes)||minutes<1||minutes>540) return "Mỗi lượt khám cần từ 1 đến 540 phút nguyên.";
  const duration=(Date.parse(endAt)-Date.parse(startAt))/60000;
  if (duration<minutes) return "Ca làm việc ngắn hơn một lượt khám.";
  if (duration%minutes!==0) return `Thời lượng ca phải chia hết cho ${minutes} phút/lượt. Hãy đổi giờ hoặc độ dài lượt khám.`;
  return "";
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};
const toHHMM = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/**
 * Tự động chuẩn hóa khung giờ (start, end) về khoảng hợp lệ trong giờ phòng khám,
 * đẩy qua thời điểm hiện tại nếu là hôm nay, và căn chỉnh thời lượng chia hết cho `slotMinutes` (nếu có).
 */
export function suggestValidInterval(
  date: string,
  start: string,
  end: string,
  slotMinutes?: number,
  now = Date.now(),
  days: readonly ClinicDayHours[] = DEFAULT_CLINIC_HOURS,
): { start: string; end: string } {
  const window = clinicWindow(date, days);
  if (!window) return { start, end };
  const OPEN = toMin(window.start);
  const CLOSE = toMin(window.end);
  let s = toMin(start);
  let e = toMin(end);
  if (!Number.isFinite(s)) s = OPEN;
  if (!Number.isFinite(e)) e = CLOSE;
  const origDur = Math.max(slotMinutes && slotMinutes > 0 ? slotMinutes : 60, e - s);

  s = Math.max(OPEN, Math.min(CLOSE - 1, s));
  if (date === dayKey(new Date(now))) {
    const [nh, nm] = formatTime(new Date(now).toISOString()).split(":").map(Number);
    const nowMin = nh * 60 + nm;
    const minStart = Math.max(OPEN, Math.ceil((nowMin + 1) / 5) * 5);
    if (minStart < CLOSE && s <= nowMin) s = minStart;
  }

  e = Math.min(CLOSE, s + origDur);
  if (e <= s) e = CLOSE;

  if (slotMinutes && slotMinutes > 0 && e > s) {
    const rem = (e - s) % slotMinutes;
    if (rem !== 0) {
      const floored = e - rem;
      if (floored > s) e = floored;
      else if (s + slotMinutes <= CLOSE) e = s + slotMinutes;
    }
  }
  return { start: toHHMM(s), end: toHHMM(e) };
}
