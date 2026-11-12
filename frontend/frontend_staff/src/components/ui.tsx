import { useEffect, type ReactNode } from "react";
import type { Tone } from "@/utils/labels";
import { config, type BackendFeature } from "@/config";

export function PageHead({
  eyebrow,
  title,
  actions,
}: {
  eyebrow: string;
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {actions && <div className="row">{actions}</div>}
    </div>
  );
}

export function Pill({ tone = "", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={("pill " + tone).trim()}>{children}</span>;
}

export function Metric({
  label,
  value,
  hint,
  icon = "▣",
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: "green" | "amber" | "red" | "purple";
}) {
  const color = { green: "#14866d", amber: "#a76508", red: "#bd3347", purple: "#7050b9" }[tone ?? "green"];
  const bg = { green: "#e7f8f1", amber: "#fff4df", red: "#ffedf0", purple: "#f0eaff" }[tone ?? "green"];
  return (
    <div className="metric">
      <div className="label">
        {label}
        <span className="mi" style={tone ? { background: bg, color } : undefined}>
          {icon}
        </span>
      </div>
      <div className="value">{value}</div>
      {hint && (
        <div className="hint" style={{ color: tone ? color : "#718096" }}>
          {hint}
        </div>
      )}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  actions,
  children,
}: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="panel">
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
    </div>
  );
}

/** Loading / error / empty states for a data region. */
export function AsyncBlock({
  loading,
  error,
  onRetry,
  empty,
  emptyText = "Không có dữ liệu.",
  children,
}: {
  loading: boolean;
  error: string;
  onRetry?: () => void;
  empty?: boolean;
  emptyText?: string;
  children: ReactNode;
}) {
  if (loading) return <div className="empty" role="status">Đang tải dữ liệu…</div>;
  if (error)
    return (
      <div className="notice errbox" role="alert">
        {error}{" "}
        {onRetry && (
          <button className="btn" onClick={onRetry} style={{ marginLeft: 8 }}>
            Thử lại
          </button>
        )}
      </div>
    );
  if (empty) return <div className="empty">{emptyText}</div>;
  return <>{children}</>;
}

export function Modal({
  title,
  description,
  onClose,
  footer,
  wide,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  wide?: boolean;
  children?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="modalback show" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
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
  onConfirm,
  onCancel,
  children,
}: {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
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
            className={"btn " + (danger ? "danger" : "primary")}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Đang xử lý…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="modal-msg">{message}</div>
      {children}
      {error && (
        <div className="notice errbox" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="formfield">
      <label>{label}</label>
      {children}
      {hint && !error && <div className="muted" style={{ marginTop: 4 }}>{hint}</div>}
      {error && (
        <div className="field-error" role="alert">
          {error}
        </div>
      )}
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
    <div className="row" style={{ justifyContent: "space-between", marginTop: 14 }}>
      <span className="muted">
        {total} kết quả · Trang {Math.min(page + 1, Math.max(pageCount, 1))}/{Math.max(pageCount, 1)}
      </span>
      <div className="row">
        <button className="btn" disabled={page <= 0} onClick={() => onPage(page - 1)}>
          ← Trước
        </button>
        <button className="btn" disabled={page + 1 >= pageCount} onClick={() => onPage(page + 1)}>
          Sau →
        </button>
      </div>
    </div>
  );
}

/** Banner for features whose backend endpoints do not exist yet. */
export function PendingBackend({
  feature,
  title,
  endpoints,
}: {
  feature: BackendFeature;
  title: string;
  endpoints: string[];
}) {
  if (config.backend[feature]) return null;
  return (
    <div className="notice warn" role="status">
      <b>⚠ {title}</b> — Backend hiện chưa có API này nên thao tác chưa thể kết nối; giao diện không
      giả lập dữ liệu hay kết quả. Backend cần bổ sung:
      <ul className="endpoint-list">
        {endpoints.map((e) => (
          <li key={e}>
            <code>{e}</code>
          </li>
        ))}
      </ul>
      Sau khi triển khai, đặt <code>VITE_BACKEND_{feature.toUpperCase()}=true</code> trong <code>.env</code>.
    </div>
  );
}
