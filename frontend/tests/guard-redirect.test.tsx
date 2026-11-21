import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { Guard } from "@/auth/Guard";
import { hasPermission } from "@/core/permissions";
import { SessionContext } from "@/core/session";

afterEach(cleanup);

function PathProbe() {
  return <div data-testid="current-path">{useLocation().pathname}</div>;
}

function renderGuard(state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: "/patient", state }]}>
      <SessionContext.Provider
        value={{
          status: "ready",
          error: "",
          identity: { id: "admin-1", roles: ["ADMINISTRATOR"] },
          roles: ["ADMINISTRATOR"],
          displayName: "Admin",
          can: (p) => hasPermission(["ADMINISTRATOR"], p),
          login: vi.fn(),
          logout: vi.fn(),
          retry: vi.fn(),
        }}
      >
        <Routes>
          <Route
            path="/patient"
            element={
              <Guard permission="patient.portal">
                <div>Patient Portal</div>
              </Guard>
            }
          />
          <Route path="/staff" element={<PathProbe />} />
        </Routes>
      </SessionContext.Provider>
    </MemoryRouter>,
  );
}

it("tự chuyển về trang chủ theo vai trò ngay sau đăng nhập khi route lưu từ phiên trước trái quyền", () => {
  renderGuard({ fromSignin: true });
  expect(screen.getByTestId("current-path").textContent).toBe("/staff");
  expect(screen.queryByText("403 — Không đủ quyền")).toBeNull();
});

it("vẫn trả 403 — Không đủ quyền khi người dùng đang đăng nhập truy cập trực tiếp đường dẫn trái quyền", () => {
  renderGuard();
  expect(screen.getByText("403 — Không đủ quyền")).toBeTruthy();
  const link = screen.getByRole("link", { name: "Về trang của tôi" }) as HTMLAnchorElement;
  expect(link.getAttribute("href")).toBe("/staff");
});
