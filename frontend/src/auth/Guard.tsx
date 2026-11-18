import { useEffect, useRef, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession } from "@/core/session";
import { homePath, type Permission } from "@/core/permissions";
import { FullPageMessage } from "@/ui";

/** Yêu cầu đã đăng nhập (+ quyền nếu có). Danh tính/vai trò lấy từ GET /api/me, không từ token. */
export function Guard({ permission, children }: { permission?: Permission; children: ReactNode }) {
  const { status, error, roles, can, login, retry, logout } = useSession();
  const location = useLocation();
  const started = useRef(false);

  useEffect(() => {
    if (status === "anonymous" && !error && !started.current) {
      started.current = true;
      login(location.pathname + location.search);
    }
  }, [status, error, login, location.pathname, location.search]);

  if (status === "loading" || (status === "anonymous" && !error)) return <FullPageMessage text="Đang xác thực…" busy />;
  if (status === "anonymous")
    return <FullPageMessage text={error} error action={{ label: "Đăng nhập lại", onClick: () => login(location.pathname) }} />;
  if (status === "error")
    return <FullPageMessage text={error || "Không tải được thông tin tài khoản."} error action={{ label: "Thử lại", onClick: retry }} />;
  if (roles.length === 0)
    return (
      <FullPageMessage
        error
        text="Tài khoản chưa được cấp vai trò nào trong hệ thống. Vui lòng liên hệ quản trị viên."
        action={{ label: "Đăng xuất", onClick: logout }}
      />
    );
  if (permission && !can(permission)) return <Forbidden />;
  return <>{children}</>;
}

/** Chỉ render con khi vai trò có quyền (UX). Backend vẫn kiểm tra. */
export function Can({ permission, children, fallback = null }: { permission: Permission; children: ReactNode; fallback?: ReactNode }) {
  const { can } = useSession();
  return <>{can(permission) ? children : fallback}</>;
}

export function Forbidden() {
  const { roles } = useSession();
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>403 — Không đủ quyền</h1>
      <p className="sub">Vai trò của tài khoản không được phép sử dụng chức năng này.</p>
      <a className="btn primary" href={homePath(roles)}>
        Về trang của tôi
      </a>
    </div>
  );
}

export function NotFound() {
  const { roles } = useSession();
  return (
    <div className="panel" style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}>
      <h1 style={{ marginTop: 0 }}>404 — Không tìm thấy trang</h1>
      <a className="btn primary" href={homePath(roles)}>
        Về trang của tôi
      </a>
    </div>
  );
}

/** "/" → trang đầu theo vai trò. */
export function HomeRedirect() {
  const { roles } = useSession();
  return <Navigate to={homePath(roles)} replace />;
}
