import { useState } from "react";
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { createAvailability, createTimeOff, listAvailability, listTimeOff } from "@/api/schedule";
import { errorMessage } from "@/core/client";
import { useAsync } from "@/core/useAsync";
import { addDays, dayKey, formatDateTime, formatTime, localToIso, longDate, todayKey, weekStart, weekdayShort } from "@/core/datetime";
import { MODE_SHORT } from "@/core/labels";
import type { AppointmentMode } from "@/core/types";
import { AsyncBlock, Field, Notice, PageHead, Panel, Pill, useToast } from "@/ui";
import { useDoctor } from "./DoctorContext";

const SLOTS = [10, 15, 20, 30, 45, 60];

export function ScheduleManager({ doctorId }: { doctorId: string }) {
  const toast = useToast();
  const [week, setWeek] = useState(weekStart(todayKey()));
  const av = useAsync(() => listAvailability(doctorId), [doctorId]);
  const off = useAsync(() => listTimeOff(doctorId), [doctorId]);
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));

  const [a, setA] = useState({ date: todayKey(), start: "08:00", end: "12:00", slot: 30, mode: "IN_PERSON" as AppointmentMode });
  const [aErr, setAErr] = useState(""); const [aBusy, setABusy] = useState(false);
  const [o, setO] = useState({ sDate: todayKey(), sTime: "00:00", eDate: todayKey(), eTime: "23:59" });
  const [oErr, setOErr] = useState(""); const [oBusy, setOBusy] = useState(false);

  const addAv = async (e: React.FormEvent) => {
    e.preventDefault(); setAErr("");
    if (!a.date) return setAErr("Chọn ngày.");
    if (a.end <= a.start) return setAErr("Giờ kết thúc phải sau giờ bắt đầu.");
    const startAt = localToIso(a.date, a.start), endAt = localToIso(a.date, a.end);
    if (new Date(startAt).getTime() <= Date.now()) return setAErr("Ca làm việc phải bắt đầu trong tương lai.");
    const mins = (new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000;
    if (mins < a.slot) return setAErr("Ca làm việc ngắn hơn độ dài một lượt khám.");
    setABusy(true);
    try { await createAvailability(doctorId, { startAt, endAt, slotMinutes: a.slot, mode: a.mode }); toast.success("Đã thêm ca làm việc."); av.reload(); }
    catch (x) { setAErr(errorMessage(x)); } finally { setABusy(false); }
  };
  const addOff = async (e: React.FormEvent) => {
    e.preventDefault(); setOErr("");
    const startAt = localToIso(o.sDate, o.sTime), endAt = localToIso(o.eDate, o.eTime);
    if (endAt <= startAt) return setOErr("Thời điểm kết thúc phải sau thời điểm bắt đầu.");
    setOBusy(true);
    try { await createTimeOff(doctorId, { startAt, endAt }); toast.success("Đã thêm thời gian nghỉ."); off.reload(); }
    catch (x) { setOErr(errorMessage(x)); } finally { setOBusy(false); }
  };

  const avs = av.data ?? [], offs = off.data ?? [];
  return (
    <>
      <Panel title="Lịch tuần" subtitle={`${longDate(days[0])} – ${longDate(days[6])}`}
        actions={<div className="row"><button className="btn sm" aria-label="Tuần trước" onClick={() => setWeek(addDays(week, -7))}><ChevronLeft size={15} /></button>
          <button className="btn sm" onClick={() => setWeek(weekStart(todayKey()))}>Tuần này</button><button className="btn sm" aria-label="Tuần sau" onClick={() => setWeek(addDays(week, 7))}><ChevronRight size={15} /></button></div>}>
        <AsyncBlock loading={av.loading || off.loading} error={av.error || off.error} onRetry={() => { av.reload(); off.reload(); }}>
          <div className="weekgrid">{days.map((d) => {
            const dayAv = avs.filter((x) => dayKey(x.startAt) === d).sort((x, y) => x.startAt.localeCompare(y.startAt));
            const dayOff = offs.filter((x) => dayKey(x.startAt) <= d && dayKey(x.endAt) >= d);
            return (
              <div key={d} className={"weekday" + (d === todayKey() ? " today" : "")}>
                <div className="wd-head"><b>{weekdayShort(d)}</b><span className="muted">{d.slice(8)}/{d.slice(5, 7)}</span></div>
                {dayAv.length === 0 && dayOff.length === 0 && <p className="muted">Chưa có ca</p>}
                {dayAv.map((x) => <div key={x.id} className="wblock"><b>{formatTime(x.startAt)}–{formatTime(x.endAt)}</b><span className="muted">{x.slotMinutes}’ · {MODE_SHORT[x.mode]}</span></div>)}
                {dayOff.map((x) => <div key={x.id} className="wblock off"><CalendarOff size={12} aria-hidden /> Nghỉ</div>)}
              </div>
            );
          })}</div>
        </AsyncBlock>
        <p className="muted" style={{ marginTop: 10 }}>Backend hiện chỉ hỗ trợ thêm ca và ngày nghỉ; chưa có thao tác sửa/xóa.</p>
      </Panel>
      <div className="grid2">
        <Panel title="Thêm ca làm việc">
          <form onSubmit={(e) => void addAv(e)} noValidate>
            {aErr && <Notice tone="error">{aErr}</Notice>}
            <div className="formgrid">
              <Field label="Ngày" required>{(id) => <input id={id} type="date" className="field" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />}</Field>
              <Field label="Hình thức" required>{(id) => <select id={id} className="field" value={a.mode} onChange={(e) => setA({ ...a, mode: e.target.value as AppointmentMode })}><option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option><option value="REMOTE">{MODE_SHORT.REMOTE}</option></select>}</Field>
              <Field label="Từ giờ" required>{(id) => <input id={id} type="time" className="field" value={a.start} onChange={(e) => setA({ ...a, start: e.target.value })} />}</Field>
              <Field label="Đến giờ" required>{(id) => <input id={id} type="time" className="field" value={a.end} onChange={(e) => setA({ ...a, end: e.target.value })} />}</Field>
              <Field label="Phút / lượt khám" required>{(id) => <select id={id} className="field" value={a.slot} onChange={(e) => setA({ ...a, slot: Number(e.target.value) })}>{SLOTS.map((s) => <option key={s} value={s}>{s} phút</option>)}</select>}</Field>
            </div>
            <div style={{ marginTop: 14 }}><button className="btn primary" disabled={aBusy}><Plus size={15} aria-hidden /> Thêm ca</button></div>
          </form>
        </Panel>
        <Panel title="Thêm thời gian nghỉ" subtitle="Các slot trùng thời gian nghỉ sẽ không còn hiển thị cho bệnh nhân.">
          <form onSubmit={(e) => void addOff(e)} noValidate>
            {oErr && <Notice tone="error">{oErr}</Notice>}
            <div className="formgrid">
              <Field label="Từ ngày" required>{(id) => <input id={id} type="date" className="field" value={o.sDate} onChange={(e) => setO({ ...o, sDate: e.target.value })} />}</Field>
              <Field label="Giờ">{(id) => <input id={id} type="time" className="field" value={o.sTime} onChange={(e) => setO({ ...o, sTime: e.target.value })} />}</Field>
              <Field label="Đến ngày" required>{(id) => <input id={id} type="date" className="field" value={o.eDate} onChange={(e) => setO({ ...o, eDate: e.target.value })} />}</Field>
              <Field label="Giờ">{(id) => <input id={id} type="time" className="field" value={o.eTime} onChange={(e) => setO({ ...o, eTime: e.target.value })} />}</Field>
            </div>
            <div style={{ marginTop: 14 }}><button className="btn primary" disabled={oBusy}><CalendarOff size={15} aria-hidden /> Thêm ngày nghỉ</button></div>
          </form>
          {offs.length > 0 && <div style={{ marginTop: 14 }}>{[...offs].sort((x, y) => y.startAt.localeCompare(x.startAt)).slice(0, 6).map((x) => <div key={x.id} className="row between"><Pill>Nghỉ</Pill><span className="muted">{formatDateTime(x.startAt)} → {formatDateTime(x.endAt)}</span></div>)}</div>}
        </Panel>
      </div>
    </>
  );
}

export function DoctorSchedulePage() {
  const { doctorId, resolving, error } = useDoctor();
  return (
    <>
      <PageHead eyebrow="Bác sĩ" title="Lịch làm việc" text="Cấu hình ca làm việc theo hình thức khám và ngày nghỉ của bạn." />
      {resolving ? <p className="muted">Đang xác định hồ sơ bác sĩ…</p> : error || !doctorId ? <Notice tone="error">{error || "Không xác định được hồ sơ bác sĩ."}</Notice> : <ScheduleManager doctorId={doctorId} />}
    </>
  );
}
