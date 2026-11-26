import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useI18n } from "@/core/i18n";
import { useSession } from "@/core/session";
import { homePath, type Permission } from "@/core/permissions";
import { FullPageMessage } from "@/ui";

/** Yêu cầu đã đăng nhập (+ quyền nếu có). Danh tính/vai trò lấy từ GET /api/me, không từ token. */
export function Guard({ permission, children }: { permission?: Permission; children: ReactNode }) {
  const { status, error, roles, can, login, retry, logout } = useSession();
  const { t } = useI18n();
  const location = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (status === "anonymous" && !error && !started.current) {
      started.current = true;
      login(location.pathname + location.search);
    }
  }, [status, error, login, location.pathname, location.search]);

  if (status === "loading" || (status === "anonymous" && !error)) return <FullPageMessage text={t("auth.authenticating")} busy />;
  if (status === "anonymous")
    return <FullPageMessage text={error} error action={{ label: t("auth.signInAgain"), onClick: () => login(location.pathname) }} />;
  if (status === "error")
    return (
      <FullPageMessage
        title={t("auth.cannotAccessAccount")}
        text={error || t("auth.cannotLoadProfile")}
        error
        action={{ label: t("auth.retry"), onClick: retry }}
        secondaryAction={{ label: t("auth.signOutSwitch"), onClick: logout }}
      />
    );
  if (roles.length === 0)
    return (
      <FullPageMessage
        error
        text={t("auth.noRoles")}
        action={{ label: t("shell.logout"), onClick: logout }}
      />
    );
  if (permission && !can(permission)) {
    const fromSignin = Boolean((location.state as { fromSignin?: boolean } | null)?.fromSignin);
    if (fromSignin) return <Navigate to={homePath(roles)} replace />;
    return <Forbidden />;
  }
  return <>{children}</>;
}

/** Chỉ render con khi vai trò có quyền (UX). Backend vẫn kiểm tra. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(permission) ? children : fallback}</>;
}

export function Forbidden() {
  const { roles } = useSession();
  const { t } = useI18n();
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>{t("auth.forbiddenTitle")}</h1>
      <p className="sub">{t("auth.forbiddenText")}</p>
      <a className="btn primary" href={homePath(roles)}>
        {t("auth.backHome")}
      </a>
    </div>
  );
}

export function NotFound() {
  const { roles } = useSession();
  const { t } = useI18n();
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>{t("auth.notFoundTitle")}</h1>
      <a className="btn primary" href={homePath(roles)}>
        {t("auth.backHome")}
      </a>
    </div>
  );
}

/** "/" → trang đầu theo vai trò. */
export function HomeRedirect() {
  const { roles } = useSession();
  return <Navigate to={homePath(roles)} replace />;
}
