import React from "react";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { LoginGate } from "../src/portal/LoginGate";
const mock = vi.hoisted(() => ({ signinRedirect: vi.fn(), state: {} as any }));
vi.mock("react-oidc-context", () => ({
  useAuth: () => ({ ...mock.state, signinRedirect: mock.signinRedirect }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mock.state = { isLoading: false };
  mock.signinRedirect.mockResolvedValue(undefined);
});
afterEach(cleanup);
it("opens the real login form automatically, once under StrictMode", async () => {
  render(
    <React.StrictMode>
      <LoginGate />
    </React.StrictMode>,
  );
  await waitFor(() => expect(mock.signinRedirect).toHaveBeenCalledTimes(1));
  expect(
    screen.queryByRole("button", { name: "Đăng nhập an toàn" }),
  ).toBeNull();
});
it("does not restart an authentication flow already in progress", () => {
  mock.state.activeNavigator = "signinRedirect";
  render(<LoginGate />);
  expect(mock.signinRedirect).not.toHaveBeenCalled();
});
it("shows a retry only when opening the login service fails", async () => {
  mock.signinRedirect.mockRejectedValueOnce(new Error("offline"));
  render(<LoginGate />);
  fireEvent.click(await screen.findByRole("button", { name: "Thử lại" }));
  await waitFor(() => expect(mock.signinRedirect).toHaveBeenCalledTimes(2));
});
