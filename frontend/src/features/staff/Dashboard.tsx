import { useState } from "react";
import { Link } from "react-router-dom";
import { Activity, CalendarCheck, CheckCircle2, RefreshCw, UserX, Video } from "lucide-react";
import { useDirectory } from "@/core/directory";
import { useSession } from "@/core/session";
import { dayKey, formatTime, todayKey } from "@/core/datetime";
import { MODE_SHORT, apptCode, patientCode } from "@/core/labels";
import { AsyncBlock, Metric, Notice, PageHead, Panel, StatusPill } from "@/ui";
import { useAppointments } from "./useAppointments";

type DayFilter = "ALL" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export function StaffDashboard() {
  const { can } = useSession();
  const dir = useDirectory();
  const q = useAppointments();
  const [filter, setFilter] = useState<DayFilter>("ALL");

  const today = todayKey();
  const all = q.data?.items ?? [];
  const list = all.filter(a => dayKey(a.startAt) === today).sort((a, b) => a.startAt.localeCompare(b.startAt));
  const count = (s: string) => list.filter(a => a.status === s).length;

  const filtered = list.filter(a => {
    if (filter === "ACTIVE") return ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status);
    if (filter === "COMPLETED") return a.status === "COMPLETED";
    if (filter === "CANCELLED") return a.status === "CANCELLED" || a.status === "NO_SHOW";
    return true;
  });

  const activeDoctors = dir.doctors.filter(d => d.active).length;
  const perDoctor = dir.doctors
    .map(d => ({
      d,
      n: list.filter(a => a.doctorId === d.id && a.status !== "CANCELLED").length,
    }))
    .filter(x => x.d.active || x.n > 0)
    .sort((a, b) => b.n - a.n || a.d.displayName.localeCompare(b.d.displayName));
  const max = Math.max(1, ...perDoctor.map(x => x.n));

  const checkedIn = count("CHECKED_IN");
  const inProgress = count("IN_PROGRESS");
  const noShow = count("NO_SHOW");
  const cancelled = count("CANCELLED");

  return (
    <>
      <PageHead title="Dashboard" />
      {q.data?.truncated && <Notice tone="warn">Dữ liệu lịch quá lớn, số liệu có thể chưa đầy đủ.</Notice>}
      <div className="metrics">
        <Metric
          label="Lịch hôm nay"
          value={q.loading ? "…" : list.length}
          hint={`${count("CONFIRMED")} chờ check-in`}
          icon={<CalendarCheck size={16} />}
        />
        <Metric
          label="Đang xử lý"
          value={q.loading ? "…" : checkedIn + inProgress}
          hint={`${checkedIn} chờ gọi · ${inProgress} đang khám`}
          icon={<Activity size={16} />}
          tone="amber"
        />
        <Metric
          label="Hoàn tất"
          value={q.loading ? "…" : count("COMPLETED")}
          hint="Đã khám xong"
          icon={<CheckCircle2 size={16} />}
          tone="green"
        />
        <Metric
          label="Vắng / hủy"
          value={q.loading ? "…" : noShow + cancelled}
          hint={`${noShow} vắng · ${cancelled} đã hủy`}
          icon={<UserX size={16} />}
          tone="red"
        />
      </div>
      <div className="grid2">
        <Panel
          title="Lịch khám hôm nay"
          actions={
            <div className="row">
              <select
                className="field"
                aria-label="Lọc trạng thái lịch hôm nay"
                value={filter}
                onChange={event => setFilter(event.target.value as DayFilter)}
              >
                <option value="ALL">Tất cả ({list.length})</option>
                <option value="ACTIVE">Chờ & đang khám</option>
                <option value="COMPLETED">Hoàn tất</option>
                <option value="CANCELLED">Vắng / hủy</option>
              </select>
              <button
                type="button"
                className="btn sm"
                aria-label="Làm mới"
                title="Làm mới"
                onClick={q.reload}
                disabled={q.loading}
              >
                <RefreshCw size={14} aria-hidden /> Làm mới
              </button>
              {can("checkin.perform") && (
                <Link className="btn sm soft" to="/staff/reception">
                  Mở tiếp đón
                </Link>
              )}
            </div>
          }
        >
          <AsyncBlock
            loading={q.loading}
            error={q.error}
            onRetry={q.reload}
            empty={filtered.length === 0}
            emptyTitle={list.length === 0 ? "Hôm nay chưa có lịch khám" : "Không có lịch phù hợp bộ lọc"}
          >
            <div className="tablewrap table-scroll" tabIndex={0} role="region" aria-label="Bảng lịch khám hôm nay">
              <table>
                <thead>
                  <tr>
                    <th>Giờ</th>
                    <th>Mã lịch</th>
                    <th>Bệnh nhân</th>
                    <th>Bác sĩ</th>
                    <th>Hình thức</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td className="nowrap">
                        <b>{formatTime(a.startAt)}</b>
                      </td>
                      <td className="mono">{apptCode(a.id)}</td>
                      <td className="mono">{patientCode(a.patientId)}</td>
                      <td>{dir.doctorName(a.doctorId)}</td>
                      <td>
                        {a.mode === "REMOTE" ? (
                          <>
                            <Video size={13} aria-hidden />{" "}
                          </>
                        ) : null}
                        {MODE_SHORT[a.mode]}
                      </td>
                      <td>
                        <StatusPill status={a.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AsyncBlock>
        </Panel>
        <Panel title="Tải theo bác sĩ" subtitle={`${activeDoctors} bác sĩ đang nhận lịch · Lịch hôm nay (trừ đã hủy)`}>
          {perDoctor.length === 0 ? (
            <p className="sub">Chưa có dữ liệu.</p>
          ) : (
            <div className="doctor-load-scroll">
              {perDoctor.map(({ d, n }) => (
                <div key={d.id} style={{ marginBottom: 12 }}>
                  <div className="row between">
                    <span>{dir.doctorName(d.id)}</span>
                    <b>{n}</b>
                  </div>
                  <div className="bar" role="img" aria-label={`${n} lịch`}>
                    <i style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
