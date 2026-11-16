import type { ReactNode } from "react";
import { Clock3 } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { MODE_LABEL, apptCode } from "@/core/labels";
import { formatTime, dayKey } from "@/core/datetime";
import type { Appointment } from "@/core/types";
import { StatusPill } from "@/ui";

/** Một dòng lịch hẹn dùng chung (bệnh nhân / bác sĩ). */
export function AppointmentRow({ item, actions, subject }: { item: Appointment; actions?: ReactNode; subject?: "doctor" | "patient" }) {
  const dir = useDirectory();
  const day = dayKey(item.startAt);
  return (
    <div className="appt">
      <span className="date">
        <b>{day.slice(8, 10)}</b>
        <small>THÁNG {day.slice(5, 7)}</small>
      </span>
      <div className="main-info">
        <div className="row" style={{ gap: 8 }}>
          <b>{subject === "patient" ? "Bệnh nhân " + item.patientId.slice(-8).toUpperCase() : dir.doctorName(item.doctorId)}</b>
          <StatusPill status={item.status} />
        </div>
        <small>
          {subject === "patient" ? dir.doctorName(item.doctorId) : dir.doctorSpecialties(item.doctorId)} · <span className="mono" title={item.id}>{apptCode(item.id)}</span>
        </small>
      </div>
      <div className="time">
        <Clock3 size={18} aria-hidden />
        <span>
          <b>{formatTime(item.startAt)}–{formatTime(item.endAt)}</b>
          <small>{MODE_LABEL[item.mode]}</small>
        </span>
      </div>
      <div className="acts">{actions}</div>
    </div>
  );
}
