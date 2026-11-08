import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Info,
  Stethoscope,
  Video,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { bookAppointment, getSlots } from "../api/appointments";
import { ApiError } from "../api/client";
import type { Appointment, AppointmentMode, Slot } from "../types";
import { doctorName, message, usePortal } from "./data";
import { Button, Empty, ErrorBox, Heading, modeLabel } from "./ui";
import {
  mutationKey,
  todayLocalDate,
  toLocalDateShort,
  toLocalTime,
} from "./utils";
export function Booking() {
  const go = useNavigate(),
    { doctors, specialties, reload } = usePortal();
  const [step, setStep] = useState(1),
    [specialtyId, setSpecialtyId] = useState(specialties[0]?.id || "");
  const [doctorId, setDoctorId] = useState(""),
    [date, setDate] = useState(todayLocalDate());
  const [mode, setMode] = useState<AppointmentMode>("IN_PERSON"),
    [slotId, setSlotId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [slotError, setSlotError] = useState(""),
    [refresh, setRefresh] = useState(0);
  const [done, setDone] = useState<Appointment | null>(null),
    [uncertain, setUncertain] = useState(false);
  const key = useRef<{ fingerprint: string; key: string } | null>(null);
  const filtered = doctors
    .filter((d) => d.specialtyId === specialtyId)
    .filter((d, i, all) => all.findIndex((x) => x.id === d.id) === i);
  const doctor = doctors.find((d) => d.id === doctorId),
    specialty = specialties.find((s) => s.id === specialtyId);
  useEffect(() => {
    setDoctorId((current) =>
      filtered.some((d) => d.id === current) ? current : filtered[0]?.id || "",
    );
  }, [specialtyId, doctors]);
  useEffect(() => {
    let active = true;
    setSlots([]);
    setSlotId("");
    setSlotError("");
    setLoading(false);
    if (!doctorId || !date) return;
    setLoading(true);
    getSlots({ date, doctorId, specialtyId, mode })
      .then((data) => {
        if (active) setSlots(data.filter((s) => s.available !== false));
      })
      .catch((e) => {
        if (active) setSlotError(message(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [date, doctorId, specialtyId, mode, refresh]);
  const slot = slots.find((s) => s.id === slotId);
  const finish = async () => {
    if (!slot || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await bookAppointment(
        { slotId },
        mutationKey(key, JSON.stringify({ slotId })),
      );
      setDone(result);
      setUncertain(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        key.current = null;
        setUncertain(false);
        setStep(2);
        setRefresh((v) => v + 1);
        setError(
          "Khung giờ vừa hết hoặc trùng với lịch của bạn. Vui lòng chọn lại.",
        );
      } else {
        setUncertain(
          !(e instanceof ApiError) || e.status === 0 || e.status >= 500,
        );
        setError(message(e));
      }
    } finally {
      setBusy(false);
    }
  };
  if (done)
    return (
      <section className="success card">
        <span>
          <CheckCircle2 />
        </span>
        <h1>Đặt lịch thành công</h1>
        <p>Lịch khám đã được máy chủ xác nhận.</p>
        <div>
          <small>MÃ LỊCH HẸN</small>
          <small>THỜI GIAN</small>
          <small>BÁC SĨ</small>
          <b className="break-word">{done.id}</b>
          <b>
            {toLocalTime(done.startAt)} · {toLocalDateShort(done.startAt)}
          </b>
          <b>{doctorName(doctor)}</b>
        </div>
        <footer>
          <Button
            kind="secondary"
            onClick={() => {
              void reload();
              go("/patient");
            }}
          >
            Về trang chủ
          </Button>
          <Button
            onClick={() => {
              void reload();
              go("/patient/appointments");
            }}
          >
            Xem lịch của tôi
          </Button>
        </footer>
      </section>
    );
  return (
    <>
      <Heading
        eyebrow="DỊCH VỤ KHÁM"
        title="Đặt lịch khám"
        text="Chọn chuyên khoa, bác sĩ và thời gian phù hợp với bạn."
      />
      {error && <ErrorBox error={error} />}
      <div className="booking">
        <section className="card booking-main">
          <div className="steps">
            {["Chuyên khoa & bác sĩ", "Thời gian khám", "Xác nhận"].map(
              (label, i) => (
                <div
                  key={label}
                  className={
                    step === i + 1 ? "active" : step > i + 1 ? "done" : ""
                  }
                >
                  <span>{step > i + 1 ? <Check /> : i + 1}</span>
                  <b>{label}</b>
                  {i < 2 && <i />}
                </div>
              ),
            )}
          </div>
          <div className="step-body">
            {step === 1 && (
              <>
                <Title
                  n="1"
                  title="Chọn chuyên khoa"
                  sub="Bạn muốn khám về vấn đề gì?"
                />
                <div className="specialties">
                  {specialties.map((s) => (
                    <button
                      key={s.id}
                      className={specialtyId === s.id ? "selected" : ""}
                      onClick={() => setSpecialtyId(s.id)}
                    >
                      <Stethoscope />
                      <b>{s.name}</b>
                      <small>
                        {
                          new Set(
                            doctors
                              .filter((d) => d.specialtyId === s.id)
                              .map((d) => d.id),
                          ).size
                        }{" "}
                        bác sĩ
                      </small>
                      <CheckCircle2 />
                    </button>
                  ))}
                </div>
                {!specialties.length && <Empty title="Chưa có chuyên khoa" />}
                <Title
                  n="2"
                  title="Chọn bác sĩ"
                  sub="Đội ngũ phù hợp với chuyên khoa"
                />
                <div className="doctors">
                  {filtered.map((d) => (
                    <button
                      key={d.id}
                      className={doctorId === d.id ? "selected" : ""}
                      onClick={() => setDoctorId(d.id)}
                    >
                      <span>
                        {(d.displayName || "BS")
                          .split(" ")
                          .slice(-2)
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <div>
                        <b>{doctorName(d)}</b>
                        <small>{specialty?.name}</small>
                      </div>
                      <CheckCircle2 />
                    </button>
                  ))}
                </div>
                {!filtered.length && (
                  <Empty title="Chưa có bác sĩ thuộc chuyên khoa này" />
                )}
              </>
            )}
            {step === 2 && (
              <>
                <Title
                  n="2"
                  title="Chọn thời gian khám"
                  sub="Khung giờ trống được cập nhật từ phòng khám."
                />
                <div className="modes">
                  {(["IN_PERSON", "REMOTE"] as const).map((m) => (
                    <button
                      key={m}
                      className={mode === m ? "selected" : ""}
                      onClick={() => setMode(m)}
                    >
                      {m === "REMOTE" ? <Video /> : <Stethoscope />}
                      {modeLabel(m)}
                    </button>
                  ))}
                </div>
                <label className="field-label">
                  Ngày khám
                  <input
                    type="date"
                    min={todayLocalDate()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <h3 className="slot-title">Khung giờ còn trống</h3>
                {loading ? (
                  <p role="status">Đang tìm khung giờ…</p>
                ) : slotError ? (
                  <ErrorBox
                    error={slotError}
                    retry={() => setRefresh((v) => v + 1)}
                  />
                ) : slots.length ? (
                  <div className="slots">
                    {slots.map((s) => (
                      <button
                        key={s.id}
                        className={slotId === s.id ? "selected" : ""}
                        onClick={() => setSlotId(s.id)}
                      >
                        {toLocalTime(s.startAt)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <Empty
                    title="Không có khung giờ trống"
                    text="Hãy thử chọn ngày hoặc hình thức khám khác."
                  />
                )}
              </>
            )}
            {step === 3 && (
              <>
                <Title
                  n="3"
                  title="Kiểm tra thông tin lịch khám"
                  sub="Xác nhận thông tin trước khi đặt lịch."
                />
                <div className="confirm-doc">
                  <span>
                    <Stethoscope />
                  </span>
                  <div>
                    <b>{doctorName(doctor)}</b>
                    <small>{specialty?.name}</small>
                  </div>
                </div>
                <div className="confirm-grid">
                  {[
                    [
                      CalendarDays,
                      "NGÀY KHÁM",
                      slot ? toLocalDateShort(slot.startAt) : "",
                    ],
                    [
                      CalendarDays,
                      "GIỜ KHÁM",
                      slot ? toLocalTime(slot.startAt) : "",
                    ],
                    [Video, "HÌNH THỨC", modeLabel(mode)],
                  ].map(([Icon, label, value]) => {
                    const I = Icon as typeof CalendarDays;
                    return (
                      <div key={String(label)}>
                        <I />
                        <small>{String(label)}</small>
                        <b>{String(value)}</b>
                      </div>
                    );
                  })}
                </div>
                <div className="privacy">
                  <Info />
                  Đổi/hủy khi lịch đã xác nhận và còn ít nhất 2 giờ trước giờ
                  khám.
                </div>
                {uncertain && (
                  <div className="notice">
                    Chưa xác định được kết quả. Nhấn xác nhận để kiểm tra lại
                    cùng yêu cầu; không tạo lịch mới.
                  </div>
                )}
              </>
            )}
          </div>
          <footer className="booking-foot">
            <Button
              kind="secondary"
              disabled={busy || uncertain}
              onClick={() => (step === 1 ? go("/patient") : setStep(step - 1))}
            >
              <ArrowLeft />
              {step === 1 ? "Hủy" : "Quay lại"}
            </Button>
            <Button
              disabled={busy || !doctorId || (step >= 2 && (!slot || loading))}
              onClick={() => (step < 3 ? setStep(step + 1) : void finish())}
            >
              {busy ? (
                "Đang đặt lịch…"
              ) : step < 3 ? (
                <>
                  Tiếp tục
                  <ArrowRight />
                </>
              ) : (
                <>
                  <Check />
                  Xác nhận đặt lịch
                </>
              )}
            </Button>
          </footer>
        </section>
        <aside className="card summary">
          <h3>Tóm tắt lịch khám</h3>
          <div className="summary-doc">
            <span>
              <Stethoscope />
            </span>
            <div>
              <b>{doctorName(doctor)}</b>
              <small>{specialty?.name || "Chưa chọn chuyên khoa"}</small>
            </div>
          </div>
          <dl>
            <div>
              <dt>
                <CalendarDays />
                Ngày khám
              </dt>
              <dd>{slot ? toLocalDateShort(slot.startAt) : "Chưa chọn"}</dd>
            </div>
            <div>
              <dt>Giờ khám</dt>
              <dd>{slot ? toLocalTime(slot.startAt) : "Chưa chọn"}</dd>
            </div>
            <div>
              <dt>
                <Video />
                Hình thức
              </dt>
              <dd>{modeLabel(mode)}</dd>
            </div>
          </dl>
          <p>
            <Info />
            Bạn có thể đổi hoặc hủy lịch trước giờ khám ít nhất <b>2 giờ</b>.
          </p>
        </aside>
      </div>
    </>
  );
}
function Title({ n, title, sub }: { n: string; title: string; sub: string }) {
  return (
    <div className="section-title">
      <span>{n}</span>
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
    </div>
  );
}
