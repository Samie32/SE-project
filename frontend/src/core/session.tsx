import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { AuthProvider as OidcProvider, useAuth } from "react-oidc-context";
import { InMemoryWebStorage, WebStorageStateStore } from "oidc-client-ts";
import { config } from "./config";
import { api, errorMessage, setTokenGetter, UNAUTHORIZED_EVENT } from "./client";
import { hasPermission, type Permission } from "./permissions";
import type { Identity, Role } from "./types";

export type SessionStatus = "anonymous" | "loading" | "ready" | "error";

export interface Session {
  status: SessionStatus;
  error: string;
  /** Từ GET /api/me (vai trò lấy từ MySQL), chỉ giữ trong bộ nhớ. */
  identity: Identity | null;
  roles: Role[];
  displayName: string;
  can: (permission: Permission) => boolean;
  login: (returnTo?: string) => void;
  changePassword?: () => void;
  logout: () => void;
  retry: () => void;
}

export const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const v = useContext(SessionContext);
  if (!v) throw new Error("useSession phải nằm trong SessionProvider");
  return v;
}

export const getMe = () => api.get<Identity>("/me/profile");

// Kho trong bộ nhớ: token/user không bao giờ ghi vào localStorage/sessionStorage.
const userStore = new WebStorageStateStore({ store: new InMemoryWebStorage() });

/** Keycloak (Authorization Code + PKCE) – chỉ một provider cho mọi vai trò. */
export function OidcSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <OidcProvider
      authority={config.oidcAuthority}
      client_id={config.oidcClientId}
      redirect_uri={window.location.origin + "/callback"}
      post_logout_redirect_uri={window.location.origin + "/login?loggedout=1"}
      response_type="code"
      scope="openid profile email"
      userStore={userStore}
      requestTimeoutInSeconds={20}
      automaticSilentRenew
      onSigninCallback={(user) => {
        const from = (user as unknown as { state?: { from?: string } } | undefined)?.state?.from;
        navigate(from && from.startsWith("/") && from !== "/login" ? from : "/", {
          replace: true,
          state: { fromSignin: true },
        });
      }}
    >
      <IdentityLoader>{children}</IdentityLoader>
    </OidcProvider>
  );
}

function IdentityLoader({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const userRef = useRef(auth.user);
  userRef.current = auth.user;
  // Gán trong lúc render để effect của con (chạy trước effect của cha) đã thấy token hiện tại.
  setTokenGetter(() => userRef.current?.access_token ?? null);

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [state, setState] = useState<{ status: SessionStatus; error: string }>({
    status: "anonymous",
    error: "",
  });
  const [attempt, setAttempt] = useState(0);
  const token = auth.user?.access_token;
  const authenticated = auth.isAuthenticated;

  const login = useCallback(
    (returnTo?: string) => {
      void auth.signinRedirect({ state: { from: returnTo ?? "/" } }).catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.signinRedirect],
  );

  useEffect(() => {
    if (!authenticated || !token) {
      setIdentity(null);
      setState({ status: "anonymous", error: "" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading", error: "" });
    getMe()
      .then((me) => {
        if (cancelled) return;
        setIdentity({ ...me, roles: me.roles ?? [] });
        setState({ status: "ready", error: "" });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setIdentity(null);
        setState({ status: "error", error: errorMessage(e) });
      });
    return () => {
      cancelled = true;
    };
    // Chỉ tải lại khi danh tính đổi (không phải mỗi lần làm mới token).
  }, [authenticated, auth.user?.profile?.sub, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Token hết hạn / bị từ chối → đăng nhập lại.
  useEffect(() => {
    const relogin = () => {
      void auth.removeUser().finally(() => login(window.location.pathname));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, relogin);
    const offExpired = auth.events.addAccessTokenExpired(relogin);
    const offRenew = auth.events.addSilentRenewError(relogin);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, relogin);
      offExpired();
      offRenew();
    };
  }, [auth, login]);

  const roles = identity?.roles ?? [];
  let status: SessionStatus;
  if (auth.isLoading || auth.activeNavigator) status = "loading";
  else if (!authenticated) status = "anonymous";
  else status = state.status === "anonymous" ? "loading" : state.status;

  const profile = auth.user?.profile;
  const displayName =
    (profile?.name as string | undefined) ||
    (profile?.preferred_username as string | undefined) ||
    "Người dùng";

  const value = useMemo<Session>(
    () => ({
      status,
      error: state.error || (auth.error ? "Đăng nhập chưa thành công. Vui lòng thử lại." : ""),
      identity,
      roles,
      displayName,
      can: (p) => hasPermission(roles, p),
      login,
      changePassword: () => {
        void auth
          .signinRedirect({
            extraQueryParams: { kc_action: "UPDATE_PASSWORD" },
            state: { from: "/account" },
          })
          .catch(() => undefined);
      },
      logout: () => {
        void auth.signoutRedirect().catch(() => auth.removeUser());
      },
      retry: () => setAttempt((n) => n + 1),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, auth.error, state.error, identity, displayName, login],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
