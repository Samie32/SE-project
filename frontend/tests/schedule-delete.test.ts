import { beforeEach,expect,it } from "vitest";
import { setFetchImpl,setTokenGetter } from "@/core/client";
import { mockFetch } from "@/mock/server";
import { D1,getDb,genSlots,resetDb } from "@/mock/db";
import { deleteAvailability,deleteTimeOff } from "@/api/schedule";
beforeEach(()=>{
  sessionStorage.clear();resetDb();setFetchImpl(mockFetch);
  setTokenGetter(()=>"mock.00000000-0000-0000-0000-000000000002");
});
function fixture() {
  const db=getDb();
  const shift={id:"test-shift",doctorId:D1,startAt:"2030-01-08T01:00:00Z",endAt:"2030-01-08T05:00:00Z",mode:"IN_PERSON",slotMinutes:20};
  db.avail.push(shift);db.slots.push(...genSlots(shift));return {db,shift};
}
it("DELETE 204 gỡ ca và slot liên quan, giữ ca khác",async()=>{
  const {db,shift}=fixture();const count=db.avail.length;
  await expect(deleteAvailability(shift.id)).resolves.toBeUndefined();
  expect(db.avail).toHaveLength(count-1);
  expect(db.slots.some(s=>s.availabilityId===shift.id)).toBe(false);
});
it("ca có lịch hẹn đã hủy vẫn bị chặn và không mất slot",async()=>{
  const {db,shift}=fixture();const slot=db.slots.find(s=>s.availabilityId===shift.id)!;
  db.appts.push({...db.appts[0],id:"cancelled",slotId:slot.id,doctorId:D1,status:"CANCELLED"});
  await expect(deleteAvailability(shift.id)).rejects.toMatchObject({status:409});
  expect(db.avail.some(a=>a.id===shift.id)).toBe(true);
  expect(db.slots.some(s=>s.id===slot.id)).toBe(true);
});
it("bác sĩ khác không xóa được ca",async()=>{
  const {shift}=fixture();setTokenGetter(()=>"mock.00000000-0000-0000-0000-000000000007");
  await expect(deleteAvailability(shift.id)).rejects.toMatchObject({status:403});
});
it("giữ lịch quá khứ và cho hủy khoảng nghỉ tương lai",async()=>{
  const {db,shift}=fixture();shift.startAt="2020-01-01T01:00:00Z";
  await expect(deleteAvailability(shift.id)).rejects.toMatchObject({status:409});
  db.timeoff.push({id:"off",doctorId:D1,startAt:"2030-01-08T01:00:00Z",endAt:"2030-01-08T05:00:00Z"});
  await expect(deleteTimeOff("off")).resolves.toBeUndefined();
  expect(db.timeoff.some(t=>t.id==="off")).toBe(false);
});
