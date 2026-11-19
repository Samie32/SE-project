import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClinicHoliday, ClinicHolidayInput } from "@/api/clinic-hours";
import { DEFAULT_CLINIC_HOURS, type WeeklyClinicHours } from "@/core/clinic-hours";
import { ClinicHoursPage } from "@/features/admin/ClinicHours";
import { ToastProvider } from "@/ui";

let currentHours: WeeklyClinicHours;
let currentHolidays: ClinicHoliday[];

vi.mock("@/api/clinic-hours", () => ({
  getClinicHours: vi.fn(async () => structuredClone(currentHours)),
  updateClinicHours: vi.fn(async (body: WeeklyClinicHours) => {
    currentHours = structuredClone(body);
    return structuredClone(currentHours);
  }),
  listClinicHolidays: vi.fn(async () => structuredClone(currentHolidays)),
  createClinicHoliday: vi.fn(async (body: ClinicHolidayInput) => {
    const created: ClinicHoliday = { id: `h-${currentHolidays.length + 1}`, ...body };
    currentHolidays = [...currentHolidays, created];
    return structuredClone(created);
  }),
  deleteClinicHoliday: vi.fn(async (id: string) => {
    currentHolidays = currentHolidays.filter(h => h.id !== id);
  }),
}));

beforeEach(() => {
  currentHours = { days: structuredClone(DEFAULT_CLINIC_HOURS) };
  currentHolidays = [];
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ClinicHoursPage", () => {
  it("hiển thị trực tiếp 7 ngày, bật Chủ nhật, chặn giờ sai và lưu thành công", async () => {
    render(
      <ToastProvider>
        <ClinicHoursPage />
      </ToastProvider>,
    );

    await screen.findByText(/Mở 6\/7 ngày · Tổng 54 giờ\/tuần/);

    const sunday = screen.getByRole("checkbox", { name: "Mở cửa Chủ nhật" }) as HTMLInputElement;
    expect(sunday.checked).toBe(false);
    fireEvent.click(sunday);

    fireEvent.change(screen.getByLabelText("Giờ mở cửa Chủ nhật"), { target: { value: "09:00" } });
    const end = screen.getByLabelText("Giờ đóng cửa Chủ nhật");
    fireEvent.change(end, { target: { value: "08:00" } });

    const save = screen.getByRole("button", { name: "Lưu giờ hoạt động" }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    fireEvent.change(end, { target: { value: "12:00" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);

    await waitFor(() => {
      expect(currentHours.days[6]).toEqual({ dayOfWeek: 7, opensAt: "09:00", closesAt: "12:00" });
    });
    await screen.findByText("Đã lưu giờ hoạt động phòng khám.");
  });

  it("thêm được khoảng ngày nghỉ lễ liên tiếp", async () => {
    render(
      <ToastProvider>
        <ClinicHoursPage />
      </ToastProvider>,
    );

    await screen.findByText(/Mở 6\/7 ngày/);

    fireEvent.click(screen.getByRole("button", { name: "Thiết lập ngày lễ" }));
    fireEvent.change(screen.getByLabelText("Từ ngày nghỉ lễ"), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText("Đến ngày nghỉ lễ"), { target: { value: "2026-09-04" } });
    fireEvent.change(screen.getByLabelText("Tên dịp lễ"), { target: { value: "Nghỉ lễ Quốc khánh" } });
    fireEvent.click(screen.getByRole("button", { name: "Thêm" }));

    expect(await screen.findByText("Nghỉ lễ Quốc khánh")).toBeTruthy();
    expect(screen.getByText("4 ngày liên tiếp")).toBeTruthy();
    expect(screen.getByText("4 ngày")).toBeTruthy();
  });
});
