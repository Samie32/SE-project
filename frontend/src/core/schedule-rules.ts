import { addDays, dayKey, formatTime, todayKey } from "./datetime";
import { clinicWindow, DEFAULT_CLINIC_HOURS, findClinicHoliday, type ClinicDayHours, type ClinicHolidayWindow } from "./clinic-hours";

export const SHIFT_PRESETS = [
  {id:"morning",label:"Ca sáng",start:"08:00",end:"12:00"},
  {id:"afternoon",label:"Ca chiều",start:"13:00",end:"17:00"},
] as const;

export function nextWorkingDay(
  days: readonly ClinicDayHours[] = DEFAULT_CLINIC_HOURS,
  holidays: readonly ClinicHolidayWindow[] = [],
) {
  const tomorrow = addDays(todayKey(), 1);
  for (let offset = 0; offset < 30; offset++) {
    const day = addDays(tomorrow, offset);
    if (clinicWindow(day, days, holidays)) return day;
  }
  return tomorrow;
}

export function shiftPresets(
  date: string,
  days: readonly ClinicDayHours[],
  holidays: readonly ClinicHolidayWindow[] = [],
) {
  const window = clinicWindow(date, days, holidays);
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
export function scheduleIntervalError(
  startAt: string,
  endAt: string,
  now = Date.now(),
  days: readonly ClinicDayHours[] = DEFAULT_CLINIC_HOURS,
  holidays: readonly ClinicHolidayWindow[] = [],
): string {
  const start=Date.parse(startAt),end=Date.parse(endAt);
  if (!Number.isFinite(start)||!Number.isFinite(end)) return "Chọn đầy đủ ngày và giờ hợp lệ.";
  if (start>=end) return "Giờ kết thúc phải sau giờ bắt đầu.";
  if (start%60000 || end%60000) return "Thời gian cần chính xác đến phút.";
  if (dayKey(startAt)!==dayKey(endAt)) return "Mỗi ca hoặc khoảng nghỉ phải nằm trong cùng một ngày.";
  const date = dayKey(startAt);
  const window = clinicWindow(date, days, holidays);
  if (!window) {
    const holiday = findClinicHoliday(date, holidays);
    return holiday?.name ? `Phòng khám nghỉ lễ (${holiday.name}).` : "Phòng khám nghỉ ngày này.";
  }
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
  holidays: readonly ClinicHolidayWindow[] = [],
): { start: string; end: string } {
  const window = clinicWindow(date, days, holidays);
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

/**
 * Gợi ý khung giờ nghỉ hợp lệ nằm gọn bên trong khoảng [boundStart, boundEnd],
 * đẩy qua thời điểm hiện tại nếu là hôm nay và tránh các lịch nghỉ đã có.
 */
export function suggestBreakInterval(
  date: string,
  boundStart: string,
  boundEnd: string,
  existingBreaks: readonly { startAt: string; endAt: string }[] = [],
  preferredMinutes = 60,
  slotMinutes?: number,
  now = Date.now(),
): { start: string; end: string } | null {
  const B_START = toMin(boundStart);
  const B_END = toMin(boundEnd);
  if (!Number.isFinite(B_START) || !Number.isFinite(B_END) || B_START >= B_END) return null;

  let earliest = B_START;
  if (date === dayKey(new Date(now))) {
    const [nh, nm] = formatTime(new Date(now).toISOString()).split(":").map(Number);
    const nowMin = nh * 60 + nm;
    if (nowMin + 1 >= B_END) return null;
    if (slotMinutes && slotMinutes > 0) {
      const steps = Math.floor((Math.max(B_START, nowMin + 1) - B_START + slotMinutes - 1) / slotMinutes);
      const nextSlot = B_START + steps * slotMinutes;
      earliest = nextSlot < B_END ? nextSlot : Math.max(B_START, nowMin + 1);
    } else {
      const rounded = Math.ceil((nowMin + 1) / 5) * 5;
      earliest = Math.max(B_START, rounded < B_END ? rounded : nowMin + 1);
    }
  }

  const sorted = existingBreaks
    .filter((b) => dayKey(b.startAt) === date)
    .map((b) => [toMin(formatTime(b.startAt)), toMin(formatTime(b.endAt))] as const)
    .filter(([s, e]) => Number.isFinite(s) && Number.isFinite(e) && e > earliest && s < B_END)
    .sort((x, y) => x[0] - y[0]);

  let gapStart = earliest;
  let gapEnd = B_END;
  let found = false;
  for (const [bs, be] of sorted) {
    if (bs > gapStart) {
      gapEnd = Math.min(B_END, bs);
      found = true;
      break;
    }
    gapStart = Math.max(gapStart, be);
  }
  if (!found) {
    if (gapStart >= B_END) return null;
    gapEnd = B_END;
  }

  const avail = gapEnd - gapStart;
  const dur = Math.min(avail, Math.max(1, preferredMinutes));
  return { start: toHHMM(gapStart), end: toHHMM(gapStart + dur) };
}

export interface BreakSlotImpact {
  affectedCount: number;
  totalSlots: number;
  aligned: boolean;
  blockedStart?: string;
  blockedEnd?: string;
  blockedMinutes: number;
}

/** Tính chính xác số lượt khám trong ca bị khóa bởi một khoảng nghỉ. */
export function analyzeBreakImpact(
  shift: { startAt: string; endAt: string; slotMinutes: number },
  breakStartAt: string,
  breakEndAt: string,
): BreakSlotImpact {
  const sStart = Date.parse(shift.startAt);
  const sEnd = Date.parse(shift.endAt);
  const bStart = Date.parse(breakStartAt);
  const bEnd = Date.parse(breakEndAt);
  const step = shift.slotMinutes * 60000;
  if (!Number.isFinite(sStart) || !Number.isFinite(sEnd) || !Number.isFinite(bStart) || !Number.isFinite(bEnd) || step <= 0 || bStart >= bEnd) {
    return { affectedCount: 0, totalSlots: 0, aligned: true, blockedMinutes: 0 };
  }
  const totalSlots = Math.floor((sEnd - sStart) / step);
  let affectedCount = 0;
  let firstSlotStart: number | undefined;
  let lastSlotEnd: number | undefined;
  for (let t = sStart; t + step <= sEnd; t += step) {
    if (bStart < t + step && bEnd > t) {
      affectedCount++;
      if (firstSlotStart === undefined) firstSlotStart = t;
      lastSlotEnd = t + step;
    }
  }
  const blockedMinutes = firstSlotStart !== undefined && lastSlotEnd !== undefined ? Math.round((lastSlotEnd - firstSlotStart) / 60000) : 0;
  const aligned = firstSlotStart === undefined || (bStart === firstSlotStart && bEnd === lastSlotEnd);
  return {
    affectedCount,
    totalSlots,
    aligned,
    blockedStart: firstSlotStart !== undefined ? formatTime(new Date(firstSlotStart).toISOString()) : undefined,
    blockedEnd: lastSlotEnd !== undefined ? formatTime(new Date(lastSlotEnd).toISOString()) : undefined,
    blockedMinutes,
  };
}
