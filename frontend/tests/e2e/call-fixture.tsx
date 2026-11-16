// Dev-server-only fixture. Vite's production entry does not include this page.
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { TelehealthRoom } from "@/features/shared/TelehealthRoom";
import { ToastProvider } from "@/ui";
import { setTokenGetter } from "@/core/client";
import type { Appointment } from "@/core/types";
import "@/styles/app.css";
const role=new URLSearchParams(location.search).get("role") === "DOCTOR" ? "DOCTOR" : "PATIENT";
setTokenGetter(()=>`synthetic.${role}`);
function Fixture() {
  const [appointment,setAppointment]=useState<Appointment>({id:"00000000-0000-4000-8000-000000000001",patientId:"00000000-0000-4000-8000-000000000002",doctorId:"00000000-0000-4000-8000-000000000003",slotId:"00000000-0000-4000-8000-000000000004",startAt:new Date(Date.now()-60000).toISOString(),endAt:new Date(Date.now()+1140000).toISOString(),mode:"REMOTE",status:"CONFIRMED",version:0});
  return <ToastProvider><TelehealthRoom role={role} appointment={appointment} counterpartName={role === "DOCTOR" ? "Bệnh nhân thử nghiệm" : "Bác sĩ thử nghiệm"} onSessionChange={s=>{
    if (s && ["ACTIVE","RECONNECTING","ENDED"].includes(s.status)) setAppointment(a=>a.status === "IN_PROGRESS" ? a : {...a,status:"IN_PROGRESS"});
  }}/></ToastProvider>;
}
createRoot(document.getElementById("root")!).render(<React.StrictMode><Fixture/></React.StrictMode>);
