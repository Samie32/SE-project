import { afterEach,expect,it,vi } from "vitest";
import { cleanup,fireEvent,render,screen,waitFor,within } from "@testing-library/react";
import { ScheduleManager } from "@/features/doctor/Schedule";
import { ToastProvider } from "@/ui";
import { createAvailability,deleteAvailability } from "@/api/schedule";
import { ApiError } from "@/core/client";
vi.mock("@/api/clinic-hours", async () => ({
  getClinicHours: async () => ({ days: (await import("@/core/clinic-hours")).DEFAULT_CLINIC_HOURS }),
}));
vi.mock("@/api/schedule",()=>({
  listAvailability:vi.fn(async()=>[{id:"one",doctorId:"doctor",startAt:"2030-01-08T01:00:00Z",endAt:"2030-01-08T05:00:00Z",slotMinutes:20,mode:"REMOTE"}]),
  listTimeOff:vi.fn(async()=>[]),createAvailability:vi.fn(async()=>({})),createTimeOff:vi.fn(async()=>({})),
  deleteAvailability:vi.fn(async()=>undefined),deleteTimeOff:vi.fn(async()=>undefined),
}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("mặc định 20 phút, ẩn ca đã có và chặn trùng ca khác hình thức",async()=>{
  render(<ToastProvider><ScheduleManager doctorId="doctor" /></ToastProvider>);
  const days=await screen.findAllByRole("button",{name:/Xem chi tiết ngày/});
  fireEvent.click(days[4]);
  fireEvent.click(screen.getByRole("button",{name:"Thêm ca làm việc"}));
  const date=screen.getByLabelText("Ngày làm việc",{exact:false});
  fireEvent.change(date,{target:{value:"2030-01-08"}});
  await waitFor(()=>expect((screen.getByRole("button",{name:"Thêm ca làm việc"}) as HTMLButtonElement).disabled).toBe(false));
  expect((screen.getByLabelText(/Phút mỗi lượt khám/) as HTMLInputElement).value).toBe("20");
  expect(screen.queryByRole("button",{name:/Ca sáng/})).toBeNull();
  expect((screen.getByLabelText(/Giờ bắt đầu ca/) as HTMLInputElement).value).toBe("13:00");
  fireEvent.change(screen.getByLabelText(/Giờ bắt đầu ca/),{target:{value:"08:00"}});
  fireEvent.change(screen.getByLabelText(/Giờ kết thúc ca/),{target:{value:"12:00"}});
  expect((screen.getByRole("button",{name:"Thêm ca làm việc"}) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole("button",{name:"Thêm ca làm việc"}));
  expect(createAvailability).not.toHaveBeenCalled();
  expect(screen.getAllByText(/Trùng ca/).length).toBeGreaterThan(0);
});

async function openShift() {
  render(<ToastProvider><ScheduleManager doctorId="doctor" /></ToastProvider>);
  const days=await screen.findAllByRole("button",{name:/Xem chi tiết ngày/});
  fireEvent.click(days[4]);
  fireEvent.click(screen.getByRole("button",{name:"Thêm ca làm việc"}));
  fireEvent.change(screen.getByLabelText(/Ngày làm việc/),{target:{value:"2030-01-08"}});
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Đóng"}));
  fireEvent.click(await screen.findByRole("button",{name:/Xem ca.*08:00/}));
}
it("chọn ca trên lịch, hủy xác nhận không gọi API; xóa chỉ sau xác nhận",async()=>{
  await openShift();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Xóa ca"}));
  expect(deleteAvailability).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Quay lại"}));
  expect(deleteAvailability).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Xóa ca"}));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Xác nhận xóa ca"}));
  await waitFor(()=>expect(deleteAvailability).toHaveBeenCalledWith("one"));
});
it("409 không đóng dialog hoặc thông báo xóa thành công",async()=>{
  vi.mocked(deleteAvailability).mockRejectedValueOnce(new ApiError(409,"conflict"));
  await openShift();fireEvent.click(screen.getByRole("button",{name:"Xóa ca"}));
  fireEvent.click(screen.getByRole("button",{name:"Xác nhận xóa ca"}));
  await screen.findByText(/đã từng có lịch hẹn/);
  expect(screen.getByRole("dialog")).toBeTruthy();
});
