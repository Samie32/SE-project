import { beforeEach, describe, expect, it } from "vitest";
import { api, ApiError, setFetchImpl, setTokenGetter } from "@/core/client";
import { getMe } from "@/core/session";
import { progressAppointment, sendDelayNotice } from "@/api/appointments";
import { callNext, listQueue, skipTicket, saveRecord, createPrescription, joinSession, startSession } from "@/api/operations";
import { vi } from "vitest";
import * as client from "@/core/client";

vi.mock("@/core/config", () => ({
  config: { mock: false, backend: { checkin:true, queue:true, progress:true, clinical:true, telehealth:true, audit:true } },
}));

let requests: {url:string; headers:Headers; body:unknown; method:string}[];
let reply: unknown;
let status: number;
beforeEach(() => {
  requests = []; reply = {}; status = 200;
  setTokenGetter(() => "synthetic-oidc-token");
  setFetchImpl(async (url, init) => {
    requests.push({url, headers:new Headers(init.headers), body:init.body ? JSON.parse(String(init.body)) : undefined, method:init.method ?? "GET"});
    return new Response(status === 204 ? null : JSON.stringify(reply), {status});
  });
});

it("giữ key sau lỗi chưa xác định, đổi key khi đổi payload hoặc đã thành công", async () => {
  expect(client.createCommandRunner).toBeTypeOf("function");
  const run = client.createCommandRunner();
  const keys: string[] = [];
  const fail = async (key: string) => { keys.push(key); throw new ApiError(503, "Tạm lỗi"); };
  await expect(run("save", {version:0}, fail)).rejects.toBeInstanceOf(ApiError);
  await expect(run("save", {version:0}, fail)).rejects.toBeInstanceOf(ApiError);
  expect(keys[1]).toBe(keys[0]);
  await run("save", {version:1}, async key => { keys.push(key); });
  expect(keys[2]).not.toBe(keys[0]);
  await run("save", {version:1}, async key => { keys.push(key); });
  expect(keys[3]).not.toBe(keys[2]);
});

describe("hợp đồng API 1.0.0", () => {
  it("lấy profile có patientId/doctorId, không dò danh tính", async () => {
    await getMe(); expect(requests[0].url).toBe("/api/me/profile");
  });
  it("đọc queue theo bác sĩ/ngày, lọc trạng thái trên client", async () => {
    reply = [{id:"a",status:"WAITING"},{id:"b",status:"CALLED"}];
    const rows = await listQueue({doctorId:"doc",date:"2030-01-08",status:"WAITING"});
    expect(requests[0].url).toBe("/api/doctors/doc/queue?date=2030-01-08");
    expect(rows.map(x => x.id)).toEqual(["a"]);
  });
  it("gọi lượt gửi ngày và key, nhận 204 là hết hàng", async () => {
    status = 204;
    expect(await callNext("doc", "2030-01-08", "next-key")).toBeNull();
    expect(requests[0].url).toBe("/api/doctors/doc/queue/next?date=2030-01-08");
    expect(requests[0].headers.get("Idempotency-Key")).toBe("next-key");
  });
  it("không nuốt 404 thành hàng rỗng", async () => {
    status = 404;
    await expect(callNext("doc", "2030-01-08", "next-key")).rejects.toBeInstanceOf(ApiError);
  });
  it("bỏ lượt gửi ticket version và key", async () => {
    await skipTicket("ticket", "Chưa có mặt", 2, "skip-key");
    expect(requests[0].body).toEqual({reason:"Chưa có mặt",version:2});
    expect(requests[0].headers.get("Idempotency-Key")).toBe("skip-key");
  });
  it("progress gửi targetStatus, appointment version và key", async () => {
    await progressAppointment("appt", "IN_PROGRESS", 1, "progress-key");
    expect(requests[0].body).toEqual({targetStatus:"IN_PROGRESS",version:1});
    expect(requests[0].headers.get("Idempotency-Key")).toBe("progress-key");
  });
  it("báo chậm gửi giờ dự kiến, phiên bản lịch và khóa trùng lặp", async () => {
    const body = { version: 2, estimatedStartAt: "2030-01-08T02:30:00Z" };
    await sendDelayNotice("appt", body, "delay-key");
    expect(requests[0].url).toBe("/api/appointments/appt/delay-notice");
    expect(requests[0].body).toEqual(body);
    expect(requests[0].headers.get("Idempotency-Key")).toBe("delay-key");
  });
  it("ghi vắng gửi lý do và lựa chọn email cùng lần chuyển trạng thái", async () => {
    await progressAppointment("appt", "NO_SHOW", 2, "no-show-key", {
      noShowReason: "TECHNICAL_ISSUE", sendRebookingEmail: true,
    });
    expect(requests[0].body).toEqual({
      targetStatus: "NO_SHOW", version: 2, noShowReason: "TECHNICAL_ISSUE", sendRebookingEmail: true,
    });
    expect(requests[0].headers.get("Idempotency-Key")).toBe("no-show-key");
  });
  it("PUT bệnh án có key và đúng body", async () => {
    const body = {version:0,content:"Bản nháp",status:"DRAFT" as const};
    await saveRecord("enc", body, "record-key");
    expect(requests[0].body).toEqual(body);
    expect(requests[0].headers.get("Idempotency-Key")).toBe("record-key");
  });
  it("tạo đơn có key", async () => {
    await createPrescription("enc", [], "rx-key");
    expect(requests[0].headers.get("Idempotency-Key")).toBe("rx-key");
  });
  it("join dùng consent và JWT, không idempotency", async () => {
    await joinSession("room", true);
    expect(requests[0].body).toEqual({consent:true});
    expect(requests[0].headers.get("Authorization")).toBe("Bearer synthetic-oidc-token");
    expect(requests[0].headers.has("Idempotency-Key")).toBe(false);
  });
  it("start dùng session version và key", async () => {
    await startSession("room", 1, "start-key");
    expect(requests[0].headers.get("Idempotency-Key")).toBe("start-key");
  });
  it("client xử lý body rỗng HTTP 200/204", async () => {
    setFetchImpl(async () => new Response(null, {status:200}));
    expect(await api.put("/me/contact", {email:"test@example.test"})).toBeUndefined();
  });
});
