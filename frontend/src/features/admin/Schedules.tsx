import { useEffect, useState } from "react";
import { useDirectory } from "@/core/directory";
import { PageHead, Panel } from "@/ui";
import { ScheduleManager, type ModeFilter, type ShiftFilter } from "@/features/doctor/Schedule";

export function SchedulesPage() {
  const dir = useDirectory();
  const [specialtyId, setSpecialtyId] = useState("");
  const [shiftFilter, setShiftFilter] = useState<ShiftFilter>("ALL");
  const [modeFilter, setModeFilter] = useState<ModeFilter>("ALL");
  const [doctorId, setDoctorId] = useState("");

  const doctors = dir.doctors.filter(d => !specialtyId || d.specialtyIds.includes(specialtyId));

  useEffect(() => {
    if (doctors.length === 0) {
      if (doctorId) setDoctorId("");
      return;
    }
    if (!doctors.some(d => d.id === doctorId)) {
      setDoctorId(doctors[0].id);
    }
  }, [doctors, doctorId]);

  return (
    <>
      <PageHead title="Lịch làm việc" />
      <Panel>
        <div className="stack" style={{ gap: 10 }}>
          <div className="filters schedules-filters" style={{ marginBottom: 0 }}>
            <select
              className="field"
              aria-label="Lọc theo chuyên khoa"
              value={specialtyId}
              onChange={e => setSpecialtyId(e.target.value)}
            >
              <option value="">Chuyên khoa</option>
              {dir.specialties.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              className="field grow"
              aria-label="Chọn bác sĩ"
              value={doctorId}
              disabled={doctors.length === 0}
              onChange={e => setDoctorId(e.target.value)}
            >
              {doctors.length === 0 ? (
                <option value="">Không có bác sĩ thuộc khoa này</option>
              ) : (
                doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {dir.doctorName(d.id)} — {dir.doctorSpecialties(d.id)}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="filters schedules-filters" style={{ marginBottom: 0 }}>
            <select
              className="field"
              aria-label="Lọc thuộc ca"
              value={shiftFilter}
              onChange={e => setShiftFilter(e.target.value as ShiftFilter)}
            >
              <option value="ALL">Ca</option>
              <option value="MORNING">Ca sáng</option>
              <option value="AFTERNOON">Ca chiều</option>
            </select>
            <select
              className="field"
              aria-label="Lọc theo hình thức"
              value={modeFilter}
              onChange={e => setModeFilter(e.target.value as ModeFilter)}
            >
              <option value="ALL">Hình thức</option>
              <option value="IN_PERSON">Trực tiếp</option>
              <option value="REMOTE">Từ xa</option>
            </select>
          </div>
        </div>
      </Panel>
      {doctorId && <ScheduleManager key={doctorId} doctorId={doctorId} shiftFilter={shiftFilter} modeFilter={modeFilter} />}
    </>
  );
}
