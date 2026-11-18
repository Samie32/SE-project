import { useEffect, useState } from "react";
import { CalendarDays, CalendarOff, ChevronLeft, ChevronRight, Plus, Stethoscope, Trash2, Video } from "lucide-react";
import { createAvailability, createTimeOff, deleteAvailability, deleteTimeOff, listAvailability, listTimeOff } from "@/api/schedule";
import { getClinicHours } from "@/api/clinic-hours";
import { ApiError, errorMessage } from "@/core/client";
import { clinicWindow, type ClinicDayHours } from "@/core/clinic-hours";
import { useAsync, useNow } from "@/core/useAsync";
import { addDays, addMonths, dayKey, formatTime, localToIso, longDate, monthGridDays, monthLabel, monthStart, todayKey, weekStart, weekdayShort } from "@/core/datetime";
import { nextWorkingDay, overlaps, scheduleIntervalError, shiftPresets, slotDurationError, suggestValidInterval } from "@/core/schedule-rules";
import { MODE_SHORT } from "@/core/labels";
import type { AppointmentMode, Availability, TimeOff } from "@/core/types";
import { AsyncBlock, ConfirmDialog, Field, Modal, Notice, PageHead, Panel, useToast } from "@/ui";
import { useDoctor } from "./DoctorContext";

function toInterval(date:string,start:string,end:string) {
  try { return {startAt:localToIso(date,start),endAt:localToIso(date,end)}; }
  catch { return {startAt:"",endAt:""}; }
}
const hhmmToMin=(hhmm:string)=>{const [h,m]=hhmm.split(":").map(Number);return h*60+m;};
function addShiftBlockReason(date:string,dayShifts:Availability[],now:number,hours:readonly ClinicDayHours[]):string {
  const window=clinicWindow(date,hours);
  if(!window) return "Phòng khám nghỉ ngày này.";
  const close=hhmmToMin(window.end);
  const todayStr=dayKey(new Date(now));
  if(date<todayStr) return "Ngày này đã qua, không thể đăng ký ca làm việc.";
  let earliest=hhmmToMin(window.start);
  if(date===todayStr){
    const nowMin=hhmmToMin(formatTime(new Date(now).toISOString()));
    earliest=Math.max(earliest,nowMin+1);
    if(earliest>=close) return "Hôm nay đã hết giờ làm việc của phòng khám.";
  }
  let cursor=earliest;
  const sorted=[...dayShifts].sort((x,y)=>x.startAt.localeCompare(y.startAt));
  for(const s of sorted){
    const sm=hhmmToMin(formatTime(s.startAt)),em=hhmmToMin(formatTime(s.endAt));
    if(sm>cursor) return "";
    cursor=Math.max(cursor,em);
  }
  if(cursor>=close) return "Khung giờ làm việc trong ngày này đã kín, không còn thời gian trống để đăng ký thêm ca.";
  return "";
}
function DayTimeline({
  date,
  shifts,
  breaks,
  now,
  hours,
  highlightId,
  onSelect,
}:{
  date:string;
  shifts:Availability[];
  breaks:TimeOff[];
  now:number;
  hours:readonly ClinicDayHours[];
  highlightId?:string;
  onSelect?:(v:{kind:"availability";item:Availability}|{kind:"off";item:TimeOff})=>void;
}) {
  const window=clinicWindow(date,hours);
  const items=[...shifts,...breaks];
  const OPEN=Math.min(window ? hhmmToMin(window.start) : Infinity,...items.map(item=>hhmmToMin(formatTime(item.startAt))));
  const CLOSE=Math.max(window ? hhmmToMin(window.end) : -Infinity,...items.map(item=>hhmmToMin(formatTime(item.endAt))));
  const SPAN=CLOSE-OPEN;
  if(!Number.isFinite(SPAN)||SPAN<=0) return null;
  const pct=(min:number)=>Math.max(0,Math.min(100,((min-OPEN)/SPAN)*100));
  const isToday=date===todayKey();
  const nowMin=hhmmToMin(formatTime(new Date(now).toISOString()));
  const showNow=isToday&&nowMin>=OPEN&&nowMin<=CLOSE;
  const tickStep=Math.max(1,Math.ceil(SPAN/300))*60;
  const ticks=[OPEN];
  for(let minute=Math.ceil((OPEN+1)/tickStep)*tickStep;minute<CLOSE;minute+=tickStep) ticks.push(minute);
  ticks.push(CLOSE);
  const label=(minute:number)=>`${String(Math.floor(minute/60)).padStart(2,"0")}:${String(minute%60).padStart(2,"0")}`;
  return <div className="day-tl" aria-label={`Dòng thời gian trong ngày ${label(OPEN)} đến ${label(CLOSE)}`}>
    <div className="day-tl-ticks">
      {ticks.map(minute=><span key={minute} style={{left:`${pct(minute)}%`}}>{label(minute)}</span>)}
    </div>
    <div className="day-tl-track">
      {ticks.slice(1,-1).map(minute=><i key={minute} className="day-tl-grid" style={{left:`${pct(minute)}%`}} aria-hidden/>)}
      {shifts.map(x=>{
        const s=hhmmToMin(formatTime(x.startAt)),e=hhmmToMin(formatTime(x.endAt));
        const past=Date.parse(x.endAt)<=now,ongoing=Date.parse(x.startAt)<=now&&Date.parse(x.endAt)>now;
        const left=pct(s),width=Math.max(2,pct(e)-left);
        return <button
          key={x.id}
          type="button"
          className={`day-tl-block ${x.mode==="REMOTE"?"remote":"in-person"}${past?" past":""}${ongoing?" ongoing":""}${highlightId===x.id?" active":""}`}
          style={{left:`${left}%`,width:`${width}%`}}
          title={`${formatTime(x.startAt)}–${formatTime(x.endAt)} · ${MODE_SHORT[x.mode]}`}
          onClick={()=>onSelect?.({kind:"availability",item:x})}
        >
          <span>{formatTime(x.startAt)}–{formatTime(x.endAt)}</span>
        </button>;
      })}
      {breaks.map(x=>{
        const s=hhmmToMin(formatTime(x.startAt)),e=hhmmToMin(formatTime(x.endAt));
        const past=Date.parse(x.endAt)<=now;
        const left=pct(s),width=Math.max(2,pct(e)-left);
        return <button
          key={x.id}
          type="button"
          className={`day-tl-block off${past?" past":""}${highlightId===x.id?" active":""}`}
          style={{left:`${left}%`,width:`${width}%`}}
          title={`Nghỉ ${formatTime(x.startAt)}–${formatTime(x.endAt)}`}
          onClick={()=>onSelect?.({kind:"off",item:x})}
        >
          <span>Nghỉ</span>
        </button>;
      })}
      {showNow&&<div className="day-tl-now" style={{left:`${pct(nowMin)}%`}} title={`Hiện tại ${formatTime(new Date(now).toISOString())}`} aria-hidden><span>{formatTime(new Date(now).toISOString())}</span></div>}
    </div>
  </div>;
}
function Presets({
  start,
  end,
  onChange,
  presets,
  disabledIds=[],
}:{
  start:string;
  end:string;
  onChange:(s:string,e:string)=>void;
  presets:ReturnType<typeof shiftPresets>;
  disabledIds?:string[];
}) {
  const available=presets.filter(p=>!disabledIds.includes(p.id));
  if(!presets.length) return null;
  if(!available.length) return <Notice tone="warn">Các khung giờ gợi ý (Ca sáng, Ca chiều) trong ngày này đã có ca. Bạn chỉ có thể chọn khoảng giờ còn trống (nếu có).</Notice>;
  return <div className="schedule-presets" aria-label="Chọn nhanh khung giờ">
    {available.map(p=><button key={p.id} type="button" className="schedule-preset" aria-pressed={start===p.start&&end===p.end} onClick={()=>onChange(p.start,p.end)}><b>{p.label}</b><span>{p.start}–{p.end}</span></button>)}
    <span className="muted">Có thể chỉnh giờ bên dưới.</span>
  </div>;
}

