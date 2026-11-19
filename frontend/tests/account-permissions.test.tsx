import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { PermissionsPage } from "@/features/admin/Permissions";
import { getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { ToastProvider } from "@/ui";

vi.mock("@/core/session", () => ({
  useSession: () => ({ identity: { id: getDb().users[0].id } }),
}));
vi.mock("@/core/directory", () => ({
  useDirectory: () => ({ specialties: getDb().specialties, loading: false, error: "", reload: () => {} }),
}));

afterEach(cleanup);

it("tạo tài khoản và cấp vai trò ngay trong hộp thêm nhân sự", async () => {
  resetDb();
  setFetchImpl(mockFetch);
  setTokenGetter(() => `mock.${getDb().users[0].id}`);
  render(<ToastProvider><PermissionsPage /></ToastProvider>);

  fireEvent.click(screen.getByRole("button", { name: "Thêm nhân sự" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/^Username/), { target: { value: "doctor-new" } });
  fireEvent.change(within(dialog).getByLabelText(/^Họ tên/), { target: { value: "Nguyễn Nhân Sự" } });
  fireEvent.change(within(dialog).getByLabelText(/^Email/), { target: { value: "staff@example.test" } });
  fireEvent.change(within(dialog).getByLabelText(/^Mật khẩu tạm thời/), { target: { value: "Temporary!Demo42" } });
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Lễ tân" }));
  fireEvent.submit(dialog.querySelector("form")!);
  await screen.findByRole("row", { name: /doctor-new.*Lễ tân/ });
});

it("tạo hồ sơ bác sĩ kèm chuyên khoa ngay khi cấp vai trò Bác sĩ", async () => {
  resetDb();
  setFetchImpl(mockFetch);
  setTokenGetter(() => `mock.${getDb().users[0].id}`);
  render(<ToastProvider><PermissionsPage /></ToastProvider>);

  fireEvent.click(screen.getByRole("button", { name: "Thêm nhân sự" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/^Username/), { target: { value: "doctor-specialty" } });
  fireEvent.change(within(dialog).getByLabelText(/^Họ tên/), { target: { value: "Nguyễn Bác Sĩ" } });
  fireEvent.change(within(dialog).getByLabelText(/^Email/), { target: { value: "specialty@example.test" } });
  fireEvent.change(within(dialog).getByLabelText(/^Mật khẩu tạm thời/), { target: { value: "Temporary!Demo42" } });
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Bác sĩ" }));
  fireEvent.submit(dialog.querySelector("form")!);
  await screen.findByText("Chọn ít nhất một chuyên khoa.");
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Nội tổng quát" }));
  fireEvent.submit(dialog.querySelector("form")!);
  await screen.findByRole("row", { name: /doctor-specialty.*Bác sĩ/ });
  const account = getDb().users.find(user => user.username === "doctor-specialty")!;
  expect(getDb().doctors.find(doctor => doctor.userId === account.id)).toMatchObject({
    active: false, specialtyIds: [getDb().specialties.find(item => item.name === "Nội tổng quát")!.id],
  });
});

it("hiển thị nhân sự, cấp quyền và lọc tài khoản đã vô hiệu hóa", async () => {
  resetDb();
  const [admin, , , , receptionist] = getDb().users;
  setFetchImpl(mockFetch);
  setTokenGetter(() => `mock.${admin.id}`);
  render(<ToastProvider><PermissionsPage /></ToastProvider>);

  await screen.findByRole("row", { name: /receptionist/ });
  expect(screen.queryByRole("row", { name: /patient2/ })).toBeNull();
  fireEvent.change(screen.getByRole("searchbox", { name: "Tìm nhân sự" }), { target: { value: "receptionist" } });
  const row = await screen.findByRole("row", { name: /receptionist/ });
  fireEvent.click(within(row).getByRole("button", { name: "Sửa" }));

  const dialog = screen.getByRole("dialog");
  expect((within(dialog).getByRole("checkbox", { name: "Lễ tân" }) as HTMLInputElement).checked).toBe(true);
  expect((within(dialog).getByRole("checkbox", { name: "Bác sĩ" }) as HTMLInputElement).disabled).toBe(false);
  fireEvent.click(within(dialog).getByRole("checkbox", { name: "Kiểm toán viên" }));
  fireEvent.submit(dialog.querySelector("form")!);
  await screen.findByText("Đã cập nhật nhân sự & phân quyền.");
  expect(receptionist.roles).toEqual(["RECEPTIONIST", "AUDITOR"]);

  const updatedRow = await screen.findByRole("row", { name: /receptionist/ });
  fireEvent.click(within(updatedRow).getByRole("button", { name: "Sửa" }));
  const editDialog = screen.getByRole("dialog");
  fireEvent.change(within(editDialog).getByRole("combobox", { name: "Trạng thái tài khoản" }), { target: { value: "false" } });
  fireEvent.submit(editDialog.querySelector("form")!);
  await screen.findByText("Đã cập nhật nhân sự & phân quyền.");
  fireEvent.change(screen.getByRole("combobox", { name: "Lọc theo trạng thái" }), { target: { value: "false" } });
  await screen.findByRole("row", { name: /receptionist.*Vô hiệu hóa/ });
});
