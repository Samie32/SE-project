import { useEffect, useState } from "react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useAuth } from "react-oidc-context";
import {
  CalendarDays,
  Clock3,
  FileHeart,
  Home,
  LogOut,
  Menu,
  ShieldCheck,
  Video,
} from "lucide-react";
import { clearToken, setToken } from "./api/client";
import { PortalProvider, usePortal } from "./portal/data";
import { ErrorBox, Logo } from "./portal/ui";
import { isUpcoming, toLocalDisplay } from "./portal/utils";
import { LoginGate } from "./portal/LoginGate";
import { Dashboard } from "./portal/Dashboard";
import { Booking } from "./portal/Booking";
import { Appointments } from "./portal/Appointments";
import { Records, Telehealth } from "./portal/Pending";

const nav = [
  ["/patient", "Tổng quan", Home],
  ["/patient/booking", "Đặt lịch khám", CalendarDays],
  ["/patient/appointments", "Lịch khám của tôi", Clock3],
  ["/patient/records", "Hồ sơ & đơn thuốc", FileHeart],
  ["/patient/telehealth", "Khám từ xa", Video],
] as const;
function Shell() {
  const auth = useAuth(),
    go = useNavigate(),
    { pathname } = useLocation();
  const { appointments, profile, loading, error, reload } = usePortal();
  const [open, setOpen] = useState(false),
    [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const name = String(
    auth.user?.profile.name ||
      auth.user?.profile.preferred_username ||
      "Bệnh nhân",
  );
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const logout = async () => {
    clearToken();
    try {
      await auth.signoutRedirect();
    } catch {
      await auth.removeUser();
      go("/login", { replace: true });
    }
  };
  return (
    <div className="shell">
      <aside className={open ? "open" : ""}>
        <Logo />
        <p className="nav-label">CỔNG BỆNH NHÂN</p>
        <nav>
          {nav.map(([path, label, Icon], i) => (
            <NavLink
              key={path}
              end={i === 0}
              to={path}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {i === 2 && <b>{appointments.filter(isUpcoming).length}</b>}
            </NavLink>
          ))}
        </nav>
        <div className="help">
          <ShieldCheck size={18} />
          <span>
            <b>Quyền riêng tư</b>
            <small>Chỉ truy cập thông tin của bạn</small>
          </span>
        </div>
        <div className="profile">
          <span>{initials}</span>
          <div>
            <b>{name}</b>
            <small title={profile?.id}>
              {profile
                ? "BN-" + profile.id.slice(-8).toUpperCase()
                : "Bệnh nhân"}
            </small>
          </div>
          <button aria-label="Đăng xuất" onClick={() => void logout()}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          aria-label="Đóng menu"
          className="scrim"
          onClick={() => setOpen(false)}
        />
      )}
      <main>
        <header>
          <div className="breadcrumb">
            <button aria-label="Mở menu" onClick={() => setOpen(true)}>
              <Menu />
            </button>
            <span>Cổng bệnh nhân</span>
            <b>{nav.find(([p]) => p === pathname)?.[1] || "ClinicCare"}</b>
          </div>
          <div className="header-tools">
            <div className="system-time">
              <i />
              <span>
                Giờ Việt Nam<small>{toLocalDisplay(now.toISOString())}</small>
              </span>
            </div>
            <span className="avatar" title={name}>
              {initials}
            </span>
          </div>
        </header>
        <div className="content">
          {loading ? (
            <div className="card empty" role="status">
              Đang tải dữ liệu của bạn…
            </div>
          ) : error ? (
            <ErrorBox error={error} retry={() => void reload()} />
          ) : (
            <Routes>
              <Route
                path="/patient"
                element={<Dashboard name={name} now={now} />}
              />
              <Route path="/patient/booking" element={<Booking />} />
              <Route
                path="/patient/appointments"
                element={<Appointments now={now} />}
              />
              <Route path="/patient/records" element={<Records />} />
              <Route path="/patient/telehealth" element={<Telehealth />} />
              <Route path="*" element={<Navigate to="/patient" replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
}
export default function App() {
  const auth = useAuth();
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    const invalidate = () => {
      clearToken();
      setExpired(true);
      void auth.removeUser();
    };
    window.addEventListener("clinic:unauthorized", invalidate);
    const remove = auth.events.addAccessTokenExpired(invalidate);
    return () => {
      window.removeEventListener("clinic:unauthorized", invalidate);
      remove();
    };
  }, [auth.events, auth.removeUser]);
  // Synchronize before mounting children that fetch data.
  if (auth.isAuthenticated && auth.user && !auth.user.expired) {
    setToken(auth.user.access_token);
    return (
      <PortalProvider>
        <Shell />
      </PortalProvider>
    );
  }
  clearToken();
  if (auth.isLoading)
    return (
      <div className="empty" role="status">
        Đang xác thực tài khoản…
      </div>
    );
  return (
    <>
      {expired && (
        <div className="session-notice" role="status">
          Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.
        </div>
      )}
      <LoginGate />
    </>
  );
}
