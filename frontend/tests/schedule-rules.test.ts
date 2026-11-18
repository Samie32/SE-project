import { expect,it } from "vitest";
import { scheduleIntervalError,slotDurationError,overlaps } from "@/core/schedule-rules";
import { localToIso as iso } from "@/core/datetime";
const day="2030-01-08",now=Date.parse("2030-01-07T00:00:00Z");
it("ca hợp lệ trong giờ Việt Nam và slot mặc định 20 phút",()=>{
  expect(scheduleIntervalError(iso(day,"08:00"),iso(day,"12:00"),now)).toBe("");
  expect(slotDurationError(iso(day,"08:00"),iso(day,"12:00"),20)).toBe("");
});
it("chặn ngoài giờ, Chủ nhật, qua ngày, ngày cũ và dữ liệu thiếu",()=>{
  for (const [s,e] of [[iso(day,"07:59"),iso(day,"12:00")],[iso("2030-01-06","08:00"),iso("2030-01-06","12:00")],[iso(day,"08:00"),iso("2030-01-09","12:00")],[iso("2020-01-01","08:00"),iso("2020-01-01","12:00")],["",""]]) {
    expect(scheduleIntervalError(s,e,now)).not.toBe("");
  }
});
it("chặn ca không chia hết slot và cho phép ca liền kề",()=>{
  expect(slotDurationError(iso(day,"08:00"),iso(day,"12:00"),45)).not.toBe("");
  const existing={startAt:iso(day,"08:00"),endAt:iso(day,"10:00")};
  expect(overlaps(iso(day,"09:00"),iso(day,"11:00"),existing)).toBe(true);
  expect(overlaps(iso(day,"10:00"),iso(day,"12:00"),existing)).toBe(false);
});
