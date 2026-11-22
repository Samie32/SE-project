import { memo, useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useSession } from "@/core/session";
import { useNow } from "@/core/useAsync";
import { formatDateTimeSec } from "@/core/datetime";
import { ROLE_LABEL, initials } from "@/core/labels";
import { Logo, MockBanner, Modal, Notice } from "@/ui";
import { ACCOUNT_ITEM, NAV_ITEMS } from "./nav";

const DEFAULT_SIDE_W = 248;
const MIN_SIDE_W = 200;
const MAX_SIDE_W = 360;
const COLLAPSED_SIDE_W = 72;
const COLLAPSE_SNAP_W = 135;

/** Tick mỗi giây chỉ render lại đồng hồ, không render lại cả layout; ẩn khỏi trình đọc màn hình. */
const Clock = memo(function Clock() {
  const now = useNow(1000);
  return (
    <div className="clock" title="Giờ Việt Nam (Asia/Ho_Chi_Minh)" aria-hidden="true">
      <i />
      <b>{formatDateTimeSec(now.toISOString())}</b>
    </div>
  );
});

export function AppShell() {
  const { roles, can, logout, displayName } = useSession();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cc_side_collapsed") === "1");
  const [sideWidth, setSideWidth] = useState(() => {
    const saved = Number(localStorage.getItem("cc_side_w"));
    return Number.isFinite(saved) && saved >= MIN_SIDE_W && saved <= MAX_SIDE_W ? saved : DEFAULT_SIDE_W;
  });
  const [resizing, setResizing] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    localStorage.setItem("cc_side_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);
  useEffect(() => {
    localStorage.setItem("cc_side_w", String(sideWidth));
  }, [sideWidth]);

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    setResizing(true);
    const onMove = (ev: PointerEvent) => {
      if (ev.clientX < COLLAPSE_SNAP_W) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setSideWidth(Math.min(MAX_SIDE_W, Math.max(MIN_SIDE_W, Math.round(ev.clientX))));
      }
    };
    const onUp = () => {
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  const items = NAV_ITEMS.filter((i) => can(i.permission));
  const sections = [...new Set(items.map((i) => i.section))];

  const isPatientPortal = pathname.startsWith("/patient");
  const effectiveCollapsed = isPatientPortal ? false : collapsed;
  const activeSideWidth = effectiveCollapsed ? COLLAPSED_SIDE_W : sideWidth;

  return (
    <div
      className={"app" + (resizing ? " resizing" : "")}
      style={{ "--side-w": `${activeSideWidth}px` } as CSSProperties}
    >
      <a className="skip" href="#main-content">
        Bỏ qua điều hướng
      </a>
      <aside
        className={"side" + (open ? " open" : "") + (effectiveCollapsed ? " collapsed" : "")}
        aria-label="Điều hướng chính"
      >
        <div className="side-head">
          <Link to="/" aria-label="ClinicCare — trang chính" style={{ textDecoration: "none", minWidth: 0 }}>
            <Logo />
          </Link>
          {!isPatientPortal && (
            <button
              type="button"
              className="side-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              title={collapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
            >
              {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
            </button>
          )}
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-label">{section}</div>
              {items
                .filter((i) => i.section === section)
                .map((i) => (
                  <NavLink
                    key={i.path}
                    to={i.path}
                    end={i.end}
                    title={collapsed ? i.label : undefined}
                    className={({ isActive }) => "nav" + (isActive ? " active" : "")}
                  >
                    <i.icon size={18} aria-hidden />
                    <span>{i.label}</span>
                  </NavLink>
                ))}
            </div>
          ))}
        </nav>
        <div className="profile">
          <NavLink
            to={ACCOUNT_ITEM.path}
            className={({ isActive }) => "profile-link" + (isActive ? " active" : "")}
            aria-label={ACCOUNT_ITEM.label}
            title={`${displayName} — ${ACCOUNT_ITEM.label}`}
          >
            <span className="avatar">{initials(displayName)}</span>
            <span className="profile-name" title={displayName}>{displayName}</span>
          </NavLink>
          <button className="logout-mini" onClick={() => setConfirmLogout(true)} aria-label="Đăng xuất" title="Đăng xuất">
            <LogOut size={15} aria-hidden />
          </button>
        </div>
        <div
          className="side-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="Kéo để thay đổi độ rộng thanh điều hướng"
          title="Kéo để thay đổi độ rộng (nhấp đúp để đặt lại)"
          onPointerDown={startResize}
          onDoubleClick={() => {
            setCollapsed(false);
            setSideWidth(DEFAULT_SIDE_W);
          }}
        />
      </aside>
      {open && <button className="scrim" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <div className="main">
        <MockBanner />
        <div className="main-stage">
          <header className={"top" + (scrolled ? " scrolled" : "")}>
            <div className="crumb">
              <button className="menu-btn" aria-label="Mở menu" aria-expanded={open} onClick={() => setOpen(true)}>
                <Menu size={18} />
              </button>
              <div id="top-page-title" className="top-title" />
            </div>
            <div className="topright">
              <Clock />
              <span className="pill info">
                <ShieldCheck size={13} aria-hidden /> {roles.length ? ROLE_LABEL[roles[0]] : "—"}
              </span>
            </div>
          </header>
          <div
            className="main-scroll"
            onScroll={(e) => {
              const isScrolled = e.currentTarget.scrollTop > 4;
              setScrolled((prev) => (prev === isScrolled ? prev : isScrolled));
            }}
          >
            <main id="main-content" className="content" tabIndex={-1}>
              <Outlet />
            </main>
          </div>
        </div>
      </div>
      {confirmLogout && (
        <Modal
          title="Xác nhận đăng xuất"
          onClose={() => setConfirmLogout(false)}
          footer={<>
            <button className="btn" onClick={() => setConfirmLogout(false)}>Ở lại</button>
            <button className="btn danger solid" onClick={() => { setConfirmLogout(false); logout(); }}>
              <LogOut size={15} aria-hidden /> Đăng xuất
            </button>
          </>}
        >
          <div className="logout-modal">
            <div className="logout-account">
              <span className="avatar">{initials(displayName)}</span>
              <div className="logout-account-info">
                <b>{displayName}</b>
                <span>{roles.length ? ROLE_LABEL[roles[0]] : "—"}</span>
              </div>
            </div>
            <p className="logout-note">Phiên làm việc hiện tại sẽ kết thúc và các thay đổi chưa lưu sẽ không được giữ lại.</p>
            {/^\/(doctor|patient)\/telehealth(?:\/|$)/.test(pathname) && (
              <Notice tone="warn">
                <div>
                  <b>Đang trong trang khám trực tuyến</b>
                  <div>Đăng xuất chỉ rời cuộc gọi trên thiết bị này, không tự kết thúc phiên khám. Bác sĩ cần chọn “Kết thúc phiên” để đóng phiên cho cả hai bên.</div>
                </div>
              </Notice>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
