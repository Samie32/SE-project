import { Link } from "react-router-dom";
import { Activity, CalendarCheck, CheckCircle2, UserX, Users, Video } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { useSession } from "@/core/session";
import { dayKey, formatTime, longDate, todayKey } from "@/core/datetime";
import { MODE_SHORT, apptCode, patientCode } from "@/core/labels";
import { AsyncBlock, Metric, Notice, PageHead, Panel, StatusPill } from "@/ui";
import { useAppointments } from "./useAppointments";

export function StaffDashboard() {
  const { can } = useSession();
  const dir = useDirectory();
  const q = useAppointments();
  const today = todayKey();
  const all = q.data?.items ?? [];
  const list = all.filter((a) => dayKey(a.startAt) === today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const count = (s: string) => list.filter((a) => a.status === s).length;
  const activeDoctors = dir.doctors.filter((d) => d.active).length;
  const perDoctor = dir.doctors.map((d) => ({ d, n: list.filter((a) => a.doctorId === d.id && a.status !== "CANCELLED").length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...perDoctor.map((x) => x.n));

  return (
    <>
      <PageHead eyebrow={longDate(today)} title="Dashboard vận hành" text="Tổng quan lịch khám trong ngày của toàn phòng khám." />
      {q.data?.truncated && <Notice tone="warn">Dữ liệu lịch quá lớn, số liệu có thể chưa đầy đủ.</Notice>}
      <div className="metrics five">
        <Metric label="Lịch hôm nay" value={q.loading ? "…" : list.length} hint="Gồm cả đã hủy" icon={<CalendarCheck size={16} />} />
        <Metric label="Đã check-in" value={q.loading ? "…" : count("CHECKED_IN")} hint="Đang chờ gọi" icon={<Users size={16} />} tone="amber" />
        <Metric label="Đang khám" value={q.loading ? "…" : count("IN_PROGRESS")} hint="Tại phòng khám / từ xa" icon={<Activity size={16} />} tone="purple" />
        <Metric label="Hoàn tất" value={q.loading ? "…" : count("COMPLETED")} hint="Trong ngày" icon={<CheckCircle2 size={16} />} tone="green" />
        <Metric label="Vắng / hủy" value={q.loading ? "…" : count("NO_SHOW") + count("CANCELLED")} hint={`${activeDoctors} bác sĩ đang nhận lịch`} icon={<UserX size={16} />} tone="red" />
      </div>
      <div className="grid2">
        <Panel title="Lịch khám hôm nay" actions={can("checkin.perform") && <Link className="btn sm soft" to="/staff/reception">Mở tiếp đón</Link>}>
          <AsyncBlock loading={q.loading} error={q.error} onRetry={q.reload} empty={list.length === 0} emptyTitle="Hôm nay chưa có lịch khám">
            <div className="tablewrap" tabIndex={0} role="region" aria-label="Bảng lịch khám hôm nay"><table>
              <thead><tr><th>Giờ</th><th>Mã lịch</th><th>Bệnh nhân</th><th>Bác sĩ</th><th>Hình thức</th><th>Trạng thái</th></tr></thead>
              <tbody>{list.slice(0, 12).map((a) => (
                <tr key={a.id}><td className="nowrap"><b>{formatTime(a.startAt)}</b></td><td className="mono">{apptCode(a.id)}</td><td className="mono">{patientCode(a.patientId)}</td>
                  <td>{dir.doctorName(a.doctorId)}</td><td>{a.mode === "REMOTE" ? <><Video size={13} aria-hidden /> </> : null}{MODE_SHORT[a.mode]}</td><td><StatusPill status={a.status} /></td></tr>
              ))}</tbody>
            </table></div>
            {list.length > 12 && <p className="muted" style={{ marginTop: 8 }}>… và {list.length - 12} lịch khác.</p>}
          </AsyncBlock>
        </Panel>
        <Panel title="Tải theo bác sĩ" subtitle="Số lịch hôm nay (không tính đã hủy)">
          {perDoctor.length === 0 ? <p className="sub">Chưa có dữ liệu.</p> : perDoctor.map(({ d, n }) => (
            <div key={d.id} style={{ marginBottom: 12 }}>
              <div className="row between"><span>{dir.doctorName(d.id)}</span><b>{n}</b></div>
              <div className="bar" role="img" aria-label={`${n} lịch`}><i style={{ width: `${(n / max) * 100}%` }} /></div>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
