import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TelehealthRoom } from "@/features/shared/TelehealthRoom";
import { ToastProvider } from "@/ui";
import { setFetchImpl } from "@/core/client";
import type { Appointment } from "@/core/types";
vi.mock("@/core/config", () => ({config:{backend:{telehealth:true}}}));
vi.mock("@/core/webrtc", () => ({WebRtcCall:class {
  updateSession() {} admit() {return Promise.resolve();} replaceLocalStream() {return Promise.resolve();}
  restart() {return Promise.resolve();} close() {}
}}));
beforeEach(() => {
  const track={kind:"audio",readyState:"live",enabled:true,stop:vi.fn()};
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:vi.fn(async()=>({getTracks:()=>[track],getAudioTracks:()=>[track],getVideoTracks:()=>[]}))}});
});
afterEach(() => {cleanup();vi.useRealTimers();});
it("prepare một lần rồi GET trạng thái để nhận biết phòng đã kết thúc", async () => {
  vi.useFakeTimers({toFake:["Date","setInterval","clearInterval"]});
  vi.setSystemTime(new Date("2030-01-08T02:00:00Z"));
  const requests: {url:string; method:string}[] = [];
  setFetchImpl(async (url, init) => {
    const method = init.method ?? "GET"; requests.push({url,method});
    return new Response(JSON.stringify({id:"room",appointmentId:"appt",status:method === "POST" ? "WAITING" : "ENDED",version:method === "POST" ? 1 : 3}));
  });
  const appointment = {id:"appt",startAt:"2030-01-08T02:00:00Z",endAt:"2030-01-08T02:20:00Z",mode:"REMOTE",status:"CONFIRMED",version:0} as Appointment;
  render(<ToastProvider><TelehealthRoom role="PATIENT" appointment={appointment} counterpartName="Bác sĩ"/></ToastProvider>);
  await waitFor(() => expect(requests).toHaveLength(1));
  await act(async () => {vi.advanceTimersByTime(5000);});
  await waitFor(() => expect(requests.some(x => x.method === "GET" && x.url === "/api/telehealth-sessions/room")).toBe(true));
  expect(requests.filter(x => x.method === "POST")).toHaveLength(1);
  expect(await screen.findByText(/Phiên đã kết thúc/)).toBeTruthy();
});

it("không để GET đến trễ ghi đè phiên ACTIVE mới hơn sau lệnh start", async () => {
  vi.useFakeTimers({toFake:["Date","setInterval","clearInterval"]});
  vi.setSystemTime(new Date("2030-01-08T02:00:00Z"));
  let finishPoll: ((value:Response) => void) | undefined;
  setFetchImpl(async (url, init) => {
    if (!init.method || init.method === "GET") return new Promise(resolve => {finishPoll=resolve;});
    const result = url.endsWith("/join") ? {sessionId:"room",token:"synthetic",expiresAt:"2030-01-08T02:05:00Z"} :
      {id:"room",appointmentId:"appt",status:url.endsWith("/start") ? "ACTIVE" : "WAITING",version:url.endsWith("/start") ? 2 : 1};
    return new Response(JSON.stringify(result));
  });
  const appointment={id:"appt",startAt:"2030-01-08T02:00:00Z",endAt:"2030-01-08T02:20:00Z",mode:"REMOTE",status:"CONFIRMED",version:0} as Appointment;
  render(<ToastProvider><TelehealthRoom role="DOCTOR" appointment={appointment} counterpartName="Bệnh nhân"/></ToastProvider>);
  const start=await screen.findByRole("button",{name:"Bắt đầu phiên khám"});
  await waitFor(() => expect((start as HTMLButtonElement).disabled).toBe(false));
  await act(async () => {vi.advanceTimersByTime(5000);});
  fireEvent.click(start);
  await screen.findByRole("button",{name:"Kết thúc phiên"});
  await act(async () => {finishPoll!(new Response(JSON.stringify({id:"room",appointmentId:"appt",status:"WAITING",version:1})));});
  expect(screen.getByRole("button",{name:"Kết thúc phiên"})).toBeTruthy();
});
