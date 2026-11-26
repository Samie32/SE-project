import { useEffect, useRef } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useI18n } from "@/core/i18n";
import { useSession } from "@/core/session";
import { FullPageMessage } from "@/ui";

// Thông tin đăng nhập chỉ nhập ở trang Keycloak; ứng dụng không bao giờ thấy mật khẩu.
export function LoginPage() {
  const { status, error, login, retry } = useSession();
  const { t } = useI18n();
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
  if (status === "loading") return <FullPageMessage text={t("auth.authenticating")} busy />;
  if (loggedOut && !error) {
    return (
      <FullPageMessage
        title={t("auth.loggedOutTitle")}
        text={t("auth.loggedOutText")}
        action={{ label: t("auth.signInAgain"), onClick: () => login("/") }}
      />
    );
  }
  return (
    <FullPageMessage
      title={error ? t("auth.signInIncomplete") : undefined}
      text={error || t("auth.openingLogin")}
      error={!!error}
      busy={!error}
      action={{ label: t("auth.signIn"), onClick: () => login("/") }}
      secondaryAction={status === "error" ? { label: t("auth.retry"), onClick: retry } : undefined}
    />
  );
}

export function CallbackPage() {
  const { status, error, login, retry, logout } = useSession();
  const { t } = useI18n();

  if (status === "ready") return <Navigate to="/" replace />;
  if (status === "loading" && !error) {
    return <FullPageMessage text={t("auth.completingLogin")} busy />;
  }
  if (status === "error") {
    return (
      <FullPageMessage
        title={t("auth.cannotCompleteLogin")}
        text={error || t("auth.cannotLoadProfile")}
        error
        action={{ label: t("auth.retry"), onClick: retry }}
        secondaryAction={{ label: t("auth.signOutSwitch"), onClick: logout }}
      />
    );
  }
  return (
    <FullPageMessage
      text={error || t("auth.sessionInvalid")}
      error
      action={{ label: t("auth.signInAgain"), onClick: () => login("/") }}
    />
  );
}
