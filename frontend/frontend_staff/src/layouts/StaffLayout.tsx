import { useState, type FormEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStaffAuth, useOidcUser } from "@/auth/AuthProvider";
import { NAV_ITEMS } from "./nav";
import { ROLE_LABEL, initials } from "@/utils/labels";

export function StaffLayout() {
  const { roles, can, logout } = useStaffAuth();
  const profile = useOidcUser();
  const location = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const items = NAV_ITEMS.filter((i) => can(i.permission));
  const sections = [...new Set(items.map((i) => i.section))];
  const current = NAV_ITEMS.find((i) =>
    i.path === "/" ? location.pathname === "/" : location.pathname.startsWith(i.path),
  );

  const name =
    (profile?.name as string | undefined) ||
    (profile?.preferred_username as string | undefined) ||
    "Nhân viên";
  const roleText = roles
    .filter((r) => r !== "PATIENT" && r !== "DOCTOR")
    .map((r) => ROLE_LABEL[r])
    .join(", ");

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(`/reception?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className="app">
      <aside className="side" aria-label="Điều hướng chính">
        <Link to="/" className="brand">
          <div className="logo">✚</div>
          <span>
            ClinicCare<span style={{ color: "#80a7ff" }}>.</span>
          </span>
        </Link>
        {sections.map((section) => (
          <div key={section}>
            <div className="nav-label">{section}</div>
            {items
              .filter((i) => i.section === section)
              .map((i) => (
                <NavLink
                  key={i.path}
                  to={i.path}
                  end={i.path === "/"}
                  title={i.label}
                  className={({ isActive }) => "nav" + (isActive ? " active" : "")}
                >
                  <span className="ni">{i.icon}</span>
                  <span>{i.label}</span>
                </NavLink>
              ))}
          </div>
        ))}
        <div className="profile">
          <div className="avatar">{initials(name)}</div>
          <div>
            <b>{name}</b>
            <small>{roleText || "—"}</small>
          </div>
          <button className="logout-mini" onClick={logout}>
            Thoát
          </button>
        </div>
      </aside>
      <main className="main">
        <header className="top">
          <div className="crumb">
            ClinicCare / <b>{current?.label ?? "Không tìm thấy"}</b>
          </div>
          <div className="topright">
            {can("checkin.perform") && (
              <form onSubmit={onSearch} role="search">
                <input
                  className="quick"
                  placeholder="⌕  Tìm lịch hẹn, bệnh nhân…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  aria-label="Tìm kiếm lịch hẹn"
                />
              </form>
            )}
            {can("notifications.view") && (
              <Link className="btn" to="/notifications" title="Thông báo">
                ✉
              </Link>
            )}
            <div className="avatar">{initials(name)}</div>
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
