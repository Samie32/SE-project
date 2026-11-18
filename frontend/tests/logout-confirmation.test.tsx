import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SessionContext, type Session } from "@/core/session";
import { AppShell } from "@/layouts/AppShell";

afterEach(cleanup);
function setup(path="/staff") {
  const logout=vi.fn();
  const session:Session={status:"ready",identity:null,roles:["RECEPTIONIST"],displayName:"Demo",error:"",can:()=>false,login:vi.fn(),logout,retry:vi.fn()};
  render(<MemoryRouter initialEntries={[path]}><SessionContext.Provider value={session}><AppShell /></SessionContext.Provider></MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"Đăng xuất"}));
  return logout;
}
it("chỉ đăng xuất sau xác nhận, hủy giữ phiên hiện tại",()=>{
  const logout=setup();expect(logout).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Ở lại"}));
  expect(screen.queryByRole("dialog")).toBeNull();expect(logout).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Đăng xuất"}));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Đăng xuất",exact:true}));
  expect(logout).toHaveBeenCalledTimes(1);
});
it("Escape đóng xác nhận mà không đăng xuất",()=>{
  const logout=setup();fireEvent.keyDown(document,{key:"Escape"});
  expect(screen.queryByRole("dialog")).toBeNull();expect(logout).not.toHaveBeenCalled();
});
it("cảnh báo cuộc gọi và dữ liệu chưa lưu",()=>{
  setup("/doctor/telehealth/demo");
  const dialog=screen.getByRole("dialog");
  expect(dialog.textContent).toContain("không tự kết thúc phiên khám");
  expect(dialog.textContent).toContain("chưa lưu");
});
