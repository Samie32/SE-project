import { useEffect, useRef, useState } from "react";
import { useAuth } from "react-oidc-context";
import { Button, ErrorBox, Logo } from "./ui";

// The branded username/password form is served by Keycloak. Go straight to it.
export function LoginGate() {
  const auth = useAuth();
  const started = useRef(false);
  const [error, setError] = useState("");
  const login = () => {
    setError("");
    void auth.signinRedirect().catch(() => {
      setError(
        "Không mở được trang đăng nhập. Vui lòng kiểm tra dịch vụ và thử lại.",
      );
    });
  };
  useEffect(() => {
    if (started.current || auth.isLoading || auth.activeNavigator || auth.error)
      return;
    started.current = true;
    login();
  }, [auth.isLoading, auth.activeNavigator, auth.error]);
  return (
    <div className="login-transition">
      <Logo />
      {error || auth.error ? (
        <>
          <ErrorBox
            error={error || "Đăng nhập chưa thành công. Vui lòng thử lại."}
          />
          <Button onClick={login}>Thử lại</Button>
        </>
      ) : (
        <p role="status">Đang mở trang đăng nhập…</p>
      )}
    </div>
  );
}
