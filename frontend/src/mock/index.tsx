import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { setFetchImpl, setTokenGetter, errorMessage } from "@/core/client";
import { SessionContext, getMe, type Session } from "@/core/session";
import { hasPermission, homePath } from "@/core/permissions";
import { useNavigate } from "react-router-dom";
import { ROLE_LABEL } from "@/core/labels";
import type { Identity } from "@/core/types";
import { Logo, MockBanner } from "@/ui";
import { getDb, resetDb } from "./db";
import { mockFetch } from "./server";

const SESSION_KEY = "clinic_mock_user";

export function installMock() {
  setFetchImpl(mockFetch);
  (window as unknown as { __clinicMockReset: () => void }).__clinicMockReset = () => {
    resetDb();
    sessionStorage.removeItem(SESSION_KEY);
    location.assign("/");
  };
}

/** Phiên giả lập: chọn tài khoản demo; vai trò vẫn lấy qua GET /api/me của backend giả lập. */
export function MockSessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(() => {
    try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
  });
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<Session["status"]>(userId ? "loading" : "anonymous");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) { setIdentity(null); setStatus("anonymous"); return; }
    setTokenGetter(() => "mock." + userId);
    let off = false;
    setStatus("loading");
    getMe().then((me) => { if (!off) { setIdentity(me); setStatus("ready"); setError(""); } })
      .catch((e) => { if (!off) { setError(errorMessage(e)); setStatus("error"); } });
    return () => { off = true; };
  }, [userId, attempt]);

  const choose = useCallback((id: string) => {
    const user = getDb().users.find(u => u.id === id);
    if (!user) return;
    navigate(homePath(user.roles), { replace: true });
    try { sessionStorage.setItem(SESSION_KEY, id); } catch { /* ignore */ }
    setUserId(id);
  }, [navigate]);
  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
    setTokenGetter(() => null);
    setUserId(null);
  }, []);

  const roles = identity?.roles ?? [];
  const displayName = getDb().users.find((u) => u.id === userId)?.name ?? "";
  const value = useMemo<Session>(() => ({
    status, error, identity, roles, displayName,
    can: (p) => hasPermission(roles, p),
    login: () => undefined, logout, retry: () => setAttempt((n) => n + 1),
  }), [status, error, identity, displayName, logout]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "anonymous") return <Picker onChoose={choose} />;
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function Picker({ onChoose }: { onChoose: (id: string) => void }) {
  const users = getDb().users;
  return (
    <>
      <MockBanner />
      <div className="fullpage">
        <div className="loginbox" style={{ width: "min(560px,100%)" }}>
          <Logo dark />
          <h1>Chọn tài khoản demo</h1>
          <p className="sub">Chế độ giả lập: không cần Keycloak/backend. Vai trò được lấy qua <code>GET /api/me</code> giả lập, đúng như bản thật.</p>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {users.map((u) => (
              <button key={u.id} className="listbtn" style={{ marginBottom: 0 }} onClick={() => onChoose(u.id)}>
                <span className="avatar">{u.name.split(" ").slice(-2).map((x) => x[0]).join("")}</span>
                <span className="grow">
                  <b>{u.name}</b>
                  <small>{u.roles.map((r) => ROLE_LABEL[r]).join(", ")} · {u.email}</small>
                </span>
              </button>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 14 }}>Dữ liệu lưu trong sessionStorage của tab. Đặt lại: chạy <code>__clinicMockReset()</code> trong console.</p>
        </div>
      </div>
    </>
  );
}
