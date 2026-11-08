import { useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, Search, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  cancelAppointment,
  getSlots,
  rescheduleAppointment,
} from "../api/appointments";
import { ApiError } from "../api/client";
import type { Appointment, Slot } from "../types";
import { doctorName, message, usePortal } from "./data";
import {
  AppointmentRow,
  Button,
  Empty,
  ErrorBox,
  Heading,
  Modal,
  statusLabels,
} from "./ui";
import {
  canRescheduleOrCancel,
  mutationKey,
  todayLocalDate,
  toLocalDateShort,
  toLocalTime,
} from "./utils";
type Action = { kind: "cancel" | "reschedule"; item: Appointment };
export function Appointments({ now }: { now: Date }) {
  const go = useNavigate(),
    { appointments, doctors, specialties, reload } = usePortal();
  const [tab, setTab] = useState("UPCOMING"),
    [search, setSearch] = useState(""),
    [mode, setMode] = useState("ALL");
  const [action, setAction] = useState<Action | null>(null),
    [notice, setNotice] = useState("");
  const shown = appointments.filter(
    (a) =>
      (tab === "ALL" ||
        (tab === "UPCOMING"
          ? ["CONFIRMED", "CHECKED_IN", "IN_PROGRESS"].includes(a.status)
          : a.status === tab)) &&
      (mode === "ALL" || a.mode === mode) &&
      [
        a.id,
        doctorName(doctors.find((d) => d.id === a.doctorId)),
        ...specialties
          .filter((s) =>
            doctors.some((d) => d.id === a.doctorId && d.specialtyId === s.id),
          )
          .map((s) => s.name),
      ]
        .join(" ")
        .toLocaleLowerCase("vi")
        .includes(search.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <Heading
        eyebrow="QUẢN LÝ LỊCH HẸN"
        title="Lịch khám của tôi"
        text="Theo dõi, đổi hoặc hủy lịch khám đã đặt."
        action={
          <Button onClick={() => go("/patient/booking")}>
            <Plus />
            Đặt lịch mới
          </Button>
        }
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
        </div>
      )}
      <section className="card apt-card">
        <div className="tabs">
          {[
            ["UPCOMING", "Đang theo dõi"],
            ["COMPLETED", "Đã hoàn tất"],
            ["CANCELLED", "Đã hủy"],
            ["ALL", "Tất cả"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <div>
            <Search />
            <input
              aria-label="Tìm lịch khám"
              placeholder="Tìm theo mã lịch, bác sĩ, chuyên khoa…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            aria-label="Lọc hình thức khám"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="ALL">Tất cả hình thức</option>
            <option value="IN_PERSON">Khám trực tiếp</option>
            <option value="REMOTE">Khám từ xa</option>
          </select>
          <Button kind="secondary" onClick={() => void reload()}>
            <RefreshCw />
            Làm mới
          </Button>
        </div>
        {shown.length ? (
          shown.map((a) => {
            const eligible =
              a.status === "CONFIRMED" && canRescheduleOrCancel(a.startAt);
            const roomTime =
              now.getTime() >= Date.parse(a.startAt) - 600000 &&
              now.getTime() < Date.parse(a.startAt) + 900000;
            return (
              <AppointmentRow
                key={a.id}
                item={a}
                actions={
                  <div className="apt-actions">
                    {a.mode === "REMOTE" &&
                      ["CONFIRMED", "IN_PROGRESS"].includes(a.status) && (
                        <Button
                          kind="secondary"
                          onClick={() =>
                            go("/patient/telehealth?appointmentId=" + a.id)
                          }
                        >
                          <Video />
                          {roomTime ? "Phòng chờ" : "Chi tiết từ xa"}
                        </Button>
                      )}
                    {eligible ? (
                      <>
                        <Button
                          kind="secondary"
                          onClick={() => {
                            setNotice("");
                            setAction({ kind: "reschedule", item: a });
                          }}
                        >
                          Đổi lịch
                        </Button>
                        <Button
                          kind="ghost"
                          onClick={() => {
                            setNotice("");
                            setAction({ kind: "cancel", item: a });
                          }}
                        >
                          Hủy
                        </Button>
                      </>
                    ) : a.status === "CONFIRMED" ? (
                      <small className="locked">
                        Đã khóa đổi/hủy (còn dưới 2 giờ)
                      </small>
                    ) : a.status === "COMPLETED" ? (
                      <Button
                        kind="secondary"
                        onClick={() => go("/patient/records")}
                      >
                        Xem hồ sơ
                      </Button>
                    ) : a.status === "CANCELLED" ? (
                      <small className="locked">{a.cancellationReason}</small>
                    ) : (
                      <small className="locked">{statusLabels[a.status]}</small>
                    )}
                  </div>
                }
              />
            );
          })
        ) : (
          <Empty
            title="Không có lịch khám phù hợp"
            text="Hãy thử thay đổi bộ lọc hoặc đặt lịch mới."
          />
        )}
      </section>
      {action && (
        <AppointmentAction
          key={action.item.id + action.kind}
          action={action}
          close={() => setAction(null)}
          completed={() => {
            setAction(null);
            setNotice(
              action.kind === "cancel"
                ? "Đã hủy lịch khám."
                : "Đổi lịch khám thành công.",
            );
            void reload();
          }}
        />
      )}
    </>
  );
}
function AppointmentAction({
  action,
  close,
  completed,
}: {
  action: Action;
  close: () => void;
  completed: () => void;
}) {
  const { item, kind } = action,
    { reload } = usePortal();
  const [reason, setReason] = useState(""),
    [date, setDate] = useState(todayLocalDate()),
    [slotId, setSlotId] = useState("");
  const [slots, setSlots] = useState<Slot[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [slotError, setSlotError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [stale, setStale] = useState(false),
    [uncertain, setUncertain] = useState(false);
  const key = useRef<{ fingerprint: string; key: string } | null>(null);
  useEffect(() => {
    if (kind !== "reschedule") return;
    let active = true;
    setSlotId("");
    setSlots([]);
    setSlotError("");
    if (!date) return;
    setLoading(true);
    getSlots({ date, doctorId: item.doctorId, mode: item.mode })
      .then((rows) => {
        if (active)
          setSlots(
            rows.filter((s) => s.id !== item.slotId && s.available !== false),
          );
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
  }, [date, item.doctorId, item.mode, item.slotId, kind, refresh]);
  const submit = async () => {
    if (busy || stale || !canRescheduleOrCancel(item.startAt)) {
      setError(
        "Lịch không còn đủ điều kiện đổi/hủy. Đóng cửa sổ và làm mới danh sách.",
      );
      return;
    }
    setBusy(true);
    setError("");
    const payload =
      kind === "cancel"
        ? { reason: reason.trim(), version: item.version }
        : { slotId, version: item.version };
    try {
      const idempotency = mutationKey(
        key,
        JSON.stringify({ id: item.id, kind, ...payload }),
      );
      if (kind === "cancel")
        await cancelAppointment(
          item.id,
          payload as { reason: string; version: number },
          idempotency,
        );
      else
        await rescheduleAppointment(
          item.id,
          payload as { slotId: string; version: number },
          idempotency,
        );
      completed();
    } catch (e) {
      setError(message(e));
      if (e instanceof ApiError && e.status === 409) {
        key.current = null;
        setUncertain(false);
        setStale(true);
        if (kind === "reschedule") setRefresh((v) => v + 1);
      } else
        setUncertain(
          !(e instanceof ApiError) || e.status === 0 || e.status >= 500,
        );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={kind === "cancel" ? "Hủy lịch khám?" : "Đổi lịch khám"}
      danger={kind === "cancel"}
      busy={busy}
      close={close}
      confirm={() => void submit()}
      disabled={
        stale || (kind === "cancel" ? !reason.trim() : !slotId || loading)
      }
    >
      <p>
        Lịch {item.id.slice(0, 8).toUpperCase()} · {toLocalTime(item.startAt)}{" "}
        ngày {toLocalDateShort(item.startAt)}
      </p>
      {error && <ErrorBox error={error} />}
      <fieldset disabled={busy || uncertain || stale} className="action-fields">
        {kind === "cancel" ? (
          <label className="textarea">
            Lý do hủy
            <textarea
              maxLength={1000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do hủy lịch…"
              required
            />
          </label>
        ) : (
          <>
            <label className="field-label">
              Ngày khám mới
              <input
                type="date"
                min={todayLocalDate()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            {loading ? (
              <p role="status">Đang tải khung giờ…</p>
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
              <p>Không có khung giờ trống. Hãy chọn ngày khác.</p>
            )}
          </>
        )}
      </fieldset>
      {uncertain && (
        <p>
          Chưa xác định kết quả. Xác nhận lại để gửi cùng yêu cầu một cách an
          toàn.
        </p>
      )}
      {stale && (
        <Button
          kind="secondary"
          onClick={() => {
            close();
            void reload();
          }}
        >
          Đóng và tải lại lịch
        </Button>
      )}
    </Modal>
  );
}
