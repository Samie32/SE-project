import { ArrowRight, CalendarDays, FileHeart, Plus, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { doctorName, usePortal } from "./data";
import { AppointmentRow, Button, Empty, Heading, modeLabel } from "./ui";
import { isUpcoming, toLocalDateShort, toLocalTime } from "./utils";
export function Dashboard({ name, now }: { name: string; now: Date }) {
  const go = useNavigate(),
    { appointments, doctors, specialties } = usePortal();
  const upcoming = appointments.filter(isUpcoming),
    next = upcoming[0];
  const doctor = doctors.find((d) => d.id === next?.doctorId);
  const seconds = next
    ? Math.max(0, Math.floor((Date.parse(next.startAt) - now.getTime()) / 1000))
    : 0;
  const countdown = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(" : ");
  return (
    <>
      <Heading
        eyebrow={now
          .toLocaleDateString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
          .toUpperCase()}
        title={"Xin chào, " + name}
        text="Đây là tổng quan và lịch khám của bạn."
        action={
          <Button onClick={() => go("/patient/booking")}>
            <Plus />
            Đặt lịch khám mới
          </Button>
        }
      />
      {next ? (
        <section className="next">
          <div>
            <span className="live">
              <i />
              LỊCH KHÁM SẮP TỚI
            </span>
            <h2>{doctorName(doctor)}</h2>
            <p>
              {specialties.find((s) => s.id === doctor?.specialtyId)?.name} ·{" "}
              {modeLabel(next.mode)}
            </p>
            <div className="next-meta">
              <span>
                <CalendarDays />
                <b>{toLocalDateShort(next.startAt)}</b>
                <small>Ngày khám</small>
              </span>
              <span>
                <b>{toLocalTime(next.startAt)}</b>
                <small>Giờ khám</small>
              </span>
              <span>
                <b>{modeLabel(next.mode)}</b>
                <small>Hình thức</small>
              </span>
            </div>
          </div>
          <div className="countdown">
            <span>BẮT ĐẦU SAU</span>
            <strong>{countdown}</strong>
            <small>Giờ · Phút · Giây</small>
            <Button
              kind="white"
              onClick={() =>
                go(
                  next.mode === "REMOTE"
                    ? "/patient/telehealth?appointmentId=" + next.id
                    : "/patient/appointments",
                )
              }
            >
              {next.mode === "REMOTE" ? <Video /> : <CalendarDays />}Chi tiết
              lịch khám
            </Button>
            <p>
              {next.mode === "REMOTE"
                ? "Phòng chờ mở trước giờ khám 10 phút"
                : "Vui lòng đến trước giờ hẹn"}
            </p>
          </div>
        </section>
      ) : (
        <section className="card">
          <Empty
            title="Bạn chưa có lịch khám sắp tới"
            text="Đặt lịch để chọn bác sĩ và khung giờ phù hợp."
          />
        </section>
      )}
      <div className="metrics">
        {[
          [
            CalendarDays,
            "Lịch sắp tới",
            upcoming.length,
            "Lịch hẹn đã xác nhận",
            "blue",
          ],
          [
            FileHeart,
            "Lần khám hoàn tất",
            appointments.filter((a) => a.status === "COMPLETED").length,
            "Theo danh sách lịch khám",
            "green",
          ],
          [
            Video,
            "Lịch khám từ xa",
            upcoming.filter((a) => a.mode === "REMOTE").length,
            "Lịch từ xa sắp tới",
            "orange",
          ],
        ].map(([Icon, label, value, hint, tone]) => {
          const I = Icon as typeof CalendarDays;
          return (
            <div className="metric" key={String(label)}>
              <span className={String(tone)}>
                <I />
              </span>
              <div>
                <small>{String(label)}</small>
                <b>{String(value)}</b>
                <em>{String(hint)}</em>
              </div>
            </div>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <span>
              <h2>Lịch khám của bạn</h2>
              <p>Theo dõi các lịch hẹn</p>
            </span>
            <button onClick={() => go("/patient/appointments")}>
              Xem tất cả
              <ArrowRight />
            </button>
          </div>
          {appointments.length ? (
            appointments
              .slice()
              .sort((a, b) => b.startAt.localeCompare(a.startAt))
              .slice(0, 5)
              .map((a) => (
                <AppointmentRow
                  key={a.id}
                  item={a}
                  actions={
                    <Button
                      kind="secondary"
                      onClick={() => go("/patient/appointments")}
                    >
                      Xem lịch
                    </Button>
                  }
                />
              ))
          ) : (
            <Empty title="Chưa có lịch khám" />
          )}
        </section>
        <section className="card quick">
          <div className="card-head">
            <span>
              <h2>Truy cập nhanh</h2>
              <p>Các dịch vụ thường dùng</p>
            </span>
          </div>
          {[
            [Plus, "Đặt lịch khám", "booking"],
            [FileHeart, "Hồ sơ sức khỏe", "records"],
            [Video, "Phòng khám từ xa", "telehealth"],
          ].map(([Icon, label, path]) => {
            const I = Icon as typeof Plus;
            return (
              <button key={String(path)} onClick={() => go("/patient/" + path)}>
                <span>
                  <I />
                </span>
                <b>{String(label)}</b>
                <ArrowRight />
              </button>
            );
          })}
        </section>
      </div>
    </>
  );
}
