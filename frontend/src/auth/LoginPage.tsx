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
  if (loggedOut && !error) {
    return (
      <FullPageMessage
        title="Bạn đã đăng xuất"
        text="Phiên làm việc trên thiết bị này đã kết thúc an toàn. Bạn có thể đăng nhập lại bằng tài khoản bệnh nhân hoặc nhân sự phòng khám."
        action={{ label: "Đăng nhập lại", onClick: () => login("/") }}
      />
    );
  }
  return (
    <FullPageMessage
      title={error ? "Đăng nhập chưa hoàn tất" : undefined}
      text={error || "Đang mở trang đăng nhập…"}
      error={!!error}
      busy={!error}
      action={{ label: "Đăng nhập", onClick: () => login("/") }}
      secondaryAction={status === "error" ? { label: "Thử lại", onClick: retry } : undefined}
    />
  );
}

export function CallbackPage() {
  const { status, error, login, retry, logout } = useSession();

  if (status === "ready") return <Navigate to="/" replace />;
  if (status === "loading" && !error) {
    return <FullPageMessage text="Đang hoàn tất đăng nhập…" busy />;
  }
  if (status === "error") {
    return (
      <FullPageMessage
        title="Không thể hoàn tất đăng nhập"
        text={error || "Không tải được thông tin tài khoản."}
        error
        action={{ label: "Thử lại", onClick: retry }}
        secondaryAction={{ label: "Đăng xuất / Đổi tài khoản", onClick: logout }}
      />
    );
  }
  return (
    <FullPageMessage
      text={error || "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại."}
      error
      action={{ label: "Đăng nhập lại", onClick: () => login("/") }}
    />
  );
}
