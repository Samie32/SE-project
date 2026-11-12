import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useStaffAuth } from "@/auth/AuthProvider";
import { FullPageMessage } from "@/components/FullPageMessage";

// Credentials are entered only on the Keycloak page; the app never sees passwords.
export function LoginPage() {
  const { status, error, login } = useStaffAuth();
  const [params] = useSearchParams();
  const loggedOut = params.get("loggedout") === "1";
  const started = useRef(false);

  useEffect(() => {
    if (status === "anonymous" && !loggedOut && !error && !started.current) {
      started.current = true;
      login("/");
    }
  }, [status, loggedOut, error, login]);

  if (status === "ready") return <Navigate to="/" replace />;
  if (status === "loading") return <FullPageMessage text="Đang xác thực…" busy />;
  return (
    <FullPageMessage
      text={
        error ||
        (loggedOut
          ? "Bạn đã đăng xuất khỏi khu vực nhân viên."
          : "Đang mở trang đăng nhập…")
      }
      error={!!error}
      busy={!error && !loggedOut}
      action={{ label: "Đăng nhập bằng Keycloak", onClick: () => login("/") }}
    >
      <div className="notice">
        🔒 Vai trò được xác định từ tài khoản sau khi xác thực, không chọn thủ công tại đây.
      </div>
    </FullPageMessage>
  );
}

export function CallbackPage() {
  return <FullPageMessage text="Đang hoàn tất đăng nhập…" busy />;
}
