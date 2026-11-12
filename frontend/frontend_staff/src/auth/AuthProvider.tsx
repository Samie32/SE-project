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
import { config } from "@/config";
import { setTokenGetter, UNAUTHORIZED_EVENT, errorMessage } from "@/api/client";
import { getMe } from "@/api/authApi";
import { hasPermission, type Permission } from "./permissions";
import type { Identity, Role } from "@/types";

type Status = "anonymous" | "loading" | "ready" | "error";

interface StaffAuth {
  status: Status;
  error: string;
  /** From GET /api/me (database roles), kept in memory only. */
  identity: Identity | null;
  roles: Role[];
  can: (permission: Permission) => boolean;
  login: (returnTo?: string) => void;
  logout: () => void;
  retry: () => void;
}

const Ctx = createContext<StaffAuth | null>(null);

// In-memory store: tokens/user are never written to localStorage/sessionStorage.
const userStore = new WebStorageStateStore({ store: new InMemoryWebStorage() });

/** Mounts react-oidc-context (Keycloak, Authorization Code + PKCE) inside the router. */
export function StaffAuthProvider({ children }: { children: ReactNode }) {
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
      automaticSilentRenew
      onSigninCallback={(user) => {
        const from = (user as unknown as { state?: { from?: string } } | undefined)?.state?.from;
        navigate(from && from.startsWith("/") ? from : "/", { replace: true });
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
  // Assigned during render so child effects (which run before parent effects)
  // already see the current token.
  setTokenGetter(() => userRef.current?.access_token ?? null);

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [state, setState] = useState<{ status: Status; error: string }>({
    status: "anonymous",
    error: "",
  });
  const [attempt, setAttempt] = useState(0);
  const token = auth.user?.access_token;
  const authenticated = auth.isAuthenticated;

  const login = useCallback(
    (returnTo?: string) => {
      void auth
        .signinRedirect({ state: { from: returnTo ?? "/" } })
        .catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [auth.signinRedirect],
  );

  // Fetch the authoritative identity/roles from the backend.
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
        setIdentity({ id: me.id, roles: me.roles ?? [] });
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
    // Re-fetch only when the identity (not every refreshed token) changes.
  }, [authenticated, auth.user?.profile?.sub, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expired / rejected token → start a new sign-in.
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
  // Derive status so there is no render where we are signed in but /me has not started
  // (that would look "anonymous" and trigger a second sign-in).
  let status: Status;
  if (auth.isLoading || auth.activeNavigator) status = "loading";
  else if (!authenticated) status = "anonymous";
  else status = state.status === "anonymous" ? "loading" : state.status;
  const value = useMemo<StaffAuth>(
    () => ({
      status,
      error: state.error || (auth.error ? "Đăng nhập chưa thành công. Vui lòng thử lại." : ""),
      identity,
      roles,
      can: (p) => hasPermission(roles, p),
      login,
      logout: () => {
        void auth.signoutRedirect().catch(() => auth.removeUser());
      },
      retry: () => setAttempt((n) => n + 1),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, auth.error, state.error, identity, login],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaffAuth(): StaffAuth {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStaffAuth must be used inside StaffAuthProvider");
  return v;
}

export function useOidcUser() {
  const auth = useAuth();
  return auth.user?.profile;
}
