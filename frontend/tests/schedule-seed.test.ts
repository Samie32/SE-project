import { expect,it } from "vitest";
import { resetDb,getDb } from "@/mock/db";
import { overlaps,scheduleIntervalError } from "@/core/schedule-rules";
it("lịch seed mock nằm trong giờ phòng khám và không trùng ca cùng bác sĩ",()=>{
  resetDb();const db=getDb();
  for(const shift of db.avail){
    expect(scheduleIntervalError(shift.startAt,shift.endAt,0)).toBe("");
    expect(db.avail.filter(other=>other.id!==shift.id&&other.doctorId===shift.doctorId&&overlaps(shift.startAt,shift.endAt,other))).toHaveLength(0);
  }
});
