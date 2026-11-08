import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { CalendarDays, Clock3, Stethoscope, X } from "lucide-react";
import type { Appointment, AppointmentStatus } from "../types";
import { toLocalDateShort, toLocalTime } from "./utils";
import { doctorName, usePortal } from "./data";
export function Logo() {
  return (
    <div className="logo">
      <span>
        <Stethoscope size={20} />
      </span>
      <b>
        Clinic<em>Care</em>
      </b>
    </div>
  );
}
export function Button({
  children,
  kind = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { kind?: string }) {
  return (
    <button
      type="button"
      {...props}
      className={"button " + kind + " " + (props.className || "")}
    >
      {children}
    </button>
  );
}
export function Heading({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <section className="heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </section>
  );
}
export const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: "Đã xác nhận",
  CHECKED_IN: "Đã check-in",
  IN_PROGRESS: "Đang khám",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Không đến",
};
export const modeLabel = (mode: string) =>
  mode === "REMOTE" ? "Khám từ xa" : "Khám trực tiếp";
export function StatusTag({ status }: { status: AppointmentStatus }) {
  const tone =
    status === "COMPLETED"
      ? "green"
      : ["CANCELLED", "NO_SHOW"].includes(status)
        ? "red"
        : status === "IN_PROGRESS"
          ? "purple"
          : "blue";
  return (
    <span className={"tag " + tone}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
export function AppointmentRow({
  item,
  actions,
}: {
  item: Appointment;
  actions?: ReactNode;
}) {
  const { doctors, specialties } = usePortal();
  const doctor = doctors.find((d) => d.id === item.doctorId);
  const spec = specialties
    .filter((s) =>
      doctors.some((d) => d.id === item.doctorId && d.specialtyId === s.id),
    )
    .map((s) => s.name)
    .join(", ");
  const date = toLocalDateShort(item.startAt);
  return (
    <div className="appointment">
      <span className="date">
        <b>{date.slice(0, 2)}</b>
        <small>THÁNG {date.slice(3, 5)}</small>
      </span>
      <div className="apt-main">
        <div>
          <b>{doctorName(doctor)}</b>
          <StatusTag status={item.status} />
        </div>
        <small>
          {spec || "Chuyên khoa"} ·{" "}
          <span title={item.id}>{item.id.slice(0, 8).toUpperCase()}</span>
        </small>
        <small className="mobile-time">
          {toLocalTime(item.startAt)} · {modeLabel(item.mode)}
        </small>
      </div>
      <div className="apt-time">
        <Clock3 />
        <span>
          <b>{toLocalTime(item.startAt)}</b>
          <small>{modeLabel(item.mode)}</small>
        </span>
      </div>
      {actions}
    </div>
  );
}
export function Empty({ title, text }: { title: string; text?: string }) {
  return (
    <div className="empty">
      <CalendarDays />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: string;
  retry?: () => void;
}) {
  return (
    <div className="error" role="alert">
      {error}
      {retry && (
        <Button kind="secondary" onClick={retry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
  confirm,
  busy,
  disabled,
  danger,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  confirm: () => void;
  busy?: boolean;
  disabled?: boolean;
  danger?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
    >
      <button
        className="close"
        aria-label="Đóng"
        disabled={busy}
        onClick={close}
      >
        <X size={18} />
      </button>
      <h2>{title}</h2>
      <div>{children}</div>
      <footer>
        <Button kind="secondary" disabled={busy} onClick={close}>
          Quay lại
        </Button>
        <Button
          kind={danger ? "danger" : "primary"}
          disabled={disabled || busy}
          onClick={confirm}
        >
          {busy ? "Đang xử lý…" : "Xác nhận"}
        </Button>
      </footer>
    </dialog>
  );
}
