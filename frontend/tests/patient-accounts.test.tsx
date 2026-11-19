import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import App from "@/App";
import { setFetchImpl, setTokenGetter } from "@/core/client";
import { hasPermission } from "@/core/permissions";
import { SessionContext } from "@/core/session";
import type { Role } from "@/core/types";
import { getDb, resetDb } from "@/mock/db";
import { mockFetch } from "@/mock/server";
import { ToastProvider } from "@/ui";

afterEach(cleanup);

function openPage(role: Role) {
  resetDb();
  const user = getDb().users.find((account) => account.roles.includes(role))!;
  const fetch = vi.fn(mockFetch);
  setFetchImpl(fetch);
  setTokenGetter(() => "mock." + user.id);
  render(
    <MemoryRouter initialEntries={["/admin/patient-accounts"]}>
      <SessionContext.Provider
        value={{
          status: "ready",
          error: "",
          identity: null,
          roles: [role],
          displayName: user.name,
          can: (permission) => hasPermission([role], permission),
          login: vi.fn(),
          logout: vi.fn(),
          retry: vi.fn(),
        }}
      >
        <ToastProvider>
          <App />
        </ToastProvider>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
  return { fetch, user };
}

it("chỉ tra cứu mã đã gửi và yêu cầu lý do trước khi khóa hoặc mở khóa", async () => {
  const { fetch } = openPage("ADMINISTRATOR");
  const patient = getDb().users.find((account) =>
    account.roles.includes("PATIENT"),
  )!;
  const input = screen.getByLabelText("Mã tài khoản");
  const lookup = screen.getByRole("button", { name: "Tra cứu" });
  expect(screen.queryByText(patient.name)).toBeNull();
  expect(
    fetch.mock.calls.some(([url]) => url.startsWith("/api/patient-accounts")),
  ).toBe(false);
  fireEvent.change(input, { target: { value: patient.id } });
  expect(
    fetch.mock.calls.some(([url]) => url.startsWith("/api/patient-accounts")),
  ).toBe(false);
  fireEvent.click(lookup);
  await screen.findByText(patient.name);
  expect(screen.queryByText(patient.email)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Khóa tài khoản" }));
  const lock = screen.getByRole("dialog");
  const confirmLock = within(lock).getByRole("button", {
    name: "Xác nhận khóa",
  });
  expect(confirmLock).toHaveProperty("disabled", true);
  fireEvent.change(within(lock).getByLabelText("Lý do"), {
    target: { value: "SECURITY_REVIEW" },
  });
  fireEvent.click(confirmLock);
  await screen.findByText("Đã khóa");
  expect(patient.active).toBe(false);

  fireEvent.click(screen.getByRole("button", { name: "Mở khóa tài khoản" }));
  const unlock = screen.getByRole("dialog");
  fireEvent.change(within(unlock).getByLabelText("Lý do"), {
    target: { value: "PATIENT_REQUEST" },
  });
  fireEvent.click(
    within(unlock).getByRole("button", { name: "Xác nhận mở khóa" }),
  );
  await screen.findByText("Đang hoạt động");
  expect(patient.active).toBe(true);

  fireEvent.change(input, { target: { value: "1-1-1-1-1" } });
  expect(screen.queryByText(patient.name)).toBeNull();
  fireEvent.click(lookup);
  await screen.findByText("Nhập mã tài khoản UUID hợp lệ.");
});

it("ẩn trang quản lý tài khoản bệnh nhân với lễ tân", () => {
  openPage("RECEPTIONIST");
  expect(
    screen.queryByRole("link", { name: "Tài khoản bệnh nhân" }),
  ).toBeNull();
  expect(screen.queryByRole("button", { name: "Tra cứu" })).toBeNull();
});
