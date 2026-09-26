import Link from "next/link";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { apiGet } from "../../lib/api";
import { useTaskFlowSocket } from "../../hooks/useSocket";
import SearchPalette from "../SearchPalette";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

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
  const [updateDismissed, setUpdateDismissed] = useState(false);
  // Workspaces are array-shaped so a second workspace later is trivial.
  // TaskFlow has no workspace entity/API today, so the list holds the
  // single real workspace and creation stays disabled, never fake.
  const [workspaces, setWorkspaces] = useState([
    { id: "taskflow", name: "TaskFlow", plan: "Free", current: true },
  ]);
  const currentWs = workspaces.find((w) => w.current) || workspaces[0];
  const selectWorkspace = useCallback((id) => {
    setWorkspaces((prev) => prev.map((w) => ({ ...w, current: w.id === id })));
  }, []);
  const [projectsList, setProjectsList] = useState([]);
  const [assignedCount, setAssignedCount] = useState(null);
  // Sidebar owns its project list, so it owns the subscription that
  // invalidates it. No projectId → no room join → only personal
  // send_to_user events arrive here; room board traffic never triggers
  // a refetch. Same hook/registry model as pages, no new connection design.
  const { lastEvent } = useTaskFlowSocket();

  const loadSidebar = useCallback(async (silent = false) => {
    if (!silent) {
      // Initial load keeps the long-standing behavior exactly.
      try {
        const [projData, assignedData] = await Promise.all([
          apiGet("/api/v1/projects?per_page=10").catch(() => []),
          apiGet("/api/v1/assigned?per_page=100").catch(() => []),
        ]);
        const pList = Array.isArray(projData) ? projData : [];
        const aList = Array.isArray(assignedData) ? assignedData : [];
        setProjectsList(pList);
        setAssignedCount(aList.filter((t) => t.status !== "Done").length);
      } catch {
        setProjectsList([]);
        setAssignedCount(null);
      }
      return;
    }
    // Silent background refetch: any failure preserves the on-screen list.
    try {
      const [projData, assignedData] = await Promise.all([
        apiGet("/api/v1/projects?per_page=10"),
        apiGet("/api/v1/assigned?per_page=100"),
      ]);
      const pList = Array.isArray(projData) ? projData : [];
      const aList = Array.isArray(assignedData) ? assignedData : [];
      setProjectsList(pList);
      setAssignedCount(aList.filter((t) => t.status !== "Done").length);
    } catch {
      // Keep the existing list/count on screen.
    }
  }, []);

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
    loadSidebar();
  }, [loadSidebar]);

  // Membership-only live update: a created/invited project appears (and a
  // removed one disappears) without manual refresh. Every other event type
  // (task moves, comments, activity) is ignored so the sidebar never
  // refetches on routine board traffic.
  const lastReceivedAt = lastEvent?._receivedAt;
  useEffect(() => {
    if (!lastEvent) return;
    if (
      lastEvent.type === "project_created" ||
      lastEvent.type === "member_invited" ||
      lastEvent.type === "member_removed"
    ) {
      loadSidebar(true);
    }
  }, [lastReceivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = useCallback(async () => {
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

      <div className="efferd-ws-wrap">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="efferd-ws-btn"
            aria-label={`Workspace: ${currentWs.name}`}
            title={collapsed ? `Workspace: ${currentWs.name}` : undefined}
          >
            <span className="efferd-ws-dot" aria-hidden="true">{currentWs.name.charAt(0).toUpperCase()}</span>
            {!collapsed && (
              <>
                <span className="efferd-truncate efferd-ws-name">{currentWs.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m7 15 5 5 5-5" />
                  <path d="m7 9 5-5 5 5" />
                </svg>
              </>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="start" sideOffset={8} className="efferd-menu-pop efferd-ws-pop">
          <div className="efferd-menu-pop-eyebrow">Workspaces</div>
          {workspaces.map((w) => (
            <DropdownMenuItem
              key={w.id}
              className={`efferd-menu-pop-item efferd-ws-item${w.current ? " active" : ""}`}
              onSelect={() => selectWorkspace(w.id)}
            >
              <span className="efferd-ws-avatar" aria-hidden="true">{w.name.charAt(0).toUpperCase()}</span>
              <span className="efferd-ws-item-text">
                <span className="efferd-ws-item-name">{w.name}</span>
                <span className="efferd-ws-item-plan">{w.plan}</span>
              </span>
              {w.current && (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="efferd-ws-check">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator className="efferd-menu-pop-sep" />
          <DropdownMenuItem className="efferd-menu-pop-item" disabled title="Workspace creation is not available yet">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
            Create new workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="efferd-account-btn"
              aria-label="Account menu"
              title={collapsed ? (user?.name || user?.email || "Account") : undefined}
            >
              <span className="efferd-avatar efferd-avatar-lg" aria-hidden="true">{initial}</span>
              {!collapsed && (
                <span className="efferd-account-text">
                  <span className="efferd-account-name">{user?.name || "User"}</span>
                  <span className="efferd-account-email">{user?.email || ""}</span>
                </span>
              )}
              {!collapsed && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="efferd-account-chevron">
                  <path d="m7 15 5 5 5-5" />
                  <path d="m7 9 5-5 5 5" />
                </svg>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" sideOffset={8} className="efferd-menu-pop">
            <div className="efferd-menu-pop-head">
              <span className="efferd-avatar efferd-avatar-lg" aria-hidden="true">{initial}</span>
              <span className="efferd-menu-pop-head-text">
                <span className="efferd-menu-pop-name">{user?.name || "User"}</span>
                <span className="efferd-menu-pop-email">{user?.email || ""}</span>
              </span>
            </div>
            <DropdownMenuSeparator className="efferd-menu-pop-sep" />
            <DropdownMenuItem className="efferd-menu-pop-item" disabled title="Not available yet">
              Account
            </DropdownMenuItem>
            <DropdownMenuItem className="efferd-menu-pop-item" disabled title="Not available yet">
              Notifications
            </DropdownMenuItem>
            <DropdownMenuItem className="efferd-menu-pop-item" disabled title="Not available yet">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="efferd-menu-pop-sep" />
            <DropdownMenuItem className="efferd-menu-pop-item efferd-menu-pop-danger" onSelect={handleLogout}>
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <SearchPalette open={paletteOpen} onClose={closePalette} />
    </aside>
  );
}
