import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { DirectoryProvider } from "@/core/directory";
import { hasPermission } from "@/core/permissions";
import { SessionContext } from "@/core/session";
import { AccountPage } from "@/features/account/Account";
import { getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { ToastProvider } from "@/ui";

afterEach(cleanup);

function renderAccountPage() {
  resetDb();
  const patient = getDb().users.find((u) => u.roles.includes("PATIENT"))!;
  patient.username = "patient.demo";
  patient.phone = "0901234567";
  const fetchSpy = vi.fn(mockFetch);
  const retry = vi.fn();
  const changePassword = vi.fn();
  setFetchImpl(fetchSpy);
  setTokenGetter(() => "mock." + patient.id);
  render(
    <MemoryRouter>
      <SessionContext.Provider
        value={{
          status: "ready",
          error: "",
          identity: {
            id: patient.id,
            username: patient.username,
            roles: ["PATIENT"],
            displayName: patient.name,
            email: patient.email,
            phone: patient.phone,
            patientId: patient.id,
          },
          roles: ["PATIENT"],
          displayName: patient.name,
          can: (p) => hasPermission(["PATIENT"], p),
          login: vi.fn(),
          changePassword,
          logout: vi.fn(),
          retry,
        }}
      >
        <DirectoryProvider>
          <ToastProvider>
            <AccountPage />
          </ToastProvider>
        </DirectoryProvider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
  return { fetchSpy, patient, retry, changePassword };
}

it("hiển thị sẵn thông tin tài khoản, chỉ mở chỉnh sửa khi nhấn nút và giữ đổi SĐT không cần OTP", async () => {
  const { fetchSpy, patient, retry, changePassword } = renderAccountPage();

  expect(screen.getByText("patient.demo")).toBeTruthy();
  expect(screen.getByText(patient.email)).toBeTruthy();
  expect(screen.getByText("0901234567")).toBeTruthy();
  expect(screen.queryByLabelText("Email nhận thông báo")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Đổi mật khẩu" }));
  expect(changePassword).toHaveBeenCalledTimes(1);

  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa thông tin" }));
  const phoneInput = screen.getByLabelText("Số điện thoại (tùy chọn)");
  fireEvent.change(phoneInput, { target: { value: "0988112233" } });
  expect(screen.queryByRole("button", { name: "Gửi mã OTP xác nhận" })).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Lưu thông tin" }));
  await waitFor(() => expect(retry).toHaveBeenCalledTimes(1));
  expect(
    fetchSpy.mock.calls.some(
      ([url, init]) => url === "/api/me/contact" && init?.method === "PUT",
    ),
  ).toBe(true);
});

it("yêu cầu gửi và nhập mã OTP 6 chữ số khi đổi sang email mới", async () => {
  const { fetchSpy } = renderAccountPage();

  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa thông tin" }));
  fireEvent.change(screen.getByLabelText("Email nhận thông báo"), {
    target: { value: "new.email@example.test" },
  });

  const saveBtn = screen.getByRole("button", { name: "Xác nhận OTP & Lưu" }) as HTMLButtonElement;
  expect(saveBtn.disabled).toBe(true);

  fireEvent.click(screen.getByRole("button", { name: "Gửi mã OTP xác nhận" }));
  await screen.findByText(/Mã OTP có hiệu lực trong 5 phút/);

  fireEvent.change(screen.getByLabelText("Mã xác nhận OTP (6 chữ số)"), {
    target: { value: "123456" },
  });
  expect(saveBtn.disabled).toBe(false);
  fireEvent.click(saveBtn);

  await waitFor(() => {
    const putCall = fetchSpy.mock.calls.find(
      ([url, init]) => url === "/api/me/contact" && init?.method === "PUT",
    );
    expect(putCall).toBeTruthy();
    const payload = JSON.parse(String(putCall![1]?.body));
    expect(payload).toEqual({
      email: "new.email@example.test",
      phone: "0901234567",
      otp: "123456",
    });
  });
});
