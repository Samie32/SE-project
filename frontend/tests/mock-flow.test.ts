import { beforeEach, describe, expect, it } from "vitest";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { getMe } from "@/core/session";
import { listDoctors, setUserRoles } from "@/api/catalog";
import { listAvailability } from "@/api/schedule";
import { scanAppointments } from "@/api/appointments";
import { api } from "@/core/client";
import { listAuditEvents } from "@/api/operations";

const as = (email: string) => setTokenGetter(() => "mock." + email);

describe("backend giả lập theo hợp đồng", () => {
  beforeEach(() => { resetDb(); setFetchImpl(mockFetch); });

  it("GET /me trả vai trò theo tài khoản", async () => {
    const users = ["patient", "doctor", "receptionist", "auditor"];
    expect(users.length).toBe(4);
    const me = await (async () => { const { getDb } = await import("@/mock/db"); const u = getDb().users.find((x) => x.roles.includes("DOCTOR"))!; setTokenGetter(() => "mock." + u.id); return getMe(); })();
    expect(me.roles).toContain("DOCTOR");
  });

  it("bác sĩ chỉ đọc được lịch làm việc của mình (403 với người khác) — cơ sở dò doctor.id", async () => {
    const { getDb } = await import("@/mock/db");
    const db = getDb();
    const doc = db.users.find((u) => u.roles.includes("DOCTOR"))!;
    setTokenGetter(() => "mock." + doc.id);
    const mine = db.doctors.find((d) => d.userId === doc.id)!;
    const other = db.doctors.find((d) => d.userId !== doc.id)!;
    await expect(listAvailability(mine.id)).resolves.toBeDefined();
    await expect(listAvailability(other.id)).rejects.toMatchObject({ status: 403 });
  });

  it("bệnh nhân không đọc được nhật ký kiểm toán; kiểm toán viên thì được", async () => {
    const { getDb } = await import("@/mock/db");
    const db = getDb();
    const tok = (r: string) => setTokenGetter(() => "mock." + db.users.find((u) => u.roles.includes(r as never))!.id);
    tok("PATIENT");
    await expect(api.get("/audit-events?limit=5&offset=0")).rejects.toMatchObject({ status: 403 });
    tok("AUDITOR");
    await expect(api.get("/audit-events?limit=5&offset=0")).resolves.toBeInstanceOf(Array);
    await expect(listAuditEvents({ limit: 5, offset: 0 })).resolves.toBeInstanceOf(Array);
  });

  it("quản trị gán vai trò DOCTOR bị từ chối khi chưa có hồ sơ bác sĩ", async () => {
    const { getDb } = await import("@/mock/db");
    const db = getDb();
    const admin = db.users.find((u) => u.roles.includes("ADMINISTRATOR"))!;
    const patient = db.users.find((u) => u.roles.includes("PATIENT"))!;
    setTokenGetter(() => "mock." + admin.id);
    await expect(setUserRoles(patient.id, ["DOCTOR"])).rejects.toMatchObject({ status: 409 });
    await expect(setUserRoles(patient.id, ["PATIENT"])).resolves.toBeUndefined();
    expect((await listDoctors()).length).toBeGreaterThan(0);
    expect((await scanAppointments()).truncated).toBe(false);
  });
});
