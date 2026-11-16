import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { setFetchImpl } from "@/core/client";
import { DoctorConsultationPage } from "@/features/doctor/Consultation";
import { ToastProvider } from "@/ui";

vi.mock("@/core/config", () => ({config:{backend:{clinical:true,progress:true}}}));
const appt = {id:"appt",patientId:"patient",doctorId:"doc",slotId:"slot",startAt:"2030-01-08T02:00:00Z",endAt:"2030-01-08T02:20:00Z",mode:"IN_PERSON",status:"IN_PROGRESS",version:2};
const appointmentList = [appt];
vi.mock("@/features/doctor/DoctorContext", () => ({useDoctor:() => ({appointments:appointmentList,loading:false,reload:async()=>{}})}));
let writes: {url:string; body:any; headers:Headers}[];
let failIssue: boolean;
beforeEach(() => {
  cleanup(); writes = []; failIssue = false;
  setFetchImpl(async (url, init) => {
    if (init.method === "PUT" || init.method === "POST") writes.push({url,body:JSON.parse(String(init.body)),headers:new Headers(init.headers)});
    if (url.endsWith("/issue") && failIssue) {failIssue=false;return new Response("{}",{status:503});}
    const item = {medicineName:"Thuốc mô phỏng",doseText:"Liều cũ",route:"Uống",frequency:"Mô phỏng",durationText:"Mô phỏng"};
    const data = url === "/api/appointments/appt" ? {...appt,encounterId:"enc"} :
      url === "/api/encounters/enc/record" ? {id:"record",encounterId:"enc",version:2,status:"DRAFT",content:"Ghi chú đã lưu"} :
      url === "/api/encounters/enc/prescriptions" ? [{id:"rx",encounterId:"enc",version:3,status:"DRAFT",items:[item]}] :
      url === "/api/prescriptions/rx" ? {id:"rx",encounterId:"enc",version:4,status:"DRAFT",items:[item]} : [];
    return new Response(JSON.stringify(data));
  });
});

it("gửi lại phát hành sau 503 giữ key và không lưu lại đơn một lần nữa", async () => {
  failIssue=true;
  open(); await screen.findByLabelText("Ghi chú");
  fireEvent.click(screen.getByRole("tab",{name:"Đơn thuốc"}));
  fireEvent.click(await screen.findByRole("button",{name:"Phát hành đơn"}));
  await waitFor(() => expect(writes.filter(x => x.url.endsWith("/issue"))).toHaveLength(1));
  const retry = await screen.findByRole("button",{name:"Phát hành đơn"});
  await waitFor(() => expect((retry as HTMLButtonElement).disabled).toBe(false));
  fireEvent.click(screen.getByRole("tab",{name:"Bệnh án"}));
  fireEvent.click(screen.getByRole("tab",{name:"Đơn thuốc"}));
  fireEvent.click(screen.getByRole("button",{name:"Phát hành đơn"}));
  await waitFor(() => expect(writes.filter(x => x.url.endsWith("/issue"))).toHaveLength(2));
  const issues=writes.filter(x => x.url.endsWith("/issue"));
  expect(issues[0].headers.get("Idempotency-Key")).toBe(issues[1].headers.get("Idempotency-Key"));
  expect(writes.filter(x => x.url === "/api/prescriptions/rx")).toHaveLength(1);
});
const open = () => render(<ToastProvider><MemoryRouter initialEntries={["/doctor/consultation/appt"]}><Routes><Route path="/doctor/consultation/:appointmentId" element={<DoctorConsultationPage/>}/></Routes></MemoryRouter></ToastProvider>);

it("mở ca khám bằng detail rồi lấy bản nháp theo encounter để không mất nội dung/version", async () => {
  open();
  const notes = await screen.findByLabelText("Ghi chú");
  expect((notes as HTMLTextAreaElement).value).toBe("Ghi chú đã lưu");
  fireEvent.click(screen.getByRole("button",{name:/Lưu nháp/}));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0].url).toBe("/api/encounters/enc/record");
  expect(writes[0].body.version).toBe(2);
  expect(writes[0].headers.get("Idempotency-Key")).toBeTruthy();
});

it("sửa đơn nháp đang có bằng PUT thay vì tạo đơn mới", async () => {
  open();
  await screen.findByLabelText("Ghi chú");
  fireEvent.click(screen.getByRole("tab",{name:"Đơn thuốc"}));
  const dose = await screen.findByLabelText("Liều dùng",{exact:false});
  fireEvent.change(dose,{target:{value:"Liều mới mô phỏng"}});
  fireEvent.click(screen.getByRole("button",{name:/Lưu nháp/}));
  await waitFor(() => expect(writes).toHaveLength(1));
  expect(writes[0].url).toBe("/api/prescriptions/rx");
  expect(writes[0].body.version).toBe(3);
  expect(writes[0].headers.get("Idempotency-Key")).toBeTruthy();
});
