import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Booking } from "../src/portal/Booking";
import { Appointments } from "../src/portal/Appointments";
import { Records, Telehealth } from "../src/portal/Pending";
import { ApiError } from "../src/api/client";
import { canRescheduleOrCancel, toLocalTime } from "../src/utils/datetime";

const mocks = vi.hoisted(() => ({
  getSlots: vi.fn(),
  book: vi.fn(),
  cancel: vi.fn(),
  reschedule: vi.fn(),
  reload: vi.fn(),
  data: {} as any,
}));
vi.mock("../src/api/appointments", () => ({
  getSlots: mocks.getSlots,
  bookAppointment: mocks.book,
  cancelAppointment: mocks.cancel,
  rescheduleAppointment: mocks.reschedule,
}));
vi.mock("../src/portal/data", () => ({
  usePortal: () => mocks.data,
  message: (e: Error) => e.message,
  doctorName: (d: any) => d?.displayName || "Bác sĩ phụ trách",
}));
const future = () => new Date(Date.now() + 86400000).toISOString();
const appointment = () => ({
  id: "appt-1",
  doctorId: "doctor-1",
  slotId: "old-slot",
  startAt: future(),
  endAt: new Date(Date.now() + 87600000).toISOString(),
  mode: "IN_PERSON",
  status: "CONFIRMED",
  version: 3,
});
const slot = () => ({
  id: "new-slot",
  doctorId: "doctor-1",
  startAt: future(),
  endAt: new Date(Date.now() + 87600000).toISOString(),
  mode: "IN_PERSON",
});
function mount(ui: React.ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.data = {
    doctors: [
      {
        id: "doctor-1",
        displayName: "BS. Thuận",
        specialtyId: "spec-1",
        active: true,
      },
    ],
    specialties: [{ id: "spec-1", name: "Nội tổng quát" }],
    appointments: [appointment()],
    reload: mocks.reload,
  };
  mocks.getSlots.mockResolvedValue([slot()]);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("business rules", () => {
  it("allows exactly two hours, rejects one millisecond below the cutoff and formats UTC in Vietnam time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-06T00:00:00Z"));
    expect(canRescheduleOrCancel("2026-11-06T02:00:00Z")).toBe(true);
    expect(canRescheduleOrCancel("2026-11-06T01:59:59.999Z")).toBe(false);
    expect(toLocalTime("2026-11-06T02:00:00Z")).toBe("09:00");
  });
});
describe("booking integration", () => {
  async function chooseSlot() {
    mount(<Booking />);
    fireEvent.click(await screen.findByRole("button", { name: /Tiếp tục/ }));
    const time = toLocalTime(slot().startAt);
    fireEvent.click(await screen.findByRole("button", { name: time }));
    fireEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
  }
  it("does not invent slots when the server fails", async () => {
    mocks.getSlots.mockRejectedValue(
      new ApiError(503, "Máy chủ không khả dụng"),
    );
    mount(<Booking />);
    fireEvent.click(await screen.findByRole("button", { name: /Tiếp tục/ }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      expect.stringContaining("Máy chủ không khả dụng"),
    );
    expect(screen.queryByRole("button", { name: "09:00" })).toBeNull();
  });
  it("keeps the same idempotency key after a network failure and only confirms server success", async () => {
    mocks.book
      .mockRejectedValueOnce(new ApiError(0, "Lỗi mạng"))
      .mockResolvedValueOnce(appointment());
    await chooseSlot();
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận đặt lịch/ }));
    await screen.findByText("Lỗi mạng");
    expect(
      screen.queryByRole("heading", { name: "Đặt lịch thành công" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận đặt lịch/ }));
    await screen.findByRole("heading", { name: "Đặt lịch thành công" });
    expect(mocks.book.mock.calls[0][0]).toEqual({ slotId: "new-slot" });
    expect(mocks.book.mock.calls[0][1]).toBe(mocks.book.mock.calls[1][1]);
  });
  it("reloads slots and preserves filters on a booking conflict", async () => {
    mocks.book.mockRejectedValueOnce(new ApiError(409, "Xung đột"));
    await chooseSlot();
    fireEvent.click(screen.getByRole("button", { name: /Xác nhận đặt lịch/ }));
    await screen.findByText(/Khung giờ vừa hết hoặc trùng/);
    await waitFor(() =>
      expect(mocks.getSlots.mock.calls.length).toBeGreaterThan(1),
    );
    const calls = mocks.getSlots.mock.calls;
    expect(calls.at(-1)?.[0]).toEqual(calls[0][0]);
    expect(
      screen.queryByRole("heading", { name: "Đặt lịch thành công" }),
    ).toBeNull();
  });
});
describe("appointment changes", () => {
  it("cancels with a trimmed reason, version and idempotency key", async () => {
    mocks.cancel.mockResolvedValue({});
    mount(<Appointments now={new Date()} />);
    fireEvent.click(screen.getByRole("button", { name: "Hủy" }));
    fireEvent.change(screen.getByPlaceholderText("Nhập lý do hủy lịch…"), {
      target: { value: "  Bận việc  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(mocks.cancel).toHaveBeenCalledWith(
        "appt-1",
        { reason: "Bận việc", version: 3 },
        expect.any(String),
      ),
    );
    await waitFor(() => expect(mocks.reload).toHaveBeenCalled());
  });
  it("reschedules the existing appointment instead of creating a second booking", async () => {
    mocks.reschedule.mockResolvedValue({});
    mount(<Appointments now={new Date()} />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi lịch" }));
    fireEvent.click(
      await screen.findByRole("button", { name: toLocalTime(slot().startAt) }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận" }));
    await waitFor(() =>
      expect(mocks.reschedule).toHaveBeenCalledWith(
        "appt-1",
        { slotId: "new-slot", version: 3 },
        expect.any(String),
      ),
    );
    expect(mocks.book).not.toHaveBeenCalled();
  });
  it("hides change actions inside the two-hour cutoff", () => {
    mocks.data.appointments = [
      {
        ...appointment(),
        startAt: new Date(Date.now() + 3600000).toISOString(),
      },
    ];
    mount(<Appointments now={new Date()} />);
    expect(screen.queryByRole("button", { name: "Đổi lịch" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hủy" })).toBeNull();
    expect(screen.getByText(/Đã khóa đổi\/hủy/)).toBeTruthy();
  });
});
describe("unimplemented services", () => {
  it("marks records as pending without fabricated diagnoses or prescriptions", () => {
    mount(<Records />);
    expect(
      screen.getByText("Đang chờ tích hợp hồ sơ và đơn thuốc."),
    ).toBeTruthy();
    expect(screen.queryByText(/Paracetamol/)).toBeNull();
  });
  it("disables admission until a telehealth backend is available", () => {
    mount(<Telehealth />);
    expect(
      (
        screen.getByRole("button", {
          name: /Tham gia phòng khám/,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(screen.queryByText(/38 Mbps|Mã hóa đầu cuối|HIPAA/)).toBeNull();
  });
});
