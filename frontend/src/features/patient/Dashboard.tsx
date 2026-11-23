import { Link } from "react-router-dom";
import { CalendarCheck, CalendarPlus, CheckCircle2, Clock3, FileHeart, MailWarning, Video } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { useSession } from "@/core/session";
import { useNow } from "@/core/useAsync";
import { MIN, dayKey, formatDate, formatTime, inJoinWindow, longDate, todayKey } from "@/core/datetime";
import { MODE_LABEL } from "@/core/labels";
import { AsyncBlock, Metric, Notice, PageHead, Panel, StatusPill } from "@/ui";
import { AppointmentRow } from "@/features/shared/AppointmentRow";
import { usePatient } from "./PatientContext";

function appointmentHint(startAt: string, status: string, mode: string, now: number): string {
  if (status === "IN_PROGRESS") return "Đang khám";
  if (status === "CHECKED_IN") return "Đã check-in, chờ gọi khám";
  if (mode === "REMOTE" && inJoinWindow(startAt, now)) return "Đang mở phòng chờ";
  const diffMin = Math.round((Date.parse(startAt) - now) / MIN);
  if (diffMin <= 0) return "Đã đến giờ hẹn";
  if (diffMin < 60) return `Sắp diễn ra trong ${diffMin} phút`;
  if (dayKey(startAt) === dayKey(new Date(now))) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return mins > 0 ? `Còn ${hours} giờ ${mins} phút` : `Còn ${hours} giờ`;
  }
  const days = Math.max(1, Math.round(diffMin / (24 * 60)));
  return `Còn ${days} ngày`;
}

export function PatientDashboard() {
  const { displayName, identity } = useSession();
  const dir = useDirectory();
  const { appointments, loading, error, reload, truncated } = usePatient();
  const now = useNow(30_000).getTime();
  const upcoming = appointments
    .filter(
      (a) =>
        a.status === "CHECKED_IN" ||
        a.status === "IN_PROGRESS" ||
        (a.status === "CONFIRMED" && Date.parse(a.endAt) >= now),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = upcoming[0];
  const done = appointments.filter((a) => a.status === "COMPLETED").length;
  const remote = upcoming.filter((a) => a.mode === "REMOTE").length;
  const missingEmail = Boolean(identity && !identity.email?.trim());

  return (
    <>
      <PageHead
        eyebrow={longDate(todayKey())}
        title={`Xin chào, ${displayName}`}
        text="Theo dõi lịch khám, đặt lịch mới và xem hồ sơ của bạn."
        actions={
          <Link className="btn primary" to="/patient/booking">
            <CalendarPlus size={16} aria-hidden /> Đặt lịch khám
          </Link>
        }
      />
      {truncated && <Notice tone="warn">Danh sách lịch quá dài, chỉ hiển thị một phần lịch cũ nhất. Vào “Lịch khám của tôi” để xem chi tiết.</Notice>}
      <div className="metrics three">
        <Metric label="Lịch sắp tới" value={loading ? "…" : upcoming.length} hint="Đã xác nhận / đang khám" icon={<CalendarCheck size={16} />} />
        <Metric label="Khám từ xa sắp tới" value={loading ? "…" : remote} hint="Có phòng chờ trực tuyến" icon={<Video size={16} />} tone="purple" />
        <Metric label="Lần khám hoàn tất" value={loading ? "…" : done} hint="Xem tại Hồ sơ & đơn thuốc" icon={<CheckCircle2 size={16} />} tone="green" />
      </div>
      <div className="grid2">
        <Panel title="Lịch khám sắp tới" subtitle="Tối đa 5 lịch gần nhất" actions={<Link className="btn sm" to="/patient/appointments">Xem tất cả</Link>}>
          <AsyncBlock loading={loading} error={error} onRetry={() => void reload()} empty={upcoming.length === 0} emptyTitle="Bạn chưa có lịch khám sắp tới" emptyText={<Link to="/patient/booking">Đặt lịch khám ngay</Link>}>
            {upcoming.slice(0, 5).map((a) => (
              <AppointmentRow
                key={a.id}
                item={a}
                actions={
                  a.mode === "REMOTE" ? (
                    <Link className="btn sm soft" to={`/patient/telehealth?appointmentId=${a.id}`}>
                      <Video size={14} aria-hidden /> {inJoinWindow(a.startAt, now) ? "Vào phòng chờ" : "Phòng chờ"}
                    </Link>
                  ) : (
                    <Link className="btn sm" to="/patient/appointments">Chi tiết</Link>
                  )
                }
              />
            ))}
          </AsyncBlock>
        </Panel>
        <div>
          <Panel title="Lần khám tiếp theo">
            {next ? (
              <div className="next-appt">
                <div className="next-appt-head">
                  <div>
                    <b style={{ fontSize: 17 }}>{dir.doctorName(next.doctorId)}</b>
                    <div className="muted">{dir.doctorSpecialties?.(next.doctorId) ?? ""}</div>
                  </div>
                  <StatusPill status={next.status} />
                </div>
                <div className="next-appt-countdown">
                  <Clock3 size={14} aria-hidden /> {appointmentHint(next.startAt, next.status, next.mode, now)}
                </div>
                <div className="next-appt-meta">
                  <span><b>{MODE_LABEL[next.mode]}</b></span>
                  <span>{formatTime(next.startAt)}–{formatTime(next.endAt)} · {formatDate(next.startAt)}</span>
                </div>
                <div className="row" style={{ marginTop: 4 }}>
                  {next.mode === "REMOTE" && (
                    <Link className="btn soft" to={`/patient/telehealth?appointmentId=${next.id}`}>
                      <Video size={16} aria-hidden /> {inJoinWindow(next.startAt, now) ? "Vào phòng chờ" : "Phòng chờ trực tuyến"}
                    </Link>
                  )}
                  <Link className="btn sm" to="/patient/appointments">Quản lý lịch</Link>
                </div>
              </div>
            ) : (
              <p className="sub">Chưa có lịch. Hãy đặt lịch để được bác sĩ chăm sóc.</p>
            )}
          </Panel>
          <Panel title="Lối tắt">
            <div className="stack">
              {missingEmail && (
                <Notice tone="warn">
                  <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <MailWarning size={15} aria-hidden /> Bạn chưa có email liên hệ để nhận xác nhận và nhắc lịch trước 30 phút.
                  </span>
                </Notice>
              )}
              <Link className="btn" to="/patient/records"><FileHeart size={16} aria-hidden /> Hồ sơ & đơn thuốc</Link>
              <Link className="btn" to="/account">Cập nhật email nhận thông báo</Link>
            </div>
          </Panel>
          <Notice>Bạn có thể đổi/hủy lịch khi lịch đã xác nhận và còn ít nhất <b>2 giờ</b> trước giờ khám.</Notice>
        </div>
      </div>
    </>
  );
}
