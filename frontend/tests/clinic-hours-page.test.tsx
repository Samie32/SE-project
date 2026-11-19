import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import { getClinicHours } from "@/api/clinic-hours";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { ClinicHoursPage } from "@/features/admin/ClinicHours";
import { getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { ToastProvider } from "@/ui";

beforeEach(() => {
  resetDb();
  setFetchImpl(mockFetch);
  setTokenGetter(() => "mock." + getDb().users.find(user => user.roles.includes("ADMINISTRATOR"))!.id);
});

afterEach(cleanup);

it("bật Chủ nhật, chặn giờ kết thúc sai và lưu giờ hợp lệ", async () => {
  render(<ToastProvider><ClinicHoursPage /></ToastProvider>);
  const sunday = await screen.findByRole("checkbox", { name: "Mở cửa Chủ nhật" });
  expect((sunday as HTMLInputElement).checked).toBe(false);
  fireEvent.click(sunday);
  fireEvent.change(screen.getByLabelText("Giờ mở cửa Chủ nhật"), { target: { value: "09:00" } });
  const end = screen.getByLabelText("Giờ đóng cửa Chủ nhật");
  fireEvent.change(end, { target: { value: "08:00" } });
  const save = screen.getByRole("button", { name: "Lưu giờ hoạt động" });
  expect((save as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(end, { target: { value: "12:00" } });
  fireEvent.click(save);
  await waitFor(async () => {
    expect((await getClinicHours()).days[6]).toEqual({ dayOfWeek: 7, opensAt: "09:00", closesAt: "12:00" });
  });
  await screen.findByText("Đã lưu giờ hoạt động phòng khám.");
});
