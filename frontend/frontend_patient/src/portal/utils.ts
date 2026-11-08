export {
  toLocalDateShort,
  toLocalTime,
  toLocalDisplay,
  todayLocalDate,
  canRescheduleOrCancel,
} from "../utils/datetime";
export const isUpcoming = (a: { status: string; startAt: string }) =>
  ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status) &&
  new Date(a.startAt).getTime() > Date.now();
// Reuse the key for an identical retry after an ambiguous network/5xx error.
export function mutationKey(
  ref: { current: { fingerprint: string; key: string } | null },
  fingerprint: string,
) {
  if (ref.current?.fingerprint !== fingerprint)
    ref.current = { fingerprint, key: crypto.randomUUID() };
  return ref.current!.key;
}
