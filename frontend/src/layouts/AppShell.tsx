import { memo, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { useI18n } from "@/core/i18n";
import { useSession } from "@/core/session";
import { useNow } from "@/core/useAsync";
import { formatDateTimeSec } from "@/core/datetime";
import { ROLE_LABEL, initials } from "@/core/labels";
import { Logo, MockBanner, Modal, Notice } from "@/ui";
import { ACCOUNT_ITEM, NAV_ITEMS } from "./nav";

const DEFAULT_SIDE_W = 272;
const MIN_SIDE_W = 220;
const MAX_SIDE_W = 360;
const COLLAPSED_SIDE_W = 72;
const COLLAPSE_SNAP_W = 135;

/** Tick mỗi giây chỉ render lại đồng hồ, không render lại cả layout; ẩn khỏi trình đọc màn hình. */
const Clock = memo(function Clock() {
  const now = useNow(1000);
  const { t } = useI18n();
  return (
    <div className="clock" title={t("shell.clockTitle")} aria-hidden="true">
      <i />
      <b>{formatDateTimeSec(now.toISOString())}</b>
    </div>
  );
});

export function AppShell() {
  const { roles, can, logout, displayName } = useSession();
  const { t, tr } = useI18n();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("cc_side_collapsed") === "1");
  const [sideWidth, setSideWidth] = useState(() => {
    const saved = Number(localStorage.getItem("cc_side_w"));
    if (saved === 248) {
      localStorage.removeItem("cc_side_w");
      return DEFAULT_SIDE_W;
    }
    return Number.isFinite(saved) && saved >= MIN_SIDE_W && saved <= MAX_SIDE_W ? saved : DEFAULT_SIDE_W;
  });
  const [resizing, setResizing] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    setScrolled(false);
    if (typeof document !== "undefined") document.documentElement.scrollTop = 0;
  }, [pathname]);
  useEffect(() => {
    localStorage.setItem("cc_side_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  function startResize(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    setResizing(true);
    let lastW = sideWidth;
    const onMove = (ev: PointerEvent) => {
      if (ev.clientX < COLLAPSE_SNAP_W) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        lastW = Math.min(MAX_SIDE_W, Math.max(MIN_SIDE_W, Math.round(ev.clientX)));
        setSideWidth(lastW);
      }
    };
    const onUp = () => {
      setResizing(false);
      localStorage.setItem("cc_side_w", String(lastW));
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
        {t("shell.skipNav")}
      </a>
      <aside
        className={"side" + (open ? " open" : "") + (effectiveCollapsed ? " collapsed" : "")}
        aria-label={t("shell.mainNavAria")}
      >
        <div className="side-head">
          <Link to="/" aria-label={t("shell.homeAria")} style={{ textDecoration: "none", minWidth: 0 }}>
            <Logo />
          </Link>
          {!isPatientPortal && (
            <button
              type="button"
              className="side-toggle"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? t("shell.expand") : t("shell.collapse")}
              title={collapsed ? t("shell.expand") : t("shell.collapse")}
            >
              {collapsed ? <PanelLeftOpen size={16} aria-hidden /> : <PanelLeftClose size={16} aria-hidden />}
            </button>
          )}
        </div>
        <nav>
          {sections.map((section) => (
            <div key={section}>
              <div className="nav-label">{tr(`section.${section}`, section)}</div>
              {items
                .filter((i) => i.section === section)
                .map((i) => {
                  const label = tr(`nav.${i.path}`, i.label);
                  return (
                    <NavLink
                      key={i.path}
                      to={i.path}
                      end={i.end}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) => "nav" + (isActive ? " active" : "")}
                    >
                      <i.icon size={18} aria-hidden />
                      <span>{label}</span>
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="profile">
          <NavLink
            to={ACCOUNT_ITEM.path}
            className={({ isActive }) => "profile-link" + (isActive ? " active" : "")}
            aria-label={t("nav./account")}
            title={`${displayName} — ${t("nav./account")}`}
          >
            <span className="avatar">{initials(displayName)}</span>
            <span className="profile-name" title={displayName}>{displayName}</span>
          </NavLink>
          <button className="logout-mini" onClick={() => setConfirmLogout(true)} aria-label={t("shell.logout")} title={t("shell.logout")}>
            <LogOut size={15} aria-hidden />
          </button>
        </div>
        <div
          className="side-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("shell.resizeAria")}
          title={t("shell.resizeTitle")}
          onPointerDown={startResize}
          onDoubleClick={() => {
            setCollapsed(false);
            setSideWidth(DEFAULT_SIDE_W);
          }}
        />
      </aside>
      {open && <button className="scrim" aria-label={t("shell.closeMenu")} onClick={() => setOpen(false)} />}
      <div className="main">
        <MockBanner />
        <div className="main-stage">
          <header className={"top" + (scrolled ? " scrolled" : "")}>
            <div className="crumb">
              <button className="menu-btn" aria-label={t("shell.openMenu")} aria-expanded={open} onClick={() => setOpen(true)}>
                <Menu size={18} />
              </button>
              <div id="top-page-title" className="top-title" />
            </div>
            <div className="topright">
              <Clock />
              <span className="pill info">
                <ShieldCheck size={13} aria-hidden /> {roles.length ? tr(`role.${roles[0]}`, ROLE_LABEL[roles[0]]) : "—"}
              </span>
            </div>
          </header>
          <div
            ref={mainScrollRef}
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
          title={t("shell.logoutTitle")}
          onClose={() => setConfirmLogout(false)}
          footer={<>
            <button className="btn" onClick={() => setConfirmLogout(false)}>{t("shell.logoutStay")}</button>
            <button className="btn danger solid" onClick={() => { setConfirmLogout(false); logout(); }}>
              <LogOut size={15} aria-hidden /> {t("shell.logout")}
            </button>
          </>}
        >
          <div className="logout-modal">
            <div className="logout-account">
              <span className="avatar">{initials(displayName)}</span>
              <div className="logout-account-info">
                <b>{displayName}</b>
                <span>{roles.length ? tr(`role.${roles[0]}`, ROLE_LABEL[roles[0]]) : "—"}</span>
              </div>
            </div>
            <p className="logout-note">{t("shell.logoutNote")}</p>
            {/^\/(doctor|patient)\/telehealth(?:\/|$)/.test(pathname) && (
              <Notice tone="warn">
                <div>
                  <b>{t("shell.logoutCallTitle")}</b>
                  <div>{t("shell.logoutCallDesc")}</div>
                </div>
              </Notice>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
