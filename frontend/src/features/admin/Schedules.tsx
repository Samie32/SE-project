import { useEffect, useState } from "react";
import { useDirectory } from "@/core/directory";
import { PageHead, Panel } from "@/ui";
import { ScheduleManager } from "@/features/doctor/Schedule";

export function SchedulesPage() {
  const dir = useDirectory();
  const [doctorId, setDoctorId] = useState("");
  useEffect(() => { if (!doctorId && dir.doctors[0]) setDoctorId(dir.doctors[0].id); }, [dir.doctors, doctorId]);
  return (
    <>
      <PageHead eyebrow="Quản trị" title="Lịch làm việc bác sĩ" text="Xem và cấu hình ca làm việc, ngày nghỉ của từng bác sĩ." />
      <Panel>
        <select className="field" aria-label="Chọn bác sĩ" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
          {dir.doctors.map((d) => <option key={d.id} value={d.id}>{dir.doctorName(d.id)} — {dir.doctorSpecialties(d.id)}</option>)}
        </select>
      </Panel>
      {doctorId && <ScheduleManager key={doctorId} doctorId={doctorId} />}
    </>
  );
}
