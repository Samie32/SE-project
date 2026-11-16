import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useSession } from "@/core/session";
import { useNow } from "@/core/useAsync";
import { formatDateTimeSec } from "@/core/datetime";
import { ROLE_LABEL, initials } from "@/core/labels";
import { Logo, MockBanner } from "@/ui";
import { ACCOUNT_ITEM, NAV_ITEMS } from "./nav";

export function AppShell() {
  const { roles, can, logout, displayName } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const now = useNow(1000);

  useEffect(() => setOpen(false), [pathname]);

  const items = NAV_ITEMS.filter((i) => can(i.permission));
  const sections = [...new Set(items.map((i) => i.section))];
  // Trang hiện tại: khớp đường dẫn dài nhất.
  const current = [...NAV_ITEMS, { ...ACCOUNT_ITEM, permission: "patient.portal" as const }]
    .filter((i) => (i.path === "/patient" || i.path === "/doctor" || i.path === "/staff" ? pathname === i.path : pathname.startsWith(i.path)))
    .sort((a, b) => b.path.length - a.path.length)[0];

  const roleText = roles.map((r) => ROLE_LABEL[r]).join(", ");

  return (
    <div className="app">
      <a className="skip" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <aside className={"side" + (open ? " open" : "")} aria-label="Điều hướng chính">
        <Link to="/" aria-label="ClinicCare — trang chính" style={{ textDecoration: "none" }}>
          <Logo />
        </Link>
        <nav>
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-label">{section}</div>
              {items
                .filter((i) => i.section === section)
                .map((i) => (
                  <NavLink key={i.path} to={i.path} end={i.end} className={({ isActive }) => "nav" + (isActive ? " active" : "")}>
                    <i.icon size={18} aria-hidden />
                    <span>{i.label}</span>
                  </NavLink>
                ))}
            </div>
          ))}
          <div className="nav-label">{ACCOUNT_ITEM.section}</div>
          <NavLink to={ACCOUNT_ITEM.path} className={({ isActive }) => "nav" + (isActive ? " active" : "")}>
            <ACCOUNT_ITEM.icon size={18} aria-hidden />
            <span>{ACCOUNT_ITEM.label}</span>
          </NavLink>
        </nav>
        <div className="profile">
          <span className="avatar">{initials(displayName)}</span>
          <div className="who">
            <b title={displayName}>{displayName}</b>
            <small>{roleText || "—"}</small>
          </div>
          <button className="logout-mini" onClick={logout} aria-label="Đăng xuất">
            <LogOut size={14} aria-hidden /> Thoát
          </button>
        </div>
      </aside>
      {open && <button className="scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <div className="main">
        <MockBanner />
        <header className="top">
          <div className="crumb">
            <button className="menu-btn" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu size={18} />
            </button>
            <span>ClinicCare</span>
            <span aria-hidden>/</span>
            <b>{current?.label ?? "Không tìm thấy"}</b>
          </div>
          <div className="topright">
            <div className="clock" title="Giờ phòng khám Asia/Ho_Chi_Minh">
              <i aria-hidden />
              <span>
                Giờ Việt Nam<b>{formatDateTimeSec(now.toISOString())}</b>
              </span>
            </div>
            <span className="pill info">
              <ShieldCheck size={13} aria-hidden /> {roles.length ? ROLE_LABEL[roles[0]] : "—"}
            </span>
          </div>
        </header>
        <main id="main-content" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
