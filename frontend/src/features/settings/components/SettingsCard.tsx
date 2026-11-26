import type { ReactNode } from "react";

/** Khung Card dùng chung cho từng nhóm cài đặt (tái sử dụng lớp `.panel` của Design System). */
export function SettingsCard({
  id,
  icon,
  title,
  description,
  className,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={"panel settings-card" + (className ? " " + className : "")} aria-labelledby={`${id}-title`}>
      <div className="settings-card-head">
        <span className="settings-card-icon" aria-hidden>
          {icon}
        </span>
        <div>
          <h2 id={`${id}-title`}>{title}</h2>
          <p className="muted">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** Lưới các lựa chọn dạng radio (một lựa chọn duy nhất). */
export function OptionGroup<T extends string>({
  labelledBy,
  value,
  options,
  onChange,
  columns,
}: {
  labelledBy: string;
  value: T;
  options: { value: T; icon?: ReactNode; label: string; hint?: string; sample?: ReactNode }[];
  onChange: (v: T) => void;
  columns?: number;
}) {
  return (
    <div
      className={"pref-options" + (columns ? ` cols-${columns}` : "")}
      role="radiogroup"
      aria-labelledby={labelledBy}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            className={"pref-option" + (on ? " on" : "")}
            onClick={() => onChange(o.value)}
          >
            {o.icon && (
              <span className="pref-option-icon" aria-hidden>
                {o.icon}
              </span>
            )}
            <span className="pref-option-text">
              <b>{o.label}</b>
              {o.hint && <small>{o.hint}</small>}
              {o.sample}
            </span>
            <span className="pref-option-mark" aria-hidden>
              {on ? "●" : "○"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
