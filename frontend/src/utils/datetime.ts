const TZ = 'Asia/Ho_Chi_Minh';

export function toLocalDisplay(isoUtc: string): string {
  if (!isoUtc) return '—';
  return new Date(isoUtc).toLocaleString('vi-VN', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalTime(isoUtc: string): string {
  if (!isoUtc) return '—';
  return new Date(isoUtc).toLocaleTimeString('vi-VN', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toLocalDate(isoUtc: string): string {
  if (!isoUtc) return '—';
  return new Date(isoUtc).toLocaleDateString('vi-VN', {
    timeZone: TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function toLocalDateShort(isoUtc: string): string {
  if (!isoUtc) return '—';
  return new Date(isoUtc).toLocaleDateString('vi-VN', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function canRescheduleOrCancel(startAt: string): boolean {
  if (!startAt) return false;
  const now = new Date();
  const start = new Date(startAt);
  const diffMs = start.getTime() - now.getTime();
  return diffMs >= 2 * 60 * 60 * 1000; // >= 2 hours
}

export function generateIdempotencyKey(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function todayLocalDate(): string {
  // Returns YYYY-MM-DD in Asia/Ho_Chi_Minh
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts;
}
