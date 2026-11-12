import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useStaffAuth } from "@/auth/AuthProvider";
import { PermissionGate } from "@/auth/PermissionGate";
import { listDoctors } from "@/api/doctorApi";
import { listSpecialties } from "@/api/specialtyApi";
import { scanAppointments, type AppointmentScan } from "@/api/appointmentApi";
import { listNotificationJobs } from "@/api/notificationApi";
import { useAsync } from "@/hooks/useAsync";
import { AsyncBlock, Metric, PageHead, Panel, Pill } from "@/components/ui";
import { dayKey, formatDateTime, formatTime, longDate, todayKey } from "@/utils/datetime";
import { APPOINTMENT_STATUS, NOTIFICATION_STATUS } from "@/utils/labels";
import type { Appointment, AppointmentStatus, NotificationJob } from "@/types";

const MAX_PAGES = 20;

export function DashboardPage() {
  const { can } = useStaffAuth();
  const canAppts = can("appointments.read");
  const canNotif = can("notifications.view");
  const today = todayKey();

  const doctors = useAsync(listDoctors, []);
  const specialties = useAsync(listSpecialties, []);
  const appts = useAsync<AppointmentScan | undefined>(
    () => (canAppts ? scanAppointments({ maxPages: MAX_PAGES }) : Promise.resolve(undefined)),
    [canAppts],
  );
  const notifs = useAsync<NotificationJob[] | undefined>(
    () => (canNotif ? listNotificationJobs() : Promise.resolve(undefined)),
    [canNotif],
  );

  const stats = useMemo(() => {
    const items = appts.data?.items ?? [];
    const todays = items.filter((a) => dayKey(a.startAt) === today);
    const by = (list: Appointment[], ...s: AppointmentStatus[]) =>
      list.filter((a) => s.includes(a.status)).length;
    return {
      total: items.length,
      todays,
      today: todays.length,
      checkedIn: by(todays, "CHECKED_IN", "IN_PROGRESS", "COMPLETED"),
      notArrived: by(todays, "CONFIRMED"),
      cancelled: by(todays, "CANCELLED", "NO_SHOW"),
      completedAll: by(items, "COMPLETED"),
      upcoming: todays
        .filter((a) => a.status !== "CANCELLED" && a.status !== "NO_SHOW")
        .slice(0, 6),
    };
  }, [appts.data, today]);

  const docName = (id: string) =>
    doctors.data?.find((d) => d.id === id)?.displayName ?? id.slice(0, 8);
  const activeDoctors = doctors.data?.filter((d) => d.active).length;
  const pct = (n: number) => (stats.today ? Math.round((n / stats.today) * 100) : 0);
  const truncated = appts.data?.truncated;

  return (
    <>
      <PageHead
        eyebrow={longDate(today)}
        title="Tổng quan phòng khám"
        actions={
          <PermissionGate permission="checkin.perform">
            <Link className="btn primary" to="/reception">
              ＋ Tiếp đón bệnh nhân
            </Link>
          </PermissionGate>
        }
      />

      <div className="metrics">
        <Metric
          label="Tổng số bác sĩ"
          icon="♙"
          value={doctors.loading ? "…" : (doctors.data?.length ?? "—")}
          hint={
            doctors.error
              ? doctors.error
              : doctors.data
                ? `${activeDoctors} đang nhận lịch`
                : undefined
          }
          tone={doctors.error ? "red" : undefined}
        />
        <Metric
          label="Chuyên khoa"
          icon="◈"
          value={specialties.loading ? "…" : (specialties.data?.length ?? "—")}
          hint={specialties.error || "Đang hoạt động"}
          tone={specialties.error ? "red" : undefined}
        />
        <PermissionGate permission="appointments.read">
          <Metric
            label="Lịch hẹn hôm nay"
            value={appts.loading ? "…" : appts.error ? "—" : stats.today}
            hint={appts.error || (truncated ? "Chưa quét hết dữ liệu" : `Tổng ${stats.total} lịch trong hệ thống`)}
            tone={appts.error ? "red" : undefined}
          />
          <Metric
            label="Số lượt khám (hoàn tất)"
            icon="✓"
            value={appts.loading ? "…" : appts.error ? "—" : `${truncated ? "≥ " : ""}${stats.completedAll}`}
            hint="Lịch ở trạng thái COMPLETED"
            tone="green"
          />
        </PermissionGate>
        <Metric
          label="Tổng số bệnh nhân"
          icon="♙"
          value="—"
          hint="Backend chưa có API thống kê/danh sách bệnh nhân"
          tone="amber"
        />
      </div>

      {!can("appointments.read") && (
        <div className="notice">
          Tài khoản kiểm toán chỉ xem được danh mục bác sĩ/chuyên khoa trên Dashboard. Dữ liệu lịch hẹn
          và thông báo không được backend cung cấp cho vai trò này. Vào{" "}
          <Link to="/audit">Nhật ký kiểm toán</Link> để tra cứu sự kiện.
        </div>
      )}

      <PermissionGate permission="appointments.read">
        <div className="grid2">
          <Panel
            title="Lịch hẹn hôm nay"
            subtitle="Các lượt khám trong ngày (giờ Asia/Ho_Chi_Minh)"
            actions={
              <PermissionGate permission="checkin.perform">
                <Link className="btn soft" to="/reception">
                  Xem tất cả →
                </Link>
              </PermissionGate>
            }
          >
            <AsyncBlock
              loading={appts.loading}
              error={appts.error}
              onRetry={appts.reload}
              empty={stats.upcoming.length === 0}
              emptyText="Hôm nay chưa có lịch hẹn."
            >
              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mã BN</th>
                      <th>Giờ khám</th>
                      <th>Bác sĩ</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.upcoming.map((a) => (
                      <tr key={a.id}>
                        <td className="audit-code">{a.patientId.slice(0, 8)}</td>
                        <td>{formatTime(a.startAt)}</td>
                        <td>{docName(a.doctorId)}</td>
                        <td>
                          <Pill tone={APPOINTMENT_STATUS[a.status]?.tone}>
                            {APPOINTMENT_STATUS[a.status]?.label ?? a.status}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AsyncBlock>
          </Panel>

          <Panel title="Tiến độ lịch hẹn hôm nay" subtitle={`Trên tổng ${stats.today} lịch`}>
            <AsyncBlock loading={appts.loading} error={appts.error} onRetry={appts.reload}>
              {[
                ["Đã check-in / đang khám / hoàn tất", stats.checkedIn, "#2563eb"],
                ["Chưa đến (đã xác nhận)", stats.notArrived, "#d89b34"],
                ["Hủy / vắng mặt", stats.cancelled, "#c0394b"],
              ].map(([label, n, color]) => (
                <div key={String(label)} style={{ margin: "12px 0" }}>
                  <div className="qline" style={{ margin: "0 0 6px" }}>
                    <span>{label}</span>
                    <b>{n}</b>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${pct(Number(n))}%`, background: String(color) }} />
                  </div>
                </div>
              ))}
              {truncated && (
                <div className="muted">Đã quét {MAX_PAGES * 100} lịch đầu tiên; số liệu có thể chưa đầy đủ.</div>
              )}
            </AsyncBlock>
          </Panel>
        </div>
      </PermissionGate>

      <PermissionGate permission="notifications.view">
        <Panel
          title="Hoạt động thông báo gần đây"
          subtitle="Lấy từ tác vụ gửi thông báo của hệ thống"
          actions={
            <Link className="btn soft" to="/notifications">
              Xem tất cả →
            </Link>
          }
        >
          <AsyncBlock
            loading={notifs.loading}
            error={notifs.error}
            onRetry={notifs.reload}
            empty={(notifs.data?.length ?? 0) === 0}
            emptyText="Chưa có tác vụ thông báo."
          >
            {(notifs.data ?? []).slice(0, 5).map((n) => (
              <div className="log" key={n.id}>
                <div className="logdot" />
                <div>
                  <b>
                    {n.eventType} · {NOTIFICATION_STATUS[n.status]?.label ?? n.status}
                  </b>
                  <small>
                    {formatDateTime(n.dueAt)} · lịch {n.appointmentId.slice(0, 8)}
                  </small>
                </div>
              </div>
            ))}
          </AsyncBlock>
        </Panel>
      </PermissionGate>
    </>
  );
}
