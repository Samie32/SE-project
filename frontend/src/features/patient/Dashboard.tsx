import { Link } from "react-router-dom";
import { CalendarCheck, CalendarPlus, CheckCircle2, FileHeart, Video } from "lucide-react";
import { useSession } from "@/core/session";
import { useNow } from "@/core/useAsync";
import { longDate, todayKey } from "@/core/datetime";
import { MODE_LABEL } from "@/core/labels";
import { AsyncBlock, Metric, Notice, PageHead, Panel } from "@/ui";
import { AppointmentRow } from "@/features/shared/AppointmentRow";
import { usePatient } from "./PatientContext";

export function PatientDashboard() {
  const { displayName } = useSession();
  const { appointments, loading, error, reload, truncated } = usePatient();
  const now = useNow(30_000).getTime();
  const upcoming = appointments
    .filter((a) => ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status) && Date.parse(a.endAt) >= now)
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
  const next = upcoming[0];
  const done = appointments.filter((a) => a.status === "COMPLETED").length;
  const remote = upcoming.filter((a) => a.mode === "REMOTE").length;

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
              <AppointmentRow key={a.id} item={a} />
            ))}
          </AsyncBlock>
        </Panel>
        <div>
          <Panel title="Lần khám tiếp theo">
            {next ? (
              <>
                <p style={{ marginBottom: 4 }}><b>{MODE_LABEL[next.mode]}</b></p>
                <p className="sub">{new Date(next.startAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "full", timeStyle: "short" })}</p>
                {next.mode === "REMOTE" && (
                  <Link className="btn soft" to={`/patient/telehealth?appointmentId=${next.id}`}>
                    <Video size={16} aria-hidden /> Phòng chờ trực tuyến
                  </Link>
                )}
              </>
            ) : (
              <p className="sub">Chưa có lịch. Hãy đặt lịch để được bác sĩ chăm sóc.</p>
            )}
          </Panel>
          <Panel title="Lối tắt">
            <div className="stack">
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
