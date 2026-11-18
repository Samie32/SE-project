import { Link } from "react-router-dom";
import { Activity, CalendarCheck, CheckCircle2, Users } from "lucide-react";
import { dayKey, formatTime, longDate, todayKey } from "@/core/datetime";
import { MODE_SHORT, apptCode, patientCode } from "@/core/labels";
import { useSession } from "@/core/session";
import { Empty, Metric, Notice, PageHead, Panel, StatusPill } from "@/ui";
import { useDoctor } from "./DoctorContext";

export function DoctorHome() {
  const { displayName } = useSession();
  const { appointments, loading, truncated, error, resolving } = useDoctor();
  const today = todayKey();
  const list = appointments.filter((a) => dayKey(a.startAt) === today && a.status !== "CANCELLED").sort((a, b) => a.startAt.localeCompare(b.startAt));
  const n = (s: string) => list.filter((a) => a.status === s).length;
  const next = list.find((a) => a.status === "CHECKED_IN" || a.status === "IN_PROGRESS") ?? list.find((a) => a.status === "CONFIRMED");
  return (
    <>
      <PageHead eyebrow={longDate(today)} title={`Xin chào, ${displayName}`} text="Tổng quan công việc khám bệnh hôm nay." />
      {error && !resolving && <Notice tone="error">{error}</Notice>}
      {truncated && <Notice tone="warn">Dữ liệu lịch quá lớn, có thể chưa đầy đủ.</Notice>}
      <div className="metrics">
        <Metric label="Lịch hôm nay" value={loading ? "…" : list.length} icon={<CalendarCheck size={16} />} />
        <Metric label="Đang chờ" value={loading ? "…" : n("CHECKED_IN")} icon={<Users size={16} />} tone="amber" />
        <Metric label="Đang khám" value={loading ? "…" : n("IN_PROGRESS")} icon={<Activity size={16} />} tone="purple" />
        <Metric label="Hoàn tất" value={loading ? "…" : n("COMPLETED")} icon={<CheckCircle2 size={16} />} tone="green" />
      </div>
      <div className="grid2">
        <Panel title="Lịch hôm nay" actions={<Link className="btn sm soft" to="/doctor/appointments">Tất cả lịch hẹn</Link>}>
          {list.length === 0 ? <Empty title="Hôm nay không có lịch khám" /> : (
            <div className="tablewrap"><table><thead><tr><th>Giờ</th><th>Mã lịch</th><th>Bệnh nhân</th><th>Hình thức</th><th>Trạng thái</th></tr></thead>
              <tbody>{list.map((a) => <tr key={a.id}><td><b>{formatTime(a.startAt)}</b></td><td className="mono">{apptCode(a.id)}</td><td className="mono">{patientCode(a.patientId)}</td><td>{MODE_SHORT[a.mode]}</td><td><StatusPill status={a.status} /></td></tr>)}</tbody></table></div>
          )}
        </Panel>
        <Panel title="Ca tiếp theo">
          {next ? (
            <div>
              <div className="row between"><b>{formatTime(next.startAt)} · {MODE_SHORT[next.mode]}</b><StatusPill status={next.status} /></div>
              <p className="muted">{apptCode(next.id)} · {patientCode(next.patientId)}</p>
              <Link className="btn primary" to={next.mode === "REMOTE" ? `/doctor/telehealth/${next.id}` : `/doctor/consultation/${next.id}`}>{next.mode === "REMOTE" ? "Vào phòng khám từ xa" : "Mở hồ sơ khám"}</Link>
            </div>
          ) : <p className="sub">Không còn ca nào hôm nay.</p>}
        </Panel>
      </div>
    </>
  );
}
