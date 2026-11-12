import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { scanAppointments } from "@/api/appointmentApi";
import { checkIn } from "@/api/checkinApi";
import { listDoctors } from "@/api/doctorApi";
import { errorMessage } from "@/api/client";
import { config } from "@/config";
import { useAsync } from "@/hooks/useAsync";
import { useToast } from "@/components/Toast";
import {
  AsyncBlock,
  ConfirmDialog,
  DetailList,
  Field,
  Metric,
  Modal,
  PageHead,
  Panel,
  PendingBackend,
  Pill,
} from "@/components/ui";
import { addDays, dayKey, formatDateTime, formatTime, todayKey } from "@/utils/datetime";
import { APPOINTMENT_STATUS, MODE_LABEL, UUID_RE, initials, shortId } from "@/utils/labels";
import type { Appointment, AppointmentStatus, QueueTicket } from "@/types";

const CHECKED: AppointmentStatus[] = ["CHECKED_IN", "IN_PROGRESS", "COMPLETED"];

export function ReceptionPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [day, setDay] = useState(todayKey());
  const [q, setQ] = useState(params.get("q") ?? "");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [target, setTarget] = useState<Appointment | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const [manual, setManual] = useState(false);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  // Tickets returned by the check-in API in this session (never fabricated).
  const [tickets, setTickets] = useState<Record<string, QueueTicket>>({});

  // Global search box in the header navigates here with ?q=
  const urlQ = params.get("q");
  useEffect(() => {
    if (urlQ !== null) setQ(urlQ);
  }, [urlQ]);

  const doctors = useAsync(listDoctors, []);
  const appts = useAsync(() => scanAppointments({ untilDay: day }), [day]);

  const docName = (id: string) => doctors.data?.find((d) => d.id === id)?.displayName ?? shortId(id);

  const dayItems = useMemo(
    () => (appts.data?.items ?? []).filter((a) => dayKey(a.startAt) === day),
    [appts.data, day],
  );
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return dayItems.filter(
      (a) =>
        (!t ||
          a.id.toLowerCase().includes(t) ||
          a.patientId.toLowerCase().includes(t) ||
          docName(a.doctorId).toLowerCase().includes(t)) &&
        (!status || a.status === status) &&
        (!mode || a.mode === mode),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayItems, q, status, mode, doctors.data]);

  const count = (...s: AppointmentStatus[]) => dayItems.filter((a) => s.includes(a.status)).length;
  const canCheckIn = (a: Appointment) => a.status === "CONFIRMED" && a.mode === "IN_PERSON";

  const doCheckIn = async (a: Appointment) => {
    if (busyIds.includes(a.id)) return; // prevents double submit
    setBusyIds((x) => [...x, a.id]);
    setError("");
    try {
      const ticket = await checkIn(a.id);
      setTickets((t) => ({ ...t, [a.id]: ticket }));
      toast.success(`Check-in thành công. Số thứ tự: Q-${String(ticket.position).padStart(3, "0")}.`);
      setTarget(null);
      setManual(false);
      appts.reload();
    } catch (e) {
      setError(errorMessage(e));
      if ((e as { status?: number }).status === 409) appts.reload(); // state changed elsewhere
    } finally {
      setBusyIds((x) => x.filter((i) => i !== a.id));
    }
  };

  const setSearch = (v: string) => {
    setQ(v);
    const next = new URLSearchParams(params);
    if (v) next.set("q", v);
    else next.delete("q");
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHead
        eyebrow="LỄ TÂN / VẬN HÀNH"
        title="Tiếp đón & check-in"
        actions={
          <button
            className="btn primary"
            disabled={!config.backend.checkin}
            title={!config.backend.checkin ? "Chờ backend bổ sung API check-in" : undefined}
            onClick={() => {
              setError("");
              setManual(true);
            }}
          >
            Check-in theo mã lịch
          </button>
        }
      />
      <PendingBackend
        feature="checkin"
        title="Check-in chưa kết nối backend"
        endpoints={["POST /api/appointments/{appointmentId}/check-in (header Idempotency-Key) → QueueTicket {id, appointmentId, position, status}"]}
      />
      <div className="notice">
        Backend chỉ trả <b>mã bệnh nhân (UUID)</b>, chưa có tên/số điện thoại. Tìm kiếm hiện hỗ trợ mã lịch,
        mã bệnh nhân và tên bác sĩ. Tra cứu theo tên/SĐT cần backend bổ sung <code>GET /api/patients?search=</code>.
      </div>

      <div className="metrics">
        <Metric label="Lịch trong ngày" value={appts.loading ? "…" : dayItems.length} hint="Tất cả hình thức" />
        <Metric label="Đã check-in" icon="✓" value={appts.loading ? "…" : count(...CHECKED)} hint={dayItems.length ? `${Math.round((count(...CHECKED) / dayItems.length) * 100)}% tổng lịch` : undefined} />
        <Metric label="Chưa đến" icon="◷" tone="amber" value={appts.loading ? "…" : count("CONFIRMED")} hint="Trạng thái đã xác nhận" />
        <Metric label="Hủy / vắng" icon="✕" tone="red" value={appts.loading ? "…" : count("CANCELLED", "NO_SHOW")} hint="Cần theo dõi" />
      </div>

      <Panel>
        <div className="filters">
          <input
            className="field grow"
            placeholder="Mã lịch, mã bệnh nhân hoặc tên bác sĩ…"
            value={q}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm lịch hẹn"
          />
          <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Trạng thái">
            <option value="">Tất cả trạng thái</option>
            {(Object.keys(APPOINTMENT_STATUS) as AppointmentStatus[]).map((s) => (
              <option key={s} value={s}>
                {APPOINTMENT_STATUS[s].label}
              </option>
            ))}
          </select>
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Hình thức">
            <option value="">Mọi hình thức</option>
            <option value="IN_PERSON">Trực tiếp</option>
            <option value="REMOTE">Từ xa</option>
          </select>
          <button className="btn" onClick={() => setDay(addDays(day, -1))} aria-label="Ngày trước">
            ←
          </button>
          <input className="field" type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} aria-label="Ngày" />
          <button className="btn" onClick={() => setDay(addDays(day, 1))} aria-label="Ngày sau">
            →
          </button>
          <button className="btn" onClick={() => setDay(todayKey())}>
            Hôm nay
          </button>
          <button className="btn" onClick={appts.reload}>
            ↻ Làm mới
          </button>
        </div>
        <AsyncBlock
          loading={appts.loading}
          error={appts.error}
          onRetry={appts.reload}
          empty={rows.length === 0}
          emptyText={dayItems.length === 0 ? "Không có lịch hẹn trong ngày này." : "Không có lịch khớp bộ lọc."}
        >
          {appts.data?.truncated && <div className="notice warn">Danh sách có thể chưa đầy đủ (đã đạt giới hạn số trang).</div>}
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Bệnh nhân</th>
                  <th>Mã lịch</th>
                  <th>Giờ</th>
                  <th>Bác sĩ</th>
                  <th>Hình thức</th>
                  <th>Trạng thái</th>
                  <th>Số thứ tự</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const st = APPOINTMENT_STATUS[a.status];
                  const t = tickets[a.id];
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="person">
                          <div className="miniavatar">{initials(a.patientId.replace(/-/g, "").slice(0, 2))}</div>
                          <div>
                            <b>BN {shortId(a.patientId)}</b>
                            <small>Chưa có tên (backend)</small>
                          </div>
                        </div>
                      </td>
                      <td className="audit-code">{shortId(a.id)}</td>
                      <td>
                        {formatTime(a.startAt)}–{formatTime(a.endAt)}
                      </td>
                      <td>{docName(a.doctorId)}</td>
                      <td>{MODE_LABEL[a.mode] ?? a.mode}</td>
                      <td>
                        <Pill tone={st?.tone}>{st?.label ?? a.status}</Pill>
                      </td>
                      <td>{t ? <b>Q-{String(t.position).padStart(3, "0")}</b> : "—"}</td>
                      <td>
                        <div className="row">
                          <button className="btn" onClick={() => setDetail(a)}>
                            Xem
                          </button>
                          {canCheckIn(a) ? (
                            <button
                              className="btn primary"
                              disabled={!config.backend.checkin || busyIds.includes(a.id)}
                              title={!config.backend.checkin ? "Chờ backend bổ sung API check-in" : undefined}
                              onClick={() => {
                                setError("");
                                setTarget(a);
                              }}
                            >
                              {busyIds.includes(a.id) ? "Đang xử lý…" : "Check-in"}
                            </button>
                          ) : (
                            <button className="btn" disabled>
                              {CHECKED.includes(a.status)
                                ? "Đã check-in"
                                : a.mode === "REMOTE" && a.status === "CONFIRMED"
                                  ? "Khám từ xa"
                                  : st?.label}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </AsyncBlock>
      </Panel>

      {target && (
        <ConfirmDialog
          title="Xác nhận check-in"
          confirmLabel="Check-in"
          busy={busyIds.includes(target.id)}
          error={error}
          onConfirm={() => void doCheckIn(target)}
          onCancel={() => setTarget(null)}
          message={
            <>
              Check-in lịch <b>{shortId(target.id)}</b> lúc <b>{formatTime(target.startAt)}</b> với{" "}
              <b>{docName(target.doctorId)}</b>? Hệ thống sẽ cấp số thứ tự trong hàng đợi.
            </>
          }
        />
      )}

      {manual && (
        <ManualCheckIn
          error={error}
          busy={busyIds.length > 0}
          onClose={() => setManual(false)}
          onSubmit={(id) => doCheckIn({ id } as Appointment)}
        />
      )}

      {detail && (
        <Modal title="Thông tin lịch hẹn" onClose={() => setDetail(null)} footer={<button className="btn" onClick={() => setDetail(null)}>Đóng</button>}>
          <DetailList
            rows={[
              ["Mã lịch", <code key="a">{detail.id}</code>],
              ["Mã bệnh nhân", <code key="b">{detail.patientId}</code>],
              ["Bác sĩ", docName(detail.doctorId)],
              ["Bắt đầu", formatDateTime(detail.startAt)],
              ["Kết thúc", formatDateTime(detail.endAt)],
              ["Hình thức", MODE_LABEL[detail.mode] ?? detail.mode],
              ["Trạng thái", APPOINTMENT_STATUS[detail.status]?.label ?? detail.status],
              ["Phiên bản", String(detail.version)],
              ["Lý do hủy", detail.cancellationReason],
            ]}
          />
        </Modal>
      )}
    </>
  );
}

function ManualCheckIn({
  error,
  busy,
  onClose,
  onSubmit,
}: {
  error: string;
  busy: boolean;
  onClose: () => void;
  onSubmit: (id: string) => void;
}) {
  const [id, setId] = useState("");
  const [fieldError, setFieldError] = useState("");
  return (
    <Modal
      title="Check-in theo mã lịch"
      description="Nhập mã lịch hẹn (UUID) khi lịch không hiển thị trong danh sách ngày đang xem."
      onClose={busy ? () => undefined : onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Hủy
          </button>
          <button
            className="btn primary"
            disabled={busy}
            onClick={() => {
              if (!UUID_RE.test(id.trim())) return setFieldError("Nhập đúng mã lịch (UUID).");
              setFieldError("");
              onSubmit(id.trim());
            }}
          >
            {busy ? "Đang xử lý…" : "Check-in"}
          </button>
        </>
      }
    >
      <Field label="Mã lịch hẹn *" error={fieldError}>
        <input className="field" value={id} onChange={(e) => setId(e.target.value)} autoFocus />
      </Field>
      {error && (
        <div className="notice errbox" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
