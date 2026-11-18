import { afterEach, beforeEach, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { installMock, MockSessionProvider } from "@/mock";

function CurrentPath() { return <p data-testid="path">{useLocation().pathname}</p>; }
beforeEach(() => {sessionStorage.clear();installMock();});
afterEach(cleanup);

it("chọn lễ tân từ URL bác sĩ chuyển về trang staff", async () => {
  render(<MemoryRouter initialEntries={["/doctor/appointments"]}><MockSessionProvider><CurrentPath /></MockSessionProvider></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", {name:/Phạm Lan Anh/}));
  await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/staff"));
});
