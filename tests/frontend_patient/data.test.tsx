import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { PortalProvider, usePortal } from "../src/portal/data";
const mock = vi.hoisted(() => ({
  me: vi.fn(),
  doctors: vi.fn(),
  specialties: vi.fn(),
  appointments: vi.fn(),
}));
vi.mock("../src/api/appointments", () => ({
  getMe: mock.me,
  getDoctors: mock.doctors,
  getSpecialties: mock.specialties,
  getMyAppointments: mock.appointments,
}));
function Probe() {
  const d = usePortal();
  return (
    <div>
      {d.loading
        ? "loading"
        : d.error ||
          "loaded:" + d.appointments.length + " doctors:" + d.doctors.length}
    </div>
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.me.mockResolvedValue({ id: "p1", roles: ["PATIENT"] });
  mock.doctors.mockResolvedValue([
    { id: "d1", active: true },
    { id: "d2", active: false },
  ]);
  mock.specialties.mockResolvedValue([]);
  mock.appointments.mockResolvedValue([]);
});
afterEach(cleanup);
it("reads every page rather than dropping upcoming appointments after the first 100", async () => {
  const old = { id: "old", startAt: "2020-01-01T00:00:00Z" };
  mock.appointments
    .mockResolvedValueOnce(
      Array.from({ length: 100 }, (_, i) => ({ ...old, id: String(i) })),
    )
    .mockResolvedValueOnce([{ id: "future", startAt: "2030-01-01T00:00:00Z" }]);
  render(
    <PortalProvider>
      <Probe />
    </PortalProvider>,
  );
  expect(await screen.findByText("loaded:101 doctors:1")).toBeTruthy();
  expect(mock.appointments.mock.calls).toEqual([
    [{ limit: 100, offset: 0 }],
    [{ limit: 100, offset: 100 }],
  ]);
});
it("blocks non-patient roles before requesting their appointment data", async () => {
  mock.me.mockResolvedValue({ id: "doctor", roles: ["DOCTOR"] });
  render(
    <PortalProvider>
      <Probe />
    </PortalProvider>,
  );
  expect(await screen.findByText(/Cổng này dành cho bệnh nhân/)).toBeTruthy();
  expect(mock.appointments).not.toHaveBeenCalled();
});
it("exposes service failure without generating mock appointments", async () => {
  mock.appointments.mockRejectedValue(new Error("Máy chủ chưa sẵn sàng"));
  render(
    <PortalProvider>
      <Probe />
    </PortalProvider>,
  );
  expect(await screen.findByText("Máy chủ chưa sẵn sàng")).toBeTruthy();
  expect(screen.queryByText(/loaded:/)).toBeNull();
});
