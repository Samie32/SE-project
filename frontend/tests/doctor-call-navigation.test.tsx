import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { DoctorCallLayout } from "@/features/doctor/Telehealth";

vi.mock("@/features/doctor/DoctorContext", () => ({
  useDoctor: () => ({appointments: [{id:"appt", patientId:"patient", mode:"REMOTE",
    status:"IN_PROGRESS", startAt:"2030-01-08T02:00:00Z"}], loading:false})
}));
vi.mock("@/features/shared/TelehealthRoom", () => ({
  TelehealthRoom: () => <video data-testid="call" />
}));
afterEach(cleanup);

function open(path: string) {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route element={<DoctorCallLayout />}>
      <Route path="/doctor/telehealth/:appointmentId?" element={null} />
      <Route path="/doctor/consultation/:appointmentId?" element={<Link to="/doctor/telehealth/appt">Về phòng</Link>} />
    </Route>
  </Routes></MemoryRouter>);
}

it("giữ nguyên phòng khi mở hồ sơ rồi quay lại", () => {
  open("/doctor/telehealth/appt");
  const room = screen.getByTestId("call");
  fireEvent.click(screen.getByRole("link", {name:"Mở hồ sơ khám"}));
  expect(screen.getByTestId("call")).toBe(room);
  fireEvent.click(screen.getByRole("link", {name:"Về phòng"}));
  expect(screen.getByTestId("call")).toBe(room);
});

it("mở trực tiếp hồ sơ không khởi tạo phòng", () => {
  open("/doctor/consultation/appt");
  expect(screen.queryByTestId("call")).toBeNull();
});