export type ShiftFilter = "ALL" | "MORNING" | "AFTERNOON";
export type ModeFilter = "ALL" | AppointmentMode;

export function ScheduleManager({doctorId,shiftFilter="ALL",modeFilter="ALL"}:{doctorId:string;shiftFilter?:ShiftFilter;modeFilter?:ModeFilter}) {
  const settings=useAsync(getClinicHours);
  return <AsyncBlock loading={settings.loading} error={settings.error} onRetry={settings.reload}>
    {settings.data&&<ScheduleCalendar doctorId={doctorId} hours={settings.data.days} shiftFilter={shiftFilter} modeFilter={modeFilter} />}
  </AsyncBlock>;
}

function ScheduleCalendar({doctorId,hours,shiftFilter,modeFilter}:{doctorId:string;hours:readonly ClinicDayHours[];shiftFilter:ShiftFilter;modeFilter:ModeFilter}) {
  const toast=useToast();
  const now=useNow(30_000).getTime();
  const [showAddShift,setShowAddShift]=useState(false);
  const [dayDetail,setDayDetail]=useState<string|null>(null);
  const [dayAddError,setDayAddError]=useState("");
  const [selected,setSelected]=useState<{kind:"availability";item:Availability}|{kind:"off";item:TimeOff}|null>(null);
  const [confirmDelete,setConfirmDelete]=useState(false);
  const [deleteBusy,setDeleteBusy]=useState(false);
  const [deleteError,setDeleteError]=useState("");
  const [showBreakForm,setShowBreakForm]=useState(false);
  const [breakRange,setBreakRange]=useState({start:"08:00",end:"09:00"});
  const [breakErr,setBreakErr]=useState("");
  const [breakBusy,setBreakBusy]=useState(false);
  const [removingBreakId,setRemovingBreakId]=useState<string|null>(null);
  const [view,setView]=useState<"week"|"month">("week");
  const [week,setWeek]=useState(()=>weekStart(nextWorkingDay(hours)));
  const [month,setMonth]=useState(()=>monthStart(nextWorkingDay(hours)));
  const av=useAsync(()=>listAvailability(doctorId),[doctorId]);
  const off=useAsync(()=>listTimeOff(doctorId),[doctorId]);
  const [a,setA]=useState(()=>{
    const date=nextWorkingDay(hours);
    const preset=shiftPresets(date,hours)[0];
    return {date,start:preset?.start??"",end:preset?.end??"",slot:20,mode:"IN_PERSON" as AppointmentMode};
  });
  const [aErr,setAErr]=useState("");const [aBusy,setABusy]=useState(false);
  const avs=av.data??[],offs=off.data??[];
  const matchesFilter=(x:Availability)=>{
    if(shiftFilter==="MORNING"&&formatTime(x.startAt)>="12:00") return false;
    if(shiftFilter==="AFTERNOON"&&formatTime(x.startAt)<"12:00") return false;
    if(modeFilter!=="ALL"&&x.mode!==modeFilter) return false;
    return true;
  };
  const ready=!av.loading&&!off.loading&&!av.error&&!off.error;
  const interval=toInterval(a.date,a.start,a.end);
  const intervalIssue=scheduleIntervalError(interval.startAt,interval.endAt,now,hours);
  const slotIssue=intervalIssue ? "" : slotDurationError(interval.startAt,interval.endAt,a.slot);
  const conflict=intervalIssue ? undefined : avs.find(x=>overlaps(interval.startAt,interval.endAt,x));
  const conflictIssue=conflict ? `Trùng ca ${formatTime(conflict.startAt)}–${formatTime(conflict.endAt)} (${MODE_SHORT[conflict.mode]}). Một bác sĩ không thể có hai ca chồng giờ, kể cả khác hình thức khám.` : "";
  const affectedOff=!intervalIssue && offs.some(x=>overlaps(interval.startAt,interval.endAt,x));
  const duration=(Date.parse(interval.endAt)-Date.parse(interval.startAt))/60000;
  const count=!intervalIssue&&!slotIssue ? duration/a.slot : 0;
  const reload=()=>{av.reload();off.reload();};
  const syncPeriod=(date:string)=>{setWeek(weekStart(date));setMonth(monthStart(date));};
  const takenPresetIds=(date:string)=>shiftPresets(date,hours).filter(p=>{
    const iv=toInterval(date,p.start,p.end);
    return iv.startAt&&iv.endAt&&avs.some(x=>overlaps(iv.startAt,iv.endAt,x));
  }).map(p=>p.id);
  const pickFreePreset=(date:string,fallbackStart:string,fallbackEnd:string,slot:number)=>{
    const taken=takenPresetIds(date);
    const free=shiftPresets(date,hours).find(p=>!taken.includes(p.id));
    if(free) return suggestValidInterval(date,free.start,free.end,slot,now,hours);
    return suggestValidInterval(date,fallbackStart,fallbackEnd,slot,now,hours);
  };
  useEffect(()=>{
    if(!ready||!showAddShift)return;
    const taken=takenPresetIds(a.date);
    const onTakenPreset=shiftPresets(a.date,hours).some(p=>taken.includes(p.id)&&a.start===p.start&&a.end===p.end);
    if(onTakenPreset){
      const next=pickFreePreset(a.date,a.start,a.end,a.slot);
      if(next.start!==a.start||next.end!==a.end) setA(p=>({...p,...next}));
    }
  },[ready,showAddShift,a.date]);
  const chooseDay=(date:string)=>{
    const nextA=pickFreePreset(date,a.start,a.end,a.slot);
    setA(p=>({...p,date,...nextA}));
    setAErr("");setDayAddError("");setShowAddShift(true);
  };
  const openDayDetail=(date:string)=>{
    setA(p=>({...p,date}));
    setDayAddError("");
    setShowAddShift(false);
    setAErr("");
    setDayDetail(date);
  };
  const autoFixAvailability=()=>{
    const window=clinicWindow(a.date,hours);
    const time=formatTime(new Date(now).toISOString());
    const insufficientToday=window&&a.date===today&&hhmmToMin(window.end)-hhmmToMin(time)<=a.slot;
    const targetDate=!window||a.date<today||insufficientToday?nextWorkingDay(hours):a.date;
    const fixed=suggestValidInterval(targetDate,a.start,a.end,a.slot,now,hours);
    setA(p=>({...p,date:targetDate,...fixed}));
    syncPeriod(targetDate);
    setAErr("");
  };
  const openBreakFormForShift=(shift:Availability)=>{
    const date=dayKey(shift.startAt);
    const fixed=suggestValidInterval(date,formatTime(shift.startAt),formatTime(shift.endAt),undefined,now,hours);
    setBreakRange(fixed);
    setBreakErr("");
    setShowBreakForm(true);
  };
  const switchView=(next:"week"|"month")=>{
    if(next===view)return;
    if(next==="month")setMonth(monthStart(week));
    else {
      const todayKeyVal=todayKey();
      setWeek(month===monthStart(todayKeyVal)?weekStart(todayKeyVal):weekStart(month));
    }
    setView(next);
  };
  const closeDayDetail=()=>{if(!aBusy){setDayDetail(null);setShowAddShift(false);setDayAddError("");}};
  const selectItem=(value:NonNullable<typeof selected>)=>{
    setSelected(value);setConfirmDelete(false);setDeleteError("");
    setShowBreakForm(false);setBreakErr("");
  };
  async function removeSelected() {
    if(!selected||deleteBusy)return;
    if(Date.parse(selected.item.startAt)<=Date.now()){setDeleteError("Lịch đã bắt đầu hoặc đã qua, không thể xóa.");return;}
    setDeleteBusy(true);setDeleteError("");
    try {
      if(selected.kind==="availability")await deleteAvailability(selected.item.id);
      else await deleteTimeOff(selected.item.id);
      toast.success(selected.kind==="availability"?"Đã xóa ca làm việc và các lượt khám trống của ca.":"Đã hủy thời gian nghỉ.");
      setSelected(null);setConfirmDelete(false);reload();
    } catch(error) {
      setDeleteError(error instanceof ApiError&&error.status===409
        ? selected.kind==="availability" ? "Không thể xóa ca đã bắt đầu hoặc đã từng có lịch hẹn (kể cả lịch đã hủy). Hãy tải lại lịch và đăng ký thời gian nghỉ nếu phù hợp." : "Khoảng nghỉ đã bắt đầu hoặc đã qua, không thể hủy."
        : error instanceof ApiError&&error.status===404 ? "Lịch này không còn tồn tại hoặc bạn không có quyền thao tác. Hãy đóng cửa sổ và kiểm tra lại lịch." : errorMessage(error));
      reload();
    } finally {setDeleteBusy(false);}
  }

  async function addAv(e:React.FormEvent) {
    e.preventDefault();setAErr("");
    const issue=scheduleIntervalError(interval.startAt,interval.endAt,Date.now(),hours)||slotDurationError(interval.startAt,interval.endAt,a.slot)||conflictIssue;
    if(issue){setAErr(issue);return;}
    if(!ready){setAErr("Cần tải xong lịch hiện tại trước khi thêm ca.");return;}
    setABusy(true);
    try {await createAvailability(doctorId,{...interval,slotMinutes:a.slot,mode:a.mode});toast.success("Đã thêm ca làm việc.");syncPeriod(a.date);setShowAddShift(false);av.reload();}
    catch(error){setAErr(error instanceof ApiError&&error.status===409 ? "Lịch vừa thay đổi hoặc ca đã trùng. Đã tải lại lịch; hãy kiểm tra trước khi thử lại." : errorMessage(error));reload();}
    finally{setABusy(false);}
  }
  async function addBreakInShift(e:React.FormEvent,shift:Availability) {
    e.preventDefault();setBreakErr("");
    const date=dayKey(shift.startAt);
    const times=toInterval(date,breakRange.start,breakRange.end);
    const issue=scheduleIntervalError(times.startAt,times.endAt,now,hours);
    if(issue){setBreakErr(issue);return;}
    if(Date.parse(times.startAt)<Date.parse(shift.startAt)||Date.parse(times.endAt)>Date.parse(shift.endAt)){
      setBreakErr(`Thời gian nghỉ phải nằm trong ca (${formatTime(shift.startAt)}–${formatTime(shift.endAt)}).`);return;
    }
    setBreakBusy(true);
    try{await createTimeOff(doctorId,times);toast.success("Đã thêm thời gian nghỉ trong ca.");setShowBreakForm(false);off.reload();}
    catch(error){setBreakErr(error instanceof ApiError&&error.status===409 ? "Không thể nghỉ trong khoảng có lịch hẹn còn hiệu lực. Hãy xử lý các lịch hẹn bị ảnh hưởng trước." : errorMessage(error));reload();}
    finally{setBreakBusy(false);}
  }
  async function cancelBreak(id:string) {
    if(removingBreakId)return;
    setRemovingBreakId(id);
    try{await deleteTimeOff(id);toast.success("Đã hủy thời gian nghỉ.");off.reload();}
    catch(error){toast.error(errorMessage(error));reload();}
    finally{setRemovingBreakId(null);}
  }
  const today=todayKey();
  const monthDays=view==="month"?monthGridDays(month):[];
  const weekDays=view==="week"?Array.from({length:7},(_,i)=>addDays(week,i)):[];
  const shiftEnded=(s:{endAt:string})=>Date.parse(s.endAt)<=now;
  const shiftOngoing=(s:{startAt:string;endAt:string})=>Date.parse(s.startAt)<=now&&Date.parse(s.endAt)>now;

  return <>
    <Panel className="schedule-panel" title={view==="week"?"Lịch làm việc theo tuần":"Lịch làm việc theo tháng"} subtitle={`${view==="week"?`${longDate(week)} – ${longDate(addDays(week,6))}`:monthLabel(month)} · Giờ Việt Nam`}
      actions={<div className="row wrap">
        <button className="btn sm" aria-label={view==="week"?"Tuần trước":"Tháng trước"} onClick={()=>view==="week"?setWeek(addDays(week,-7)):setMonth(addMonths(month,-1))}><ChevronLeft size={15}/></button>
        <button
          type="button"
          className="btn sm"
          aria-label={view==="week"?"Đang xem theo tuần, bấm để chuyển sang tháng":"Đang xem theo tháng, bấm để chuyển sang tuần"}
          title={view==="week"?"Bấm để chuyển sang xem theo tháng":"Bấm để chuyển sang xem theo tuần"}
          onClick={()=>switchView(view==="week"?"month":"week")}
        ><CalendarDays size={14} aria-hidden/>{view==="week"?"Tuần":"Tháng"}</button>
        <button className="btn sm" aria-label={view==="week"?"Tuần sau":"Tháng sau"} onClick={()=>view==="week"?setWeek(addDays(week,7)):setMonth(addMonths(month,1))}><ChevronRight size={15}/></button>
      </div>}>
      <div className="schedule-legend" aria-label="Chú thích màu lịch">
        <span className="legend-item"><i className="legend-dot in-person" aria-hidden/>Trực tiếp</span>
        <span className="legend-item"><i className="legend-dot remote" aria-hidden/>Từ xa</span>
        <span className="legend-item"><i className="legend-dot off" aria-hidden/>Nghỉ</span>
        <span className="legend-item"><i className="legend-dot ongoing" aria-hidden/>Đang diễn ra</span>
        <span className="legend-item"><i className="legend-dot past" aria-hidden/>Đã qua</span>
      </div>
      <AsyncBlock loading={av.loading||off.loading} error={av.error||off.error} onRetry={reload}>
        {view==="week"?(
          <div
            className="schedule-week-scroll"
            role="region"
            aria-label="Lịch tuần, cuộn ngang để xem đủ ngày"
            onWheel={e => {
              const el = e.currentTarget;
              if (el.scrollWidth <= el.clientWidth) return;
              if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && e.deltaY !== 0) {
                el.scrollLeft += e.deltaY;
                e.preventDefault();
              }
            }}
          ><div className="weekgrid">{weekDays.map(day=>{
            const shifts=avs.filter(x=>dayKey(x.startAt)===day).sort((x,y)=>x.startAt.localeCompare(y.startAt));
            const breaks=offs.filter(x=>dayKey(x.startAt)===day).sort((x,y)=>x.startAt.localeCompare(y.startAt));
            const isPastDay=day<today;
            const isClosed=!clinicWindow(day,hours);
            return <div key={day} className={`weekday weekday-clickable${day===today?" today":""}${day===a.date?" schedule-selected":""}${isPastDay?" past-day":""}${isClosed?" sunday":""}`} onClick={()=>openDayDetail(day)}>
              <button type="button" className="wd-head schedule-day" aria-pressed={day===dayDetail} aria-label={`Xem chi tiết ngày ${longDate(day)}`} onClick={e=>{e.stopPropagation();openDayDetail(day);}}><b>{weekdayShort(day)}</b><span>{day.slice(8)}/{day.slice(5,7)}</span></button>
              {isClosed&&<p className="muted">Phòng khám nghỉ</p>}
              {!isClosed&&!shifts.length&&!breaks.length&&<p className="muted">Chưa có ca</p>}
              {shifts.map(x=>{
                const past=shiftEnded(x),ongoing=shiftOngoing(x),dimmed=!past&&!matchesFilter(x);
                const shiftBreaks=breaks.filter(b=>overlaps(x.startAt,x.endAt,b));
                return <button type="button" key={x.id} className={`wblock schedule-event${x.mode==="REMOTE"?" remote":" in-person"}${past?" past":""}${ongoing?" ongoing":""}${dimmed?" dimmed":""}`} aria-label={`Xem ca ${longDate(day)} ${formatTime(x.startAt)}–${formatTime(x.endAt)} ${MODE_SHORT[x.mode]}`} onClick={e=>{e.stopPropagation();selectItem({kind:"availability",item:x});}}>
                  <span className="wblock-top">
                    <b>{formatTime(x.startAt)}–{formatTime(x.endAt)}</b>
                    {ongoing?<span className="shift-tag live">Đang diễn ra</span>:past?<span className="shift-tag past">Đã qua</span>:null}
                  </span>
                  <span className="wblock-mode">{x.mode==="REMOTE"?<Video size={12} aria-hidden/>:<Stethoscope size={12} aria-hidden/>}{MODE_SHORT[x.mode]}</span>
                  {shiftBreaks.map(b=><span key={b.id} className="shift-break-inline"><CalendarOff size={11} aria-hidden/>Nghỉ {formatTime(b.startAt)}–{formatTime(b.endAt)}</span>)}
                  <small>{x.slotMinutes} phút/lượt · Chi tiết</small>
                </button>;
              })}
              {breaks.filter(b=>!shifts.some(s=>overlaps(s.startAt,s.endAt,b))).map(x=>{
                const past=shiftEnded(x);
                return <button type="button" key={x.id} className={`wblock off schedule-event${past?" past":""}`} aria-label={`Xem lịch nghỉ ${longDate(day)} ${formatTime(x.startAt)}–${formatTime(x.endAt)}`} onClick={e=>{e.stopPropagation();selectItem({kind:"off",item:x});}}>
                  <CalendarOff size={13} aria-hidden/>
                  <span>Nghỉ {formatTime(x.startAt)}–{formatTime(x.endAt)}</span>
                  {past&&<span className="shift-tag past">Đã qua</span>}
                </button>;
              })}
            </div>;
          })}</div></div>
        ):(
          <div className="schedule-month-scroll" tabIndex={0} role="region" aria-label="Lịch tháng">
            <div className="monthgrid-head" aria-hidden="true">
              {["Th 2","Th 3","Th 4","Th 5","Th 6","Th 7","CN"].map((d,i)=><div key={d} className={i===6?"sunday":""}>{d}</div>)}
            </div>
            <div className="monthgrid">{monthDays.map(day=>{
              const shifts=avs.filter(x=>dayKey(x.startAt)===day).sort((x,y)=>x.startAt.localeCompare(y.startAt));
              const breaks=offs.filter(x=>dayKey(x.startAt)===day).sort((x,y)=>x.startAt.localeCompare(y.startAt));
              const isClosed=!clinicWindow(day,hours);
              const isOutside=day.slice(0,7)!==month.slice(0,7);
              const isPastDay=day<today;
              const isToday=day===today;
              return <div key={day} className={`monthday weekday-clickable${isToday?" today":""}${isOutside?" outside":""}${isPastDay?" past-day":""}${isClosed?" sunday":""}${day===a.date?" schedule-selected":""}`} onClick={()=>openDayDetail(day)}>
                <div className="md-head">
                  <button type="button" className="md-num" aria-label={`Xem chi tiết ngày ${longDate(day)}`} onClick={e=>{e.stopPropagation();openDayDetail(day);}}>
                    <span>{Number(day.slice(8))}</span>
                    {isToday&&<span className="md-today-pill">Hôm nay</span>}
                  </button>
                </div>
                <div className="md-events">
                  {shifts.map(x=>{
                    const past=shiftEnded(x),ongoing=shiftOngoing(x),dimmed=!past&&!matchesFilter(x);
                    const hasBreak=breaks.some(b=>overlaps(x.startAt,x.endAt,b));
                    return <button type="button" key={x.id} className={`mchip${x.mode==="REMOTE"?" remote":" in-person"}${past?" past":""}${ongoing?" ongoing":""}${dimmed?" dimmed":""}`} title={`${formatTime(x.startAt)}–${formatTime(x.endAt)} · ${MODE_SHORT[x.mode]}${hasBreak?" (Có giờ nghỉ)":""}${past?" (Đã qua)":""}`} aria-label={`Xem ca ${longDate(day)} ${formatTime(x.startAt)}–${formatTime(x.endAt)} ${MODE_SHORT[x.mode]}`} onClick={e=>{e.stopPropagation();selectItem({kind:"availability",item:x});}}>
                      <span className="mchip-dot" aria-hidden/>
                      <span>{formatTime(x.startAt)}–{formatTime(x.endAt)}</span>
                      {hasBreak&&<CalendarOff size={10} aria-hidden/>}
                    </button>;
                  })}
                  {breaks.filter(b=>!shifts.some(s=>overlaps(s.startAt,s.endAt,b))).map(x=>{
                    const past=shiftEnded(x);
                    return <button type="button" key={x.id} className={`mchip off${past?" past":""}`} title={`Nghỉ ${formatTime(x.startAt)}–${formatTime(x.endAt)}${past?" (Đã qua)":""}`} aria-label={`Xem lịch nghỉ ${longDate(day)} ${formatTime(x.startAt)}–${formatTime(x.endAt)}`} onClick={e=>{e.stopPropagation();selectItem({kind:"off",item:x});}}>
                      <CalendarOff size={11} aria-hidden/>
                      <span>Nghỉ {formatTime(x.startAt)}–{formatTime(x.endAt)}</span>
                    </button>;
                  })}
                  {isClosed&&!shifts.length&&!breaks.length&&<span className="md-closed">Nghỉ</span>}
                </div>
              </div>;
            })}</div>
          </div>
        )}
      </AsyncBlock>
    </Panel>
    {dayDetail&&(()=>{
      const dayShifts=avs.filter(x=>dayKey(x.startAt)===dayDetail).sort((x,y)=>x.startAt.localeCompare(y.startAt));
      const dayBreaks=offs.filter(x=>dayKey(x.startAt)===dayDetail).sort((x,y)=>x.startAt.localeCompare(y.startAt));
      const dayWindow=clinicWindow(dayDetail,hours);
      const isClosed=!dayWindow;
      const formWindow=clinicWindow(a.date,hours);
      const blockReason=addShiftBlockReason(dayDetail,dayShifts,now,hours);
      return <Modal title={`Chi tiết ${longDate(dayDetail)}`} onClose={closeDayDetail} footer={!showAddShift?<button className="btn primary" onClick={()=>{if(blockReason){setDayAddError(blockReason);return;}chooseDay(dayDetail);}}><Plus size={14} aria-hidden/>Thêm ca làm việc</button>:undefined}>
        {dayAddError&&<Notice tone="warn">{dayAddError}</Notice>}
        {(!isClosed||dayShifts.length>0||dayBreaks.length>0)&&<DayTimeline date={dayDetail} shifts={dayShifts} breaks={dayBreaks} now={now} hours={hours} onSelect={item=>{setDayDetail(null);setShowAddShift(false);setDayAddError("");selectItem(item);}}/>}
        {dayWindow?<p className="muted">Giờ hoạt động {dayWindow.start}–{dayWindow.end}</p>:<Notice tone="info">Phòng khám nghỉ ngày này.</Notice>}
        {!isClosed&&!dayShifts.length&&!dayBreaks.length&&!showAddShift&&<p className="muted">Chưa có ca làm việc hoặc lịch nghỉ nào trong ngày này.</p>}
        {dayShifts.length>0&&<div className="day-detail-group">
          <b className="day-detail-title">Ca làm việc ({dayShifts.length})</b>
          <div className="day-detail-list">
            {dayShifts.map(x=>{
              const past=shiftEnded(x),ongoing=shiftOngoing(x);
              return <button type="button" key={x.id} className={`wblock schedule-event${x.mode==="REMOTE"?" remote":" in-person"}${past?" past":""}${ongoing?" ongoing":""}`} onClick={()=>{setDayDetail(null);setShowAddShift(false);selectItem({kind:"availability",item:x});}}>
                <span className="wblock-top">
                  <b>{formatTime(x.startAt)}–{formatTime(x.endAt)}</b>
                  {ongoing?<span className="shift-tag live">Đang diễn ra</span>:past?<span className="shift-tag past">Đã qua</span>:null}
                </span>
                <span className="wblock-mode">{x.mode==="REMOTE"?<Video size={12} aria-hidden/>:<Stethoscope size={12} aria-hidden/>}{MODE_SHORT[x.mode]}</span>
                <small>{x.slotMinutes} phút/lượt · Bấm để xóa ca hoặc thêm lịch nghỉ</small>
              </button>;
            })}
          </div>
        </div>}
        {dayBreaks.length>0&&<div className="day-detail-group">
          <b className="day-detail-title">Thời gian nghỉ ({dayBreaks.length})</b>
          <div className="day-detail-list">
            {dayBreaks.map(x=>{
              const past=shiftEnded(x);
              return <button type="button" key={x.id} className={`wblock off schedule-event${past?" past":""}`} onClick={()=>{setDayDetail(null);setShowAddShift(false);selectItem({kind:"off",item:x});}}>
                <CalendarOff size={13} aria-hidden/>
                <span>Nghỉ {formatTime(x.startAt)}–{formatTime(x.endAt)}</span>
                {past&&<span className="shift-tag past">Đã qua</span>}
              </button>;
            })}
          </div>
        </div>}
        {showAddShift&&<form className="day-add-form" onSubmit={e=>void addAv(e)} noValidate>
          <div className="day-add-head">
            <b>Đăng ký ca làm việc</b>
            <button type="button" className="btn sm" disabled={aBusy} onClick={()=>{setShowAddShift(false);setAErr("");}}>Thu gọn</button>
          </div>
          {aErr&&<Notice tone="error">{aErr}</Notice>}
          <fieldset disabled={aBusy} className="schedule-fieldset">
            <div className="formgrid">
              <Field label="Ngày làm việc" required>{id=><input id={id} type="date" className="field" min={todayKey()} value={a.date} onChange={e=>{const date=e.target.value;const fixed=date?pickFreePreset(date,a.start,a.end,a.slot):{start:a.start,end:a.end};setA({...a,date,...fixed});if(date){syncPeriod(date);setDayDetail(date);}setAErr("");}}/>}</Field>
              <Field label="Hình thức khám" required>{id=><select id={id} className="field" value={a.mode} onChange={e=>setA({...a,mode:e.target.value as AppointmentMode})}><option value="IN_PERSON">{MODE_SHORT.IN_PERSON}</option><option value="REMOTE">{MODE_SHORT.REMOTE}</option></select>}</Field>
            </div>
            <Presets presets={shiftPresets(a.date,hours)} start={a.start} end={a.end} disabledIds={takenPresetIds(a.date)} onChange={(start,end)=>{const fixed=suggestValidInterval(a.date,start,end,a.slot,now,hours);setA({...a,...fixed});setAErr("");}}/>
            <div className="formgrid">
              <Field label="Giờ bắt đầu ca" required>{id=><input id={id} type="time" className="field" min={formWindow?.start} max={formWindow?.end} step={60} value={a.start} onChange={e=>setA({...a,start:e.target.value})}/>}</Field>
              <Field label="Giờ kết thúc ca" required>{id=><input id={id} type="time" className="field" min={formWindow?.start} max={formWindow?.end} step={60} value={a.end} onChange={e=>setA({...a,end:e.target.value})}/>}</Field>
              <Field label="Phút mỗi lượt khám" required>{id=><input id={id} type="number" className="field" min={1} max={540} step={1} value={a.slot||""} onChange={e=>{const slot=Number(e.target.value);const fixed=Number.isInteger(slot)&&slot>=1&&slot<=540?suggestValidInterval(a.date,a.start,a.end,slot,now,hours):{start:a.start,end:a.end};setA({...a,slot,...fixed});}}/>}</Field>
            </div>
            <div className="schedule-summary" aria-live="polite">
              <span>{intervalIssue||slotIssue||`${a.start}–${a.end} · ${duration} phút · ${count} lượt khám dự kiến`}</span>
              {(intervalIssue||slotIssue)&&<button type="button" className="btn sm" onClick={autoFixAvailability}>Tự động chỉnh giờ hợp lệ</button>}
            </div>
            {ready&&conflictIssue&&!aErr&&<Notice tone="error">{conflictIssue}</Notice>}
            {affectedOff&&<Notice tone="warn">Ca có giao với lịch nghỉ. Các lượt trùng khoảng nghỉ sẽ không được mở đặt; số lượt khả dụng có thể ít hơn dự kiến.</Notice>}
            <button className="btn primary" disabled={!ready||Boolean(intervalIssue||slotIssue||conflictIssue)} type="submit"><Plus size={15} aria-hidden/>{aBusy?"Đang lưu…":"Thêm ca làm việc"}</button>
          </fieldset>
        </form>}
      </Modal>;
    })()}
    {selected&&!confirmDelete&&<Modal title={selected.kind==="availability"?"Chi tiết ca làm việc":"Chi tiết thời gian nghỉ"} onClose={()=>setSelected(null)} footer={<div className="modalfoot-split">
      <button className="btn danger" disabled={Date.parse(selected.item.startAt)<=now} onClick={()=>setConfirmDelete(true)}><Trash2 size={14} aria-hidden/>{selected.kind==="availability"?"Xóa ca":"Hủy lịch nghỉ"}</button>
      {selected.kind==="availability"&&!showBreakForm&&<button className="btn primary" disabled={Date.parse(selected.item.endAt)<=now} onClick={()=>openBreakFormForShift(selected.item)}><CalendarOff size={14} aria-hidden/>Thêm thời gian nghỉ</button>}
    </div>}>
      <p><b>{longDate(dayKey(selected.item.startAt))}</b></p><p>{formatTime(selected.item.startAt)}–{formatTime(selected.item.endAt)} · Giờ Việt Nam</p>
      {selected.kind==="availability"&&<p>{MODE_SHORT[selected.item.mode]} · {selected.item.slotMinutes} phút/lượt · {(Date.parse(selected.item.endAt)-Date.parse(selected.item.startAt))/60000/selected.item.slotMinutes} lượt dự kiến</p>}
      {!showBreakForm&&<DayTimeline
        date={dayKey(selected.item.startAt)}
        shifts={avs.filter(x=>dayKey(x.startAt)===dayKey(selected.item.startAt))}
        breaks={offs.filter(x=>dayKey(x.startAt)===dayKey(selected.item.startAt))}
        now={now}
        hours={hours}
        highlightId={selected.item.id}
        onSelect={item=>selectItem(item)}
      />}
      {selected.kind==="availability"&&(()=>{
        const shift=selected.item;
        const shiftBreaks=offs.filter(b=>overlaps(shift.startAt,shift.endAt,b)).sort((x,y)=>x.startAt.localeCompare(y.startAt));
        return <div className="shift-breaks-box">
          {shiftBreaks.length>0&&<div className="day-detail-group">
            <b className="day-detail-title">Thời gian nghỉ trong ca ({shiftBreaks.length})</b>
            <div className="shift-breaks-list">
              {shiftBreaks.map(b=><div key={b.id} className="shift-break-row">
                <span><CalendarOff size={13} aria-hidden/>{formatTime(b.startAt)}–{formatTime(b.endAt)}</span>
                <button type="button" className="btn sm danger" disabled={Date.parse(b.startAt)<=now||removingBreakId===b.id} onClick={()=>void cancelBreak(b.id)}>{removingBreakId===b.id?"Đang hủy…":"Hủy nghỉ"}</button>
              </div>)}
            </div>
          </div>}
          {showBreakForm&&<form className="shift-break-form" onSubmit={e=>void addBreakInShift(e,shift)} noValidate>
            <b>Thêm thời gian nghỉ trong ca ({formatTime(shift.startAt)}–{formatTime(shift.endAt)})</b>
            {breakErr&&<Notice tone="error">{breakErr}</Notice>}
            <div className="formgrid">
              <Field label="Nghỉ từ" required>{id=><input id={id} type="time" className="field" min={formatTime(shift.startAt)} max={formatTime(shift.endAt)} step={60} value={breakRange.start} onChange={e=>setBreakRange(r=>({...r,start:e.target.value}))}/>}</Field>
              <Field label="Đến" required>{id=><input id={id} type="time" className="field" min={formatTime(shift.startAt)} max={formatTime(shift.endAt)} step={60} value={breakRange.end} onChange={e=>setBreakRange(r=>({...r,end:e.target.value}))}/>}</Field>
            </div>
            <div className="row">
              <button type="submit" className="btn sm primary" disabled={breakBusy}><CalendarOff size={13} aria-hidden/>{breakBusy?"Đang lưu…":"Lưu thời gian nghỉ"}</button>
              <button type="button" className="btn sm" disabled={breakBusy} onClick={()=>setShowBreakForm(false)}>Hủy</button>
            </div>
          </form>}
        </div>;
      })()}
      <Notice tone="info">{Date.parse(selected.item.startAt)<=now?"Lịch đã bắt đầu hoặc đã qua. Hệ thống giữ lại lịch sử, không cho xóa.":selected.kind==="availability"?"Chỉ xóa được ca chưa bắt đầu và chưa từng có lịch hẹn, kể cả lịch đã hủy. Xóa ca sẽ gỡ các lượt khám trống; không tự hủy lịch bệnh nhân.":"Hủy khoảng nghỉ sẽ mở lại các lượt khám phù hợp trong ca làm việc, nếu chưa bị đặt."}</Notice>
    </Modal>}
    {selected&&confirmDelete&&<ConfirmDialog title={selected.kind==="availability"?"Xóa ca làm việc?":"Hủy thời gian nghỉ?"} danger busy={deleteBusy} error={deleteError} disabled={Date.parse(selected.item.startAt)<=now}
      confirmLabel={selected.kind==="availability"?"Xác nhận xóa ca":"Xác nhận hủy lịch nghỉ"}
      message={`${longDate(dayKey(selected.item.startAt))}, ${formatTime(selected.item.startAt)}–${formatTime(selected.item.endAt)}. ${selected.kind==="availability"?"Các lượt khám trống của ca sẽ bị gỡ. Không thể khôi phục bằng thao tác hoàn tác.":"Các lượt khám phù hợp có thể được mở đặt lại."}`}
      onCancel={()=>{setConfirmDelete(false);setDeleteError("");}} onConfirm={()=>void removeSelected()}/>}
  </>;
}

export function DoctorSchedulePage() {
  const {doctorId,resolving,error}=useDoctor();
  return <div className="schedule-page">
    <PageHead eyebrow="Bác sĩ" title="Lịch làm việc"/>
    {resolving?<p className="muted">Đang xác định hồ sơ bác sĩ…</p>:error||!doctorId?<Notice tone="error">{error||"Không xác định được hồ sơ bác sĩ."}</Notice>:<ScheduleManager key={doctorId} doctorId={doctorId}/>}
  </div>;
}
