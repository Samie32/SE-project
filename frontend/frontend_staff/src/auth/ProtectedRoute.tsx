import { useEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useStaffAuth } from "./AuthProvider";
import type { Permission } from "./permissions";
import { FullPageMessage } from "@/components/FullPageMessage";
import { ForbiddenPage } from "@/pages/ForbiddenPage";
import { WrongAreaPage } from "@/pages/WrongAreaPage";
import { STAFF_ROLES } from "@/types";

/**
 * Without `permission`: requires a signed-in user with at least one staff role
 * (ADMINISTRATOR / RECEPTIONIST / AUDITOR). With `permission`: also requires it.
 */
export function ProtectedRoute({
  permission,
  children,
}: {
  permission?: Permission;
  children: ReactNode;
}) {
  const { status, error, roles, can, login, retry } = useStaffAuth();
  const location = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (status === "anonymous" && !error && !started.current) {
      started.current = true;
      login(location.pathname + location.search);
    }
  }, [status, error, login, location.pathname, location.search]);

  if (status === "loading" || (status === "anonymous" && !error))
    return <FullPageMessage text="Đang xác thực…" busy />;
  if (status === "anonymous")
    return (
      <FullPageMessage
        text={error}
        error
        action={{ label: "Đăng nhập lại", onClick: () => login(location.pathname) }}
      />
    );
  if (status === "error")
    return (
      <FullPageMessage
        text={error || "Không tải được thông tin tài khoản."}
        error
        action={{ label: "Thử lại", onClick: retry }}
      />
    );
  if (!roles.some((r) => STAFF_ROLES.includes(r))) return <WrongAreaPage />;
  if (permission && !can(permission)) return <ForbiddenPage />;
  return <>{children}</>;
}
