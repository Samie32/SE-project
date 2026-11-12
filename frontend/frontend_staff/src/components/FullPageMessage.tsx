import type { ReactNode } from "react";

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
        <div className="brand">
          <div className="logo">✚</div>
          <span>
            ClinicCare<span style={{ color: "#3978f6" }}>.</span>
          </span>
        </div>
        <div
          className={error ? "notice errbox" : "notice"}
          role={error ? "alert" : "status"}
          aria-busy={busy}
        >
          {text}
        </div>
        {children}
        {action && (
          <button className="btn primary" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
