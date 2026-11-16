import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Info, Stethoscope, Video } from "lucide-react";
import { listSlots } from "@/api/schedule";
import { bookAppointment } from "@/api/appointments";
import { ApiError, errorMessage, mutationKey } from "@/core/client";
import { useDirectory } from "@/core/directory";
import { MODE_LABEL, apptCode, initials } from "@/core/labels";
import { formatDate, formatTime, todayKey } from "@/core/datetime";
import { useAsync } from "@/core/useAsync";
import type { Appointment, AppointmentMode } from "@/core/types";
import { AsyncBlock, Empty, Notice, PageHead, Panel, Segmented } from "@/ui";
import { usePatient } from "./PatientContext";

export function BookingPage() {
  const go = useNavigate();
  const dir = useDirectory();
  const { reload } = usePatient();
  const [step, setStep] = useState(1);
  const [specialtyId, setSpecialtyId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [mode, setMode] = useState<AppointmentMode>("IN_PERSON");
  const [date, setDate] = useState(todayKey());
  const [slotId, setSlotId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const [done, setDone] = useState<Appointment | null>(null);
  const key = useRef<{ fingerprint: string; key: string } | null>(null);

  const specialties = dir.specialties.filter((s) => s.active);
  const doctors = dir.doctors.filter((d) => d.active && d.specialtyIds.includes(specialtyId));
  useEffect(() => {
    if (!specialtyId && specialties[0]) setSpecialtyId(specialties[0].id);
  }, [specialties, specialtyId]);
  useEffect(() => {
    setDoctorId((cur) => (doctors.some((d) => d.id === cur) ? cur : (doctors[0]?.id ?? "")));
  }, [specialtyId, dir.doctors]); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = useAsync(
    () => (doctorId && date ? listSlots({ date, doctorId, specialtyId, mode }) : Promise.resolve([])),
    [doctorId, specialtyId, date, mode],
  );
  useEffect(() => setSlotId(""), [doctorId, date, mode]);
  const slot = slots.data?.find((s) => s.id === slotId);
  const doctor = dir.doctorById(doctorId);
  const specialty = specialties.find((s) => s.id === specialtyId);

  const submit = async () => {
    if (!slot || busy) return;
    setBusy(true);
    setError("");
    try {
      const a = await bookAppointment(slot.id, mutationKey(key, slot.id));
      setDone(a);
      setUncertain(false);
      void reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        key.current = null;
        setUncertain(false);
        setStep(2);
        slots.reload();
        setError("Khung giờ vừa hết hoặc trùng với lịch khám khác của bạn. Vui lòng chọn lại.");
      } else {
        setUncertain(e instanceof ApiError && e.uncertain);
        setError(errorMessage(e));
      }
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Panel className="success">
        <span className="okic"><CheckCircle2 aria-hidden /></span>
        <h1>Đặt lịch thành công</h1>
        <p className="sub">Lịch khám đã được phòng khám xác nhận. Email xác nhận sẽ được gửi nếu bạn đã cập nhật email.</p>
        <dl className="detail" style={{ textAlign: "left" }}>
          <div><dt>Mã lịch hẹn</dt><dd className="mono">{apptCode(done.id)}</dd></div>
          <div><dt>Thời gian</dt><dd>{formatTime(done.startAt)} · {formatDate(done.startAt)}</dd></div>
          <div><dt>Bác sĩ</dt><dd>{dir.doctorName(done.doctorId)}</dd></div>
          <div><dt>Hình thức</dt><dd>{MODE_LABEL[done.mode]}</dd></div>
        </dl>
        <div className="row" style={{ justifyContent: "center" }}>
          <button className="btn" onClick={() => go("/patient")}>Về tổng quan</button>
          <button className="btn primary" onClick={() => go("/patient/appointments")}>Xem lịch của tôi</button>
        </div>
      </Panel>
    );

  const labels = ["Chuyên khoa & bác sĩ", "Thời gian khám", "Xác nhận"];
  return (
    <>
      <PageHead eyebrow="Dịch vụ khám" title="Đặt lịch khám" text="Chọn chuyên khoa, bác sĩ và khung giờ còn trống." />
      {error && <Notice tone="error">{error}</Notice>}
      <div className="booking">
        <Panel>
          <div className="steps" aria-label="Các bước đặt lịch">
            {labels.map((l, i) => (
              <span key={l} className={"step" + (step === i + 1 ? " on" : step > i + 1 ? " done" : "")} aria-current={step === i + 1 ? "step" : undefined}>
                <span className="n">{step > i + 1 ? <Check size={12} aria-hidden /> : i + 1}</span>{l}
              </span>
            ))}
          </div>
          <AsyncBlock loading={dir.loading} error={dir.error} onRetry={dir.reload} empty={specialties.length === 0} emptyTitle="Chưa có chuyên khoa" emptyText="Phòng khám chưa cấu hình chuyên khoa.">
            {step === 1 && (
              <>
                <h2>Chọn chuyên khoa</h2>
                <div className="choice-grid">
                  {specialties.map((s) => (
                    <button key={s.id} className={"choice" + (s.id === specialtyId ? " on" : "")} aria-pressed={s.id === specialtyId} onClick={() => setSpecialtyId(s.id)}>
                      <Stethoscope size={20} aria-hidden />
                      <span><b>{s.name}</b><small>{dir.doctors.filter((d) => d.active && d.specialtyIds.includes(s.id)).length} bác sĩ</small></span>
                      {s.id === specialtyId && <CheckCircle2 className="check" size={16} aria-hidden />}
                    </button>
                  ))}
                </div>
                <h2>Chọn bác sĩ</h2>
                {doctors.length === 0 ? (
                  <Empty title="Chưa có bác sĩ thuộc chuyên khoa này" />
                ) : (
                  <div className="choice-grid">
                    {doctors.map((d) => (
                      <button key={d.id} className={"choice" + (d.id === doctorId ? " on" : "")} aria-pressed={d.id === doctorId} onClick={() => setDoctorId(d.id)}>
                        <span className="docavatar" style={{ width: 38, height: 38 }}>{initials(d.displayName)}</span>
                        <span><b>{dir.doctorName(d.id)}</b><small>{specialty?.name}</small></span>
                        {d.id === doctorId && <CheckCircle2 className="check" size={16} aria-hidden />}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h2>Chọn thời gian khám</h2>
                <div className="row" style={{ marginBottom: 14 }}>
                  <Segmented label="Hình thức khám" value={mode} onChange={setMode} items={[
                    { id: "IN_PERSON", label: <><Stethoscope size={15} aria-hidden /> Trực tiếp</> },
                    { id: "REMOTE", label: <><Video size={15} aria-hidden /> Từ xa</> },
                  ]} />
                  <label className="row" style={{ gap: 8 }}>
                    <span className="sub">Ngày khám</span>
                    <input className="field" type="date" min={todayKey()} value={date} onChange={(e) => setDate(e.target.value)} />
                  </label>
                </div>
                <h3>Khung giờ còn trống</h3>
                <AsyncBlock loading={slots.loading} error={slots.error} onRetry={slots.reload} empty={(slots.data?.length ?? 0) === 0} emptyTitle="Không có khung giờ trống" emptyText="Hãy thử chọn ngày hoặc hình thức khám khác.">
                  <div className="slots" role="group" aria-label="Khung giờ">
                    {slots.data?.map((s) => (
                      <button key={s.id} className={"slot" + (s.id === slotId ? " on" : "")} aria-pressed={s.id === slotId} onClick={() => setSlotId(s.id)}>
                        {formatTime(s.startAt)}
                      </button>
                    ))}
                  </div>
                </AsyncBlock>
              </>
            )}
            {step === 3 && slot && (
              <>
                <h2>Kiểm tra thông tin lịch khám</h2>
                <dl className="detail">
                  <div><dt>Bác sĩ</dt><dd>{dir.doctorName(doctorId)}</dd></div>
                  <div><dt>Chuyên khoa</dt><dd>{specialty?.name}</dd></div>
                  <div><dt>Ngày khám</dt><dd>{formatDate(slot.startAt)}</dd></div>
                  <div><dt>Giờ khám</dt><dd>{formatTime(slot.startAt)}–{formatTime(slot.endAt)}</dd></div>
                  <div><dt>Hình thức</dt><dd>{MODE_LABEL[mode]}</dd></div>
                </dl>
                <Notice><span>Đổi/hủy khi lịch đã xác nhận và còn ít nhất 2 giờ trước giờ khám.</span></Notice>
                {uncertain && <Notice tone="warn">Chưa xác định được kết quả. Nhấn xác nhận để kiểm tra lại cùng yêu cầu; hệ thống sẽ không tạo lịch trùng.</Notice>}
              </>
            )}
          </AsyncBlock>
          <div className="row between" style={{ marginTop: 22 }}>
            <button className="btn" disabled={busy || uncertain} onClick={() => (step === 1 ? go("/patient") : setStep(step - 1))}>
              <ArrowLeft size={16} aria-hidden /> {step === 1 ? "Hủy" : "Quay lại"}
            </button>
            <button className="btn primary" disabled={busy || !doctorId || (step >= 2 && !slot)} onClick={() => (step < 3 ? setStep(step + 1) : void submit())}>
              {busy ? "Đang đặt lịch…" : step < 3 ? <>Tiếp tục <ArrowRight size={16} aria-hidden /></> : <><Check size={16} aria-hidden /> Xác nhận đặt lịch</>}
            </button>
          </div>
        </Panel>
        <aside className="panel summary">
          <h3>Tóm tắt lịch khám</h3>
          <dl>
            <div><dt>Bác sĩ</dt><dd>{doctor ? dir.doctorName(doctor.id) : "Chưa chọn"}</dd></div>
            <div><dt>Chuyên khoa</dt><dd>{specialty?.name ?? "Chưa chọn"}</dd></div>
            <div><dt>Ngày</dt><dd>{slot ? formatDate(slot.startAt) : "Chưa chọn"}</dd></div>
            <div><dt>Giờ</dt><dd>{slot ? formatTime(slot.startAt) : "Chưa chọn"}</dd></div>
            <div><dt>Hình thức</dt><dd>{MODE_LABEL[mode]}</dd></div>
          </dl>
          <p className="muted"><Info size={13} aria-hidden /> Bạn có thể đổi hoặc hủy trước giờ khám ít nhất <b>2 giờ</b>.</p>
        </aside>
      </div>
    </>
  );
}
