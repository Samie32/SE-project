import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/core/client";
import type { Appointment, Slot } from "@/core/types";

const listSlotsMock = vi.fn();
const bookAppointmentMock = vi.fn();
const reloadPatientMock = vi.fn();

vi.mock("@/api/schedule", () => ({
  listSlots: (...args: unknown[]) => listSlotsMock(...args),
}));

vi.mock("@/api/appointments", () => ({
  bookAppointment: (...args: unknown[]) => bookAppointmentMock(...args),
}));

vi.mock("@/core/directory", () => ({
  useDirectory: () => ({
    specialties: [{ id: "spec-1", name: "Nội tổng quát", active: true }],
    doctors: [{ id: "doc-1", displayName: "BS. Nguyễn Văn A", active: true, specialtyIds: ["spec-1"] }],
    loading: false,
    error: "",
    reload: vi.fn(),
    doctorById: (id: string) =>
      id === "doc-1" ? { id: "doc-1", displayName: "BS. Nguyễn Văn A", active: true, specialtyIds: ["spec-1"] } : undefined,
    doctorName: () => "BS. Nguyễn Văn A",
  }),
}));

vi.mock("@/features/patient/PatientContext", () => ({
  usePatient: () => ({
    reload: reloadPatientMock,
  }),
}));

import { BookingPage } from "@/features/patient/Booking";

const SAMPLE_SLOT: Slot = {
  id: "slot-1",
  doctorId: "doc-1",
  specialtyId: "spec-1",
  mode: "IN_PERSON",
  startAt: "2026-11-25T02:00:00Z",
  endAt: "2026-11-25T02:30:00Z",
};

const SAMPLE_APPOINTMENT: Appointment = {
  id: "appt-12345678",
  patientId: "pat-1",
  doctorId: "doc-1",
  specialtyId: "spec-1",
  mode: "IN_PERSON",
  status: "CONFIRMED",
  startAt: SAMPLE_SLOT.startAt,
  endAt: SAMPLE_SLOT.endAt,
  version: 1,
};

describe("BookingPage offline resilience (NFR-09 / AGENT-TC-001)", () => {
  beforeEach(() => {
    listSlotsMock.mockReset();
    bookAppointmentMock.mockReset();
    reloadPatientMock.mockReset();
    listSlotsMock.mockResolvedValue([SAMPLE_SLOT]);
  });

  it("shows error within 10s on network loss, preserves selection, and reuses the same Idempotency-Key on retry", async () => {
    const user = userEvent.setup();
    bookAppointmentMock
      .mockRejectedValueOnce(new ApiError(0, "Không thể kết nối tới máy chủ. Vui lòng kiểm tra kết nối mạng."))
      .mockResolvedValueOnce(SAMPLE_APPOINTMENT);

    render(
      <MemoryRouter initialEntries={["/patient/booking"]}>
        <BookingPage />
      </MemoryRouter>,
    );

    // Step 1 -> Step 2
    await user.click(screen.getByRole("button", { name: /Tiếp tục/i }));

    // Select slot on Step 2 -> Step 3
    const slotBtn = await screen.findByRole("button", { name: /09:00/ });
    await user.click(slotBtn);
    await user.click(screen.getByRole("button", { name: /Tiếp tục/i }));
    expect(screen.getByText(/Kiểm tra thông tin lịch khám/i)).toBeTruthy();

    // Trigger offline failure on Step 3 and measure time to error notice
    const t0 = performance.now();
    await user.click(screen.getByRole("button", { name: /Xác nhận đặt lịch/i }));

    await screen.findByText(/Không thể kết nối tới máy chủ/i);
    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(10_000);

    // Must not report false success; must preserve step & warn about safe idempotent retry
    expect(screen.queryByText(/Đặt lịch thành công/i)).toBeNull();
    expect(screen.getByText(/Chưa xác định được kết quả/i)).toBeTruthy();
    expect(screen.getByText(/Kiểm tra thông tin lịch khám/i)).toBeTruthy();

    // Retry once network recovers -> must reuse the EXACT same idempotency key
    await user.click(screen.getByRole("button", { name: /Xác nhận đặt lịch/i }));
    await screen.findByText(/Đặt lịch thành công/i);

    await waitFor(() => expect(bookAppointmentMock).toHaveBeenCalledTimes(2));
    const [firstSlotId, firstKey] = bookAppointmentMock.mock.calls[0];
    const [secondSlotId, secondKey] = bookAppointmentMock.mock.calls[1];
    expect(firstSlotId).toBe("slot-1");
    expect(secondSlotId).toBe("slot-1");
    expect(typeof firstKey).toBe("string");
    expect(firstKey.length).toBeGreaterThan(8);
    expect(secondKey).toBe(firstKey);
  });
});
