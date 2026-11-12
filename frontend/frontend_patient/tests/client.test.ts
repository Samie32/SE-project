import { afterEach, expect, it, vi } from "vitest";
import {
  api,
  ApiError,
  clearToken,
  getToken,
  setToken,
} from "../src/api/client";
afterEach(() => {
  clearToken();
  vi.unstubAllGlobals();
});
it("sends real bearer and idempotency headers, retaining no token in web storage", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ id: "real-id" }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetch);
  setToken("real-access-token");
  const result = await api.post(
    "/appointments",
    { slotId: "real-slot" },
    "stable-key",
  );
  expect(result).toEqual({ id: "real-id" });
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe("/api/appointments");
  expect(init.headers.get("Authorization")).toBe("Bearer real-access-token");
  expect(init.headers.get("Idempotency-Key")).toBe("stable-key");
  expect(sessionStorage.getItem("access_token")).toBeNull();
  clearToken();
  expect(getToken()).toBeNull();
});
it("rejects 401 and notifies authentication instead of substituting demo data", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response("", { status: 401 })),
  );
  const listener = vi.fn();
  window.addEventListener("clinic:unauthorized", listener);
  try {
    await expect(api.get("/appointments")).rejects.toMatchObject({
      status: 401,
    });
    expect(listener).toHaveBeenCalledOnce();
  } finally {
    window.removeEventListener("clinic:unauthorized", listener);
  }
});
it("preserves failed writes as errors and accepts empty successful responses", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 })),
  );
  await expect(
    api.post("/appointments", { slotId: "x" }, "k"),
  ).rejects.toBeInstanceOf(ApiError);
  await expect(
    api.put("/me/contact", { email: "patient@example.test" }),
  ).resolves.toBeUndefined();
});
