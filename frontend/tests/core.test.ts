import { describe, expect, it } from "vitest";
import { canMarkNoShow, canRescheduleOrCancel, inCheckinWindow, inJoinWindow, localToIso, MIN } from "@/core/datetime";
import { emptyContent, hasClinicalCore, parseContent, serializeContent } from "@/core/record-content";
import { hasPermission } from "@/core/permissions";
import { groupDoctors } from "@/api/catalog";
import { UUID_RE, asBool } from "@/core/labels";

const S = Date.parse("2026-11-12T03:00:00Z");
describe("quy tắc thời gian", () => {
  it("BR-08: đổi/hủy cần còn ≥ 2 giờ", () => {
    const start = new Date(S).toISOString();
    expect(canRescheduleOrCancel(start, S - 120 * MIN)).toBe(true);
    expect(canRescheduleOrCancel(start, S - 119 * MIN)).toBe(false);
  });
  it("check-in trong [-15, +15) phút", () => {
    const start = new Date(S).toISOString();
    expect(inCheckinWindow(start, S - 16 * MIN)).toBe(false);
    expect(inCheckinWindow(start, S - 15 * MIN)).toBe(true);
    expect(inCheckinWindow(start, S + 14 * MIN)).toBe(true);
    expect(inCheckinWindow(start, S + 15 * MIN)).toBe(false);
  });
  it("phòng từ xa [-10, +15) và NO_SHOW từ +15", () => {
    const start = new Date(S).toISOString();
    expect(inJoinWindow(start, S - 11 * MIN)).toBe(false);
    expect(inJoinWindow(start, S - 10 * MIN)).toBe(true);
    expect(canMarkNoShow(start, S + 14 * MIN)).toBe(false);
    expect(canMarkNoShow(start, S + 15 * MIN)).toBe(true);
  });
  it("giờ địa phương UTC+7", () => expect(localToIso("2026-11-12", "10:00")).toBe("2026-11-12T03:00:00.000Z"));
});

describe("nội dung hồ sơ", () => {
  it("khứ hồi JSON và đọc văn bản thuần", () => {
    const c = { ...emptyContent(), diagnosis: "Cảm", plan: "Nghỉ" };
    expect(parseContent(serializeContent(c))).toEqual(c);
    expect(parseContent("ghi chú cũ").notes).toBe("ghi chú cũ");
    expect(hasClinicalCore(c)).toBe(true);
    expect(hasClinicalCore(emptyContent())).toBe(false);
  });
});

describe("phân quyền giao diện & danh mục", () => {
  it("vai trò → quyền", () => {
    expect(hasPermission(["AUDITOR"], "audit.view")).toBe(true);
    expect(hasPermission(["RECEPTIONIST"], "audit.view")).toBe(false);
    expect(hasPermission(["PATIENT"], "doctor.portal")).toBe(false);
  });
  it("gom dòng bác sĩ theo chuyên khoa", () => {
    const d = groupDoctors([
      { id: "a", displayName: "A", active: 1, specialtyId: "s1" },
      { id: "a", displayName: "A", active: 1, specialtyId: "s2" },
    ]);
    expect(d).toHaveLength(1);
    expect(d[0].specialtyIds).toEqual(["s1", "s2"]);
    expect(d[0].active).toBe(true);
  });
  it("UUID & boolean", () => {
    expect(UUID_RE.test("20000000-0000-0000-0000-000000000001")).toBe(true);
    expect(UUID_RE.test("abc")).toBe(false);
    expect(asBool("1")).toBe(true);
  });
});
