import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Info, Inbox, Search, X, XCircle } from "lucide-react";
import logoIcon from "@/assets/logo-icon.png";
import { config, FEATURE_ENDPOINTS, FEATURE_LABEL, type BackendFeature } from "@/core/config";
import { APPOINTMENT_STATUS, initials, type Tone } from "@/core/labels";
import type { AppointmentStatus } from "@/core/types";

export function Logo({ dark }: { dark?: boolean }) {
  return (
    <div className="brand" style={dark ? { color: "#0f2c3f" } : undefined}>
      <span className="logo">
        <img src={logoIcon} alt="" className="logo-img" aria-hidden />
      </span>
      <span>
        Clinic<em>Care</em>
      </span>
    </div>
  );
}

export function PageHead({
  eyebrow,
  title,
  text,
  actions,
}: {
  eyebrow?: string;
  title: string;
  text?: ReactNode;
  actions?: ReactNode;
}) {
  const [topTarget, setTopTarget] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    setTopTarget(document.getElementById("top-page-title"));
  }, []);

  const hasBody = Boolean(eyebrow || text || actions);

  return (
    <>
      {topTarget && createPortal(<h1>{title}</h1>, topTarget)}
      {(!topTarget || hasBody) && (
        <div className="head">
          <div>
            {eyebrow && <div className="eyebrow">{eyebrow}</div>}
            {!topTarget && <h1>{title}</h1>}
            {text && <div className="sub">{text}</div>}
          </div>
          {actions && <div className="row">{actions}</div>}
        </div>
      )}
    </>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
  className,
}: {
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel" + (className ? " " + className : "")}>
      {(title || actions) && (
        <div className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "green" | "amber" | "red" | "purple";
}) {
  return (
    <div className="metric">
      <div className="label">
        {label}
        {icon && <span className={"mi " + (tone ?? "")}>{icon}</span>}
      </div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={("pill " + tone).trim()}>{children}</span>;
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  const s = APPOINTMENT_STATUS[status] ?? { label: status, tone: "" as Tone };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function Avatar({ name, mini }: { name: string; mini?: boolean }) {
  return <span className={mini ? "miniavatar" : "avatar"}>{initials(name)}</span>;
}

export function Empty({ title, text, icon }: { title: string; text?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="empty">
      {icon ?? <Inbox className="ic" aria-hidden />}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
    </div>
  );
}

export function Notice({
  tone = "info",
  children,
  actions,
}: {
  tone?: "info" | "warn" | "error" | "ok";
  children: ReactNode;
  actions?: ReactNode;
}) {
  const cls = { info: "", warn: " warn", error: " errbox", ok: " okbox" }[tone];
  const Icon = { info: Info, warn: AlertTriangle, error: XCircle, ok: CheckCircle2 }[tone];
  return (
    <div className={"notice" + cls} role={tone === "error" ? "alert" : "status"}>
      <Icon size={18} className="ic" aria-hidden />
      <div className="grow">{children}</div>
      {actions}
    </div>
  );
}

/** Trạng thái tải / lỗi / rỗng cho một vùng dữ liệu. */
export function AsyncBlock({
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = "Không có dữ liệu",
  emptyText,
  children,
}: {
  loading: boolean;
  error: string;
  onRetry?: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: ReactNode;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="empty" role="status" aria-busy="true">
        Đang tải dữ liệu…
      </div>
    );
  if (error)
    return (
      <Notice
        tone="error"
        actions={
          onRetry && (
            <button className="btn sm" onClick={onRetry}>
              Thử lại
            </button>
          )
        }
      >
        {error}
      </Notice>
    );
  if (empty) return <Empty title={emptyTitle} text={emptyText} />;
  return <>{children}</>;
}

export function useFeature(feature: BackendFeature) {
  return config.backend[feature];
}

/** Banner cho chức năng mà backend chưa có API: UI đầy đủ, thao tác bị khóa, không giả lập dữ liệu. */
export function PendingBackend({ feature, children }: { feature: BackendFeature; children?: ReactNode }) {
  if (config.backend[feature]) return null;
  return (
    <Notice tone="warn">
      <b>Chờ backend — {FEATURE_LABEL[feature]}.</b> API chưa được triển khai nên các thao tác bên dưới chưa thể kết
      nối; giao diện không giả lập dữ liệu hay kết quả. {children}
      <ul className="endpoint-list">
        {FEATURE_ENDPOINTS[feature].map((e) => (
          <li key={e}>
            <code>{e}</code>
          </li>
        ))}
      </ul>
      Sau khi backend triển khai, đặt <code>VITE_BACKEND_{feature.toUpperCase()}=true</code> trong <code>.env</code> rồi build lại.
    </Notice>
  );
}

export function MockBanner() {
  if (!config.mock) return null;
  return (
    <div
      role="note"
      style={{
        background: "#fff4df",
        color: "#7d5206",
        borderBottom: "1px solid #f1dcaa",
        padding: "6px 16px",
        fontSize: 13,
        textAlign: "center",
      }}
    >
      <b>CHẾ ĐỘ GIẢ LẬP</b> — dữ liệu và đăng nhập là giả lập trong trình duyệt, không kết nối backend thật.
    </div>
  );
}

// ---------------- Modal (quản lý focus, Esc, trả focus) ----------------
const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function Modal({
  title,
  description,
  onClose,
  footer,
  wide,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const first = node?.querySelector<HTMLElement>("input,select,textarea") ?? node?.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeRef.current();
      } else if (e.key === "Tab" && node) {
        const items = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (!items.length) return;
        const a = items[0];
        const z = items[items.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className="modalback" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={"modal" + (wide ? " wide" : "")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modalhead">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Đóng" title="Đóng">
            <X size={18} aria-hidden />
          </button>
        </div>
        {description && <p>{description}</p>}
        {children}
        {footer && <div className="modalfoot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Xác nhận",
  danger,
  busy,
  error,
  disabled,
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={busy ? () => undefined : onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel} disabled={busy}>
            Quay lại
          </button>
          <button
            className={"btn " + (danger ? "danger solid" : "primary")}
            onClick={onConfirm}
            disabled={busy || disabled}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      {message && <div className="modal-msg">{message}</div>}
      {children}
      {error && (
        <div style={{ marginTop: 12 }}>
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </Modal>
  );
}

export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={"formfield" + (className ? " " + className : "")}>
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children(id)}
      {hint && !error && <div className="muted" style={{ marginTop: 4 }}>{hint}</div>}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
}) {
  return (
    <div className="search">
      <Search size={16} aria-hidden />
      <input
        className="field"
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function DetailList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="detail">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Pager({
  page,
  pageCount,
  total,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  onPage: (p: number) => void;
}) {
  return (
    <div className="row between" style={{ marginTop: 14 }}>
      <span className="muted">
        {total} kết quả · Trang {Math.min(page + 1, Math.max(pageCount, 1))}/{Math.max(pageCount, 1)}
      </span>
      <div className="row">
        <button className="btn sm" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          ← Trước
        </button>
        <button className="btn sm" disabled={page + 1 >= pageCount} onClick={() => onPage(page + 1)}>
          Sau →
        </button>
      </div>
    </div>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {items.map((i) => (
        <button
          key={i.id}
          role="tab"
          aria-selected={value === i.id}
          className={value === i.id ? "on" : ""}
          onClick={() => onChange(i.id)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {items.map((i) => (
        <button key={i.id} type="button" aria-pressed={value === i.id} className={value === i.id ? "on" : ""} onClick={() => onChange(i.id)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

// ---------------- Toast ----------------
interface ToastItem {
  id: number;
  kind: "ok" | "err";
  text: string;
}
interface ToastApi {
  success: (t: string) => void;
  error: (t: string) => void;
}
const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const push = useCallback((kind: "ok" | "err", text: string) => {
    const id = ++seq.current;
    setItems((x) => [...x.slice(-3), { id, kind, text }]);
    window.setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 5000);
  }, []);
  const api = useMemo<ToastApi>(() => ({ success: (t) => push("ok", t), error: (t) => push("err", t) }), [push]);
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={"toast" + (i.kind === "err" ? " err" : "")} role={i.kind === "err" ? "alert" : "status"}>
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export function useToast(): ToastApi {
  const v = useContext(ToastCtx);
  if (!v) throw new Error("useToast phải nằm trong ToastProvider");
  return v;
}

export function FullPageMessage({
  text,
  busy,
  error,
  action,
  children,
}: {
  text: string;
  busy?: boolean;
  error?: boolean;
  action?: { label: string; onClick: () => void };
  children?: ReactNode;
}) {
  return (
    <div className="fullpage">
      <div className="loginbox">
        <Logo dark />
        <div className={"notice" + (error ? " errbox" : "")} role={error ? "alert" : "status"} aria-busy={busy}>
          <div className="grow">{text}</div>
        </div>
        {children}
        {action && (
          <button className="btn primary block" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
