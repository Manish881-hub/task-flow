import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { apiGet } from "../../lib/api";
import SearchPalette from "../SearchPalette";

/**
 * App rail: dark sidebar for authenticated pages. Only real destinations —
 * Dashboard, Assigned, project boards — plus live search and account menu.
 * No placeholder tabs: every item navigates somewhere that exists.
 */
export default function EfferdSidebar({ currentProjectId, socketStatus }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [wsOpen, setWsOpen] = useState(false);
  const [updateDismissed, setUpdateDismissed] = useState(false);
  const [projectsList, setProjectsList] = useState([]);
  const [assignedCount, setAssignedCount] = useState(null);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet("/api/v1/projects?per_page=10").catch(() => []),
      apiGet("/api/v1/assigned?per_page=100").catch(() => []),
    ]).then(([projData, assignedData]) => {
      if (cancelled) return;
      const pList = Array.isArray(projData) ? projData : [];
      const aList = Array.isArray(assignedData) ? assignedData : [];
      setProjectsList(pList);
      setAssignedCount(aList.filter((t) => t.status !== "Done").length);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!accountOpen && !wsOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setAccountOpen(false);
        setWsOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [accountOpen, wsOpen]);

  const handleLogout = useCallback(async () => {
    setAccountOpen(false);
    await logout();
    router.push("/login");
  }, [logout, router]);

  const isDashboardActive = router.pathname === "/dashboard";
  const isAssignedActive = router.pathname === "/assigned";
  const initial = String(user?.name || user?.email || "U").charAt(0).toUpperCase();

  return (
    <aside className={`efferd-sidebar${collapsed ? " collapsed" : ""}`} aria-label="App navigation">
      <div className="efferd-brand-row">
        <Link href="/dashboard" className="efferd-brand-link">
          <img src="/logo.png" alt="TaskFlow" width={30} height={30} className="efferd-brand-logo" />
          {!collapsed && <span className="efferd-brand-text">TaskFlow</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            className="efferd-trigger"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
        )}
      </div>
      {collapsed && (
        <button
          type="button"
          className="efferd-trigger efferd-trigger-rail"
          onClick={() => setCollapsed(false)}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}

      <div className="menu-wrap efferd-ws-wrap">
        <button
          type="button"
          className="efferd-ws-btn"
          aria-expanded={wsOpen}
          aria-haspopup="menu"
          aria-label="Workspace: TaskFlow"
          title={collapsed ? "Workspace: TaskFlow" : undefined}
          onClick={() => setWsOpen((o) => !o)}
        >
          <span className="efferd-ws-dot" aria-hidden="true">T</span>
          {!collapsed && (
            <>
              <span className="efferd-truncate efferd-ws-name">TaskFlow</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m7 15 5 5 5-5" />
                <path d="m7 9 5-5 5 5" />
              </svg>
            </>
          )}
        </button>
        {wsOpen && !collapsed && (
          <>
            <button type="button" className="menu-backdrop" aria-label="Close workspace menu" onClick={() => setWsOpen(false)} tabIndex={-1} />
            <div className="menu efferd-account-menu" role="menu" aria-label="Workspace">
              <div className="menu-head">
                <div className="menu-user">Workspace</div>
                <div className="menu-email">You are in your personal workspace</div>
              </div>
              <button type="button" className="menu-item" role="menuitemradio" aria-checked="true" onClick={() => setWsOpen(false)}>
                TaskFlow (current)
              </button>
            </div>
          </>
        )}
      </div>

      <nav aria-label="Primary" className="efferd-nav-primary">
        {!collapsed && <div className="efferd-menu-group-label">Workspace</div>}
        <ul className="efferd-menu-list">
          <li>
            <Link href="/dashboard" className={`efferd-menu-item${isDashboardActive ? " active" : ""}`}>
              <svg className="efferd-menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="7" height="7" x="3" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="3" rx="1" />
                <rect width="7" height="7" x="14" y="14" rx="1" />
                <rect width="7" height="7" x="3" y="14" rx="1" />
              </svg>
              {!collapsed && <span>Dashboard</span>}
            </Link>
          </li>
          <li>
            <Link href="/assigned" className={`efferd-menu-item${isAssignedActive ? " active" : ""}`}>
              <svg className="efferd-menu-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
              {!collapsed && (
                <span className="efferd-menu-label-row">
                  <span>Assigned to me</span>
                  {assignedCount !== null && assignedCount > 0 && (
                    <span className="efferd-count-badge">{assignedCount}</span>
                  )}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </nav>

      {projectsList.length > 0 && (
        <div className="efferd-projects-group">
          {!collapsed && <div className="efferd-menu-group-label">Projects</div>}
          <ul className="efferd-menu-list">
            {projectsList.slice(0, 5).map((p) => {
              const isActive = currentProjectId === String(p.id) || router.query.id === String(p.id);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className={`efferd-menu-item efferd-project-item${isActive ? " active" : ""}`}
                    title={p.name}
                  >
                    <span className="efferd-project-dot" aria-hidden="true">
                      {String(p.name || "?").charAt(0).toUpperCase()}
                    </span>
                    {!collapsed && <span className="efferd-truncate">{p.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="efferd-sidebar-foot">
        {collapsed ? (
          <span className="efferd-rail-center" role="status" aria-label={`Sync status ${socketStatus || "Connecting"}`}>
            <span className={`efferd-status-dot${socketStatus === "Live" ? " on" : ""}`} aria-hidden="true" />
          </span>
        ) : (
          <div className="efferd-status-card" role="status" aria-label={`Sync status ${socketStatus || "Connecting"}`}>
            <span className={`efferd-status-dot${socketStatus === "Live" ? " on" : ""}`} aria-hidden="true" />
            <span>
              <span className="efferd-status-title">Live sync</span>
              <span className="efferd-status-sub">{socketStatus || "Connecting"}</span>
            </span>
          </div>
        )}
        {!collapsed && !updateDismissed && (
          <div className="efferd-update-card">
            <span className="efferd-eyebrow">Update</span>
            <p className="efferd-update-title">What&apos;s new</p>
            <p className="efferd-update-desc">Latest updates and improvements.</p>
            <a
              href="https://github.com/Manish881-hub/task-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="efferd-update-link"
            >
              Learn more
            </a>
            <button
              type="button"
              className="efferd-update-dismiss"
              onClick={() => setUpdateDismissed(true)}
              aria-label="Dismiss update card"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        )}
        {collapsed ? (
          <div className="efferd-rail-icons">
            <Link href="/#faq" className="efferd-rail-icon" aria-label="Help Center" title="Help Center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
            </Link>
            <a
              href="https://github.com/Manish881-hub/task-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="efferd-rail-icon"
              aria-label="Documentation"
              title="Documentation"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 5v16" />
                <path d="M20.001 19A2 2 0 0 0 22 17V5a2 2 0 0 0-1.999-2L16 3.002A5 5 0 0 0 12 5a5 5 0 0 0-4-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 1.999 2H8a5 5 0 0 1 4 2 5 5 0 0 1 4-2z" />
              </svg>
            </a>
          </div>
        ) : (
          <div className="efferd-help-links">
            <Link href="/#faq">Help Center</Link>
            <a href="https://github.com/Manish881-hub/task-flow" target="_blank" rel="noopener noreferrer">Documentation</a>
          </div>
        )}
        <div className="menu-wrap">
          <button
            type="button"
            className="efferd-account-btn"
            aria-expanded={accountOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
            onClick={() => setAccountOpen((o) => !o)}
          >
            <span className="efferd-avatar" aria-hidden="true">{initial}</span>
            {!collapsed && <span className="efferd-truncate">{user?.name || user?.email || "Account"}</span>}
          </button>
          {accountOpen && (
            <>
              <button type="button" className="menu-backdrop" aria-label="Close account menu" onClick={() => setAccountOpen(false)} tabIndex={-1} />
              <div className="menu efferd-account-menu" role="menu" aria-label="Account">
                <div className="menu-head">
                  <div className="menu-user">{user?.name || "User"}</div>
                  <div className="menu-email">{user?.email || ""}</div>
                </div>
                <button type="button" className="menu-item" role="menuitem" onClick={handleLogout}>Log out</button>
              </div>
            </>
          )}
        </div>
      </div>

      <SearchPalette open={paletteOpen} onClose={closePalette} />
    </aside>
  );
}
