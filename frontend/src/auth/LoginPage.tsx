import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useSession } from "@/core/session";
import { FullPageMessage } from "@/ui";

// Thông tin đăng nhập chỉ nhập ở trang Keycloak; ứng dụng không bao giờ thấy mật khẩu.
export function LoginPage() {
  const { status, error, login, retry } = useSession();
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
      text={error || (loggedOut ? "Bạn đã đăng xuất khỏi ClinicCare." : "Đang mở trang đăng nhập…")}
      error={!!error}
      busy={!error && !loggedOut}
      action={{ label: "Đăng nhập", onClick: () => login("/") }}
    >
      {status === "error" && (
        <button className="btn block" onClick={retry}>
          Thử lại
        </button>
      )}
    </FullPageMessage>
  );
}

export function CallbackPage() {
  return <FullPageMessage text="Đang hoàn tất đăng nhập…" busy />;
}
