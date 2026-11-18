import { beforeEach, expect, it } from "vitest";
import { api, setFetchImpl, setTokenGetter } from "@/core/client";
import { D1, getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";

const days = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i + 1, opensAt: "08:00", closesAt: "17:00",
}));

beforeEach(() => {
  resetDb();
  setFetchImpl(mockFetch);
  setTokenGetter(() => "mock." + getDb().users.find(user => user.roles.includes("ADMINISTRATOR"))!.id);
});

it("lưu giờ phòng khám và áp dụng giờ mở mới khi tạo ca", async () => {
  expect(await api.get("/clinic/hours")).toMatchObject({ days: expect.arrayContaining([
    { dayOfWeek: 7, opensAt: null, closesAt: null },
  ]) });
  await expect(api.put("/clinic/hours", { days })).resolves.toEqual({ days });
  await expect(api.post(`/doctors/${D1}/availability`, {
    startAt: "2030-01-06T01:00:00Z", endAt: "2030-01-06T02:00:00Z", slotMinutes: 20, mode: "IN_PERSON",
  })).resolves.toMatchObject({ mode: "IN_PERSON" });
});

it("từ chối sửa giờ bởi bác sĩ và bảo vệ ca còn hiệu lực", async () => {
  const closed = days.map(day => ({ ...day, opensAt: null, closesAt: null }));
  await expect(api.put("/clinic/hours", { days: closed })).rejects.toMatchObject({ status: 409 });
  setTokenGetter(() => "mock." + getDb().users.find(user => user.roles.includes("DOCTOR"))!.id);
  await expect(api.put("/clinic/hours", { days })).rejects.toMatchObject({ status: 403 });
});
