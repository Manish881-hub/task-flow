import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../lib/auth";
import SearchPalette from "./SearchPalette";

export function LiveDot({ status }) {
  const on = status === "Live";
  const busy = status === "Reconnecting" || status === "Connecting";
  return (
    <span className="live-pill" role="status" aria-label={`Connection ${status}`}>
      <span className={`live-dot${on ? " on" : busy ? " busy" : ""}`} aria-hidden="true" />
      {status || "Closed"}
    </span>
  );
}

function SearchTrigger({ onActivate }) {
  return (
    <button type="button" className="search-trigger" onClick={onActivate} aria-label="Search tasks (Command K)">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="m21 21-4.34-4.34" />
        <circle cx="11" cy="11" r="8" />
      </svg>
      <span className="search-placeholder">Search</span>
      <span className="kbd-hints" aria-hidden="true">
        <kbd className="kbd">⌘</kbd>
        <kbd className="kbd">K</kbd>
      </span>
    </button>
  );
}

function AccountMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  const doLogout = useCallback(async () => {
    close();
    await logout();
    router.push("/login");
  }, [close, logout, router]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const initial = String(user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <div className="menu-wrap">
      <button
        type="button"
        className="account-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="avatar-sm" aria-hidden="true">{initial}</span>
        <span className="account-name">{user?.name || user?.email || "Account"}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`chevron${open ? " open" : ""}`}>
          <path d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open ? (
        <>
          <button type="button" className="menu-backdrop" aria-label="Close account menu" onClick={close} tabIndex={-1} />
          <div className="menu" role="menu" aria-label="Account">
            <div className="menu-head">
              <div className="menu-user">{user?.name || "User"}</div>
              <div className="menu-email">{user?.email || ""}</div>
            </div>
            <Link href="/dashboard" className="menu-item" role="menuitem" onClick={close}>Dashboard</Link>
            <Link href="/assigned" className="menu-item" role="menuitem" onClick={close}>Assigned to me</Link>
            <button type="button" className="menu-item" role="menuitem" onClick={doLogout}>Log out</button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function Navbar({ socketStatus }) {
  const { user, isAuthed, logout } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const isActive = (href) => router.pathname === href;

  // Command-K: open the global palette over live projects + tasks.
  const openPalette = useCallback(() => {
    setMobileOpen(false);
    setPaletteOpen(true);
  }, []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openPalette]);

  useEffect(() => {
    setMobileOpen(false);
  }, [router.pathname]);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <header className="header">
      <div className="container nav nav-or">
        <Link href={isAuthed ? "/dashboard" : "/"} className="brand brand-btn" aria-label="TaskFlow home">
          <span className="brand-mark" aria-hidden="true">T</span>
          <span className="brand-wordmark">TaskFlow</span>
        </Link>

        {isAuthed ? (
          <div className="nav-search">
            <SearchTrigger onActivate={openPalette} />
          </div>
        ) : null}

        <nav className="nav-links nav-desktop" aria-label="Primary">
          {socketStatus && isAuthed ? <LiveDot status={socketStatus} /> : null}
          {isAuthed ? (
            <>
              <Link href="/dashboard" className={`nav-link${isActive("/dashboard") ? " active" : ""}`}>
                Dashboard
              </Link>
              <Link href="/assigned" className={`nav-link${isActive("/assigned") ? " active" : ""}`}>
                Assigned
              </Link>
              <AccountMenu />
            </>
          ) : (
            <>
              <Link href="/login" className={`nav-link${isActive("/login") ? " active" : ""}`}>
                Log in
              </Link>
              <Link href="/signup" className="btn btn-accent btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>

        <div className="nav-mobile-toggle">
          {socketStatus && isAuthed ? <LiveDot status={socketStatus} /> : null}
          <button
            type="button"
            className="icon-btn"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setMobileOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="container">
          <nav className="mobile-panel" aria-label="Mobile">
            {isAuthed ? (
              <>
                <button type="button" className="mobile-item" onClick={openPalette}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                    <path d="m21 21-4.34-4.34" />
                    <circle cx="11" cy="11" r="8" />
                  </svg>
                  Search tasks
                  <span className="kbd-hints" aria-hidden="true">
                    <kbd className="kbd">⌘</kbd>
                    <kbd className="kbd">K</kbd>
                  </span>
                </button>
                <Link href="/dashboard" className={`mobile-item${isActive("/dashboard") ? " active" : ""}`}>Dashboard</Link>
                <Link href="/assigned" className={`mobile-item${isActive("/assigned") ? " active" : ""}`}>Assigned to me</Link>
                <div className="mobile-user">
                  <span className="avatar-sm" aria-hidden="true">
                    {String(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                  </span>
                  <span className="small"><strong>{user?.name || "User"}</strong> <span className="muted">{user?.email || ""}</span></span>
                </div>
                <button type="button" className="mobile-item" onClick={handleLogout}>Log out</button>
              </>
            ) : (
              <>
                <Link href="/login" className={`mobile-item${isActive("/login") ? " active" : ""}`}>Log in</Link>
                <Link href="/signup" className="btn btn-accent btn-block">Get started</Link>
              </>
            )}
          </nav>
        </div>
      ) : null}
      <SearchPalette open={paletteOpen} onClose={closePalette} />
    </header>
  );
}
