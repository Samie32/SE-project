import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { DirectoryProvider } from "@/core/directory";
import { hasPermission } from "@/core/permissions";
import { SessionContext } from "@/core/session";
import type { Identity } from "@/core/types";
import { AccountPage } from "@/features/account/Account";
import { getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { ToastProvider } from "@/ui";

afterEach(cleanup);

function renderAccountPage(opts?: {
  initialEntry?: string | { pathname: string; state?: unknown };
  identityExtra?: Partial<Identity>;
}) {
  resetDb();
  const patient = getDb().users.find((u) => u.roles.includes("PATIENT"))!;
  patient.username = "patient.demo";
  patient.phone = "0901234567";
  const fetchSpy = vi.fn(mockFetch);
  const retry = vi.fn();
  const changePassword = vi.fn();
  setFetchImpl(fetchSpy);
  setTokenGetter(() => "mock." + patient.id);
  const identity: Identity = {
    id: patient.id,
    username: patient.username,
    roles: ["PATIENT"],
    displayName: patient.name,
    email: patient.email,
    phone: patient.phone,
    patientId: patient.id,
    ...opts?.identityExtra,
  };
  render(
    <MemoryRouter initialEntries={[opts?.initialEntry ?? "/account"]}>
      <SessionContext.Provider
        value={{
          status: "ready",
          error: "",
          identity,
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

it("tự động hiển thị các trường mở rộng do admin thêm vào, cảnh báo trường thiếu và mở sẵn form với ?edit=1", () => {
  renderAccountPage({
    identityExtra: {
      phone: null,
      address: null,
      insuranceNumber: "DN4790123456",
    },
  });

  // Tự động hiển thị cảnh báo các trường còn thiếu và nút Bổ sung ngay
  expect(screen.getByText(/Tài khoản còn thiếu thông tin/i)).toBeTruthy();
  expect(screen.getByText(/số điện thoại, địa chỉ/i)).toBeTruthy();

  // Tự động render trường mở rộng trong danh sách chi tiết mà không cần sửa UI thủ công
  expect(screen.getByText("Địa chỉ")).toBeTruthy();
  expect(screen.getByText("Số thẻ BHYT")).toBeTruthy();
  expect(screen.getByText("DN4790123456")).toBeTruthy();
  expect(screen.getAllByText("Chưa cập nhật").length).toBeGreaterThanOrEqual(2);

  fireEvent.click(screen.getByRole("button", { name: "Bổ sung ngay" }));
  expect(screen.getByText("Cập nhật thông tin liên hệ")).toBeTruthy();

  cleanup();

  // Đi qua ?edit=1 tự động mở sẵn chế độ chỉnh sửa
  renderAccountPage({ initialEntry: "/account?edit=1" });
  expect(screen.getByText("Cập nhật thông tin liên hệ")).toBeTruthy();
});

it("từ chối SĐT không phải số Việt Nam 10 chữ số, đồng bộ thông tin cá nhân và khóa chỉnh sửa 90 ngày", async () => {
  const { fetchSpy } = renderAccountPage({
    identityExtra: {
      birthDate: "1998-04-20",
      hometown: "Nghệ An",
      permanentAddress: null,
    },
  });

  expect(screen.getByText("20/04/1998")).toBeTruthy();
  expect(screen.getByText("Nghệ An")).toBeTruthy();

  // SĐT nước ngoài hoặc không đúng đầu số VN bị chặn ngay trên form
  fireEvent.click(screen.getByRole("button", { name: "Chỉnh sửa thông tin" }));
  fireEvent.change(screen.getByLabelText("Số điện thoại (tùy chọn)"), {
    target: { value: "+14155551234" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu thông tin" }));
  expect(screen.getByText(/Số điện thoại Việt Nam không hợp lệ/i)).toBeTruthy();

  // Cập nhật mục còn trống trong Thông tin cá nhân qua PUT /api/me/profile
  fireEvent.click(screen.getByRole("button", { name: "Cập nhật hồ sơ" }));
  fireEvent.change(screen.getByLabelText("Địa chỉ thường trú"), {
    target: { value: "Quận 7, TP.HCM" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lưu hồ sơ cá nhân" }));

  await waitFor(() => {
    const putProfile = fetchSpy.mock.calls.find(
      ([url, init]) => url === "/api/me/profile" && init?.method === "PUT",
    );
    expect(putProfile).toBeTruthy();
    expect(JSON.parse(String(putProfile![1]?.body))).toEqual({
      birthDate: "1998-04-20",
      hometown: "Nghệ An",
      permanentAddress: "Quận 7, TP.HCM",
    });
  });

  cleanup();

  // Khi đang trong thời gian chờ 90 ngày và đã điền đủ 3 trường thì khóa nút cập nhật hồ sơ
  const futureUnlock = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  renderAccountPage({
    identityExtra: {
      birthDate: "1998-04-20",
      hometown: "Nghệ An",
      permanentAddress: "Quận 7, TP.HCM",
      personalInfoNextEditAt: futureUnlock,
    },
  });
  const lockedBtn = screen.getByRole("button", { name: "Đang khóa 90 ngày" }) as HTMLButtonElement;
  expect(lockedBtn.disabled).toBe(true);
});

it("hiển thị thông báo thành công khi quay về /account sau đổi mật khẩu", async () => {
  renderAccountPage({
    initialEntry: { pathname: "/account", state: { passwordActionStatus: "success" } },
  });
  await screen.findByText("Đã đổi mật khẩu thành công.");
});
