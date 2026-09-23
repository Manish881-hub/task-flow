import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import EfferdPageShell from "../components/EfferdPageShell";
import RequireAuth from "../components/RequireAuth";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import ActivityFeed from "../components/ActivityFeed";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTaskFlowSocket } from "../hooks/useSocket";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.projects)) return data.projects;
  return [];
}

function greetingFor(date) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function fmtDay(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Bucket real activity events into per-day counts for the last `days` days. */
function buildSeries(events, days) {
  const buckets = new Array(days).fill(0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setDate(start.getDate() - (days - 1));
  for (const e of events || []) {
    if (!e || !e.created_at) continue;
    const d = new Date(e.created_at);
    if (Number.isNaN(d.getTime())) continue;
    d.setHours(0, 0, 0, 0);
    const idx = Math.round((d - start) / 86400000);
    if (idx >= 0 && idx < days) buckets[idx] += 1;
  }
  return { buckets, start };
}

const RAIL_BAR_COLORS = ["#1d70f5", "#5b8def", "#94a3b8", "#64748b", "#3a3f4a"];

export default function Dashboard() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}

function DashboardInner() {
  const { user } = useAuth();
  const { status: socketStatus, lastEvent } = useTaskFlowSocket();
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]); // raw activity events across projects
  const [state, setState] = useState("loading"); // loading | error | done
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [range, setRange] = useState(30); // 7 | 30 days for the activity chart
  const [projectFilter, setProjectFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [projData, dash] = await Promise.all([
        apiGet("/api/v1/projects?per_page=100"),
        apiGet("/api/v1/dashboard"),
      ]);
      const list = normalizeList(projData);
      setProjects(list);
      setStats(dash?.dashboard || dash);
      // Real event history for the chart: fan out over existing activity
      // endpoints (same calls the old dashboard made), failures tolerated.
      const events = [];
      for (const p of list.slice(0, 6)) {
        try {
          const a = await apiGet(`/api/v1/projects/${p.id}/activity?per_page=30`);
          const items = Array.isArray(a) ? a : a?.items || a?.activity || [];
          for (const e of items) events.push({ ...e, project_id: e.project_id || p.id });
        } catch {}
      }
      setHistory(events);
      setState("done");
    } catch (err) {
      setError(getErrorMessage(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Live hint: any socket event triggers a lightweight refetch.
  useEffect(() => {
    if (!lastEvent) return;
    load();
  }, [lastEvent?._receivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    setFormError("");
    const name = newName.trim();
    if (name.length < 1) {
      setFormError("Project name is required.");
      return;
    }
    if (name.length > 200) {
      setFormError("Project name must be under 200 characters.");
      return;
    }
    setCreating(true);
    try {
      const created = await apiPost("/api/v1/projects", {
        name,
        description: newDesc.trim() || "",
      });
      const p = created?.project || created;
      if (p && p.id) {
        setProjects((prev) => [p, ...prev]);
        load();
      } else load();
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    setDeletingId(id);
    try {
      await apiDelete(`/api/v1/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  // ---- derived real-data aggregates (no fabricated values) ----
  const assigned = stats?.assigned_to_me || { "To Do": 0, "In Progress": 0, Done: 0 };
  const assignedTotal = stats?.assigned_total ?? 0;
  const completedWeek = stats?.completed_this_week ?? 0;
  const overdue = stats?.overdue_count ?? 0;
  const busiest = stats?.busiest_project || null;
  const perProject = stats?.per_project || [];
  const recent = stats?.recent_activity || [];
  const openAssigned = assignedTotal - (assigned.Done ?? 0);

  const totalTasks = perProject.reduce((n, p) => n + (p.task_count || 0), 0);
  const openTasks = perProject.reduce((n, p) => n + (p.open_tasks || 0), 0);
  const doneTasks = Math.max(0, totalTasks - openTasks);
  const donePct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const filteredHistory = useMemo(
    () => (projectFilter === "all" ? history : history.filter((e) => String(e.project_id) === projectFilter)),
    [history, projectFilter]
  );
  const { buckets, start } = useMemo(() => buildSeries(filteredHistory, range), [filteredHistory, range]);
  const chartTotal = buckets.reduce((n, v) => n + v, 0);
  const chartMax = Math.max(1, ...buckets);
  const peakIdx = buckets.indexOf(Math.max(...buckets));
  const peakDate = new Date(start);
  peakDate.setDate(peakDate.getDate() + (peakIdx >= 0 ? peakIdx : 0));

  const today = useMemo(() => new Date(), []);
  const highlights = useMemo(() => {
    const out = [];
    if (busiest) out.push(`${busiest.project_name} carries the heaviest load with ${busiest.open_tasks} open tasks.`);
    else out.push("No open tasks across your projects.");
    out.push(overdue > 0 ? `${overdue} overdue task${overdue === 1 ? "" : "s"} need${overdue === 1 ? "s" : ""} attention.` : "Nothing is overdue.");
    out.push(
      completedWeek > 0
        ? `${completedWeek} task${completedWeek === 1 ? "" : "s"} completed in the last 7 days.`
        : "No completions in the last 7 days."
    );
    return out;
  }, [busiest, overdue, completedWeek]);

  const projectShare = useMemo(() => {
    const ranked = [...perProject].sort((a, b) => (b.open_tasks || 0) - (a.open_tasks || 0));
    const top = ranked.slice(0, 4);
    const rest = ranked.slice(4);
    const restOpen = rest.reduce((n, p) => n + (p.open_tasks || 0), 0);
    if (rest.length) top.push({ project_id: "__rest", project_name: `${rest.length} more`, open_tasks: restOpen });
    return top;
  }, [perProject]);

  const liveBadge =
    socketStatus === "Live" ? <span className="badge badge-green">live</span> : <span className="badge">reconnecting</span>;

  return (
    <EfferdPageShell
      title="Dashboard"
      crumb="Dashboard"
      socketStatus={socketStatus}
      headRight={<span className="small efferd-text-muted">{user?.name || user?.email || ""}</span>}
    >
      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError("")} />

          {/* dashboard header: greeting + live controls */}
          <div className="dash-head">
            <div>
              <h1 className="dash-title">{greetingFor(today)}{user?.name ? `, ${user.name}` : ""}</h1>
              <p className="dash-subtitle">Your work across every project. {liveBadge}</p>
            </div>
            <div className="dash-controls">
              <select
                className="dash-select"
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                aria-label="Filter analytics by project"
              >
                <option value="all">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <div className="dash-segment" role="group" aria-label="Chart time range">
                <button
                  type="button"
                  className={`dash-segment-btn${range === 7 ? " active" : ""}`}
                  onClick={() => setRange(7)}
                  aria-pressed={range === 7}
                >
                  7d
                </button>
                <button
                  type="button"
                  className={`dash-segment-btn${range === 30 ? " active" : ""}`}
                  onClick={() => setRange(30)}
                  aria-pressed={range === 30}
                >
                  30d
                </button>
              </div>
              <span className="dash-date">{fmtDay(today)}, {today.getFullYear()}</span>
              <button type="button" className="dash-btn-secondary" onClick={refresh} disabled={refreshing || state === "loading"}>
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)}>
                {showCreate ? "Close" : "New project"}
              </button>
            </div>
          </div>

          {showCreate ? (
            <form onSubmit={createProject} className="dash-panel" style={{ marginBottom: "1rem" }} noValidate>
              <div className="field">
                <label className="label" htmlFor="proj-name">Project name</label>
                <input id="proj-name" className="input" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={200} required />
              </div>
              <div className="field">
                <label className="label" htmlFor="proj-desc">Description (optional)</label>
                <input id="proj-desc" className="input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} maxLength={2000} />
              </div>
              {formError ? <span className="form-error">{formError}</span> : null}
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? "Creating…" : "Create project"}
              </button>
            </form>
          ) : null}

          {state === "loading" ? (
            <div className="stack"><Skeleton lines={4} /><Skeleton lines={4} /><Skeleton lines={4} /></div>
          ) : state === "error" && !stats ? (
            <EmptyState title="Could not load dashboard" hint="Check your connection and retry." action={<button className="btn btn-primary" onClick={load}>Retry</button>} />
          ) : (
            <div className="dash-grid">
              <div className="dash-left">
                {/* compact KPI strip */}
                <section className="dash-panel dash-kpis" aria-label="Key metrics">
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">Projects</div>
                    <div className="dash-kpi-value">{stats?.project_count ?? projects.length}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">Assigned tasks</div>
                    <div className="dash-kpi-value">{assignedTotal}</div>
                    <div className="dash-kpi-sub">To Do {assigned["To Do"] ?? 0} · Doing {assigned["In Progress"] ?? 0} · Done {assigned.Done ?? 0}</div>
                  </div>
                  <div className="dash-kpi">
                    <div className="dash-kpi-label">Completed this week</div>
                    <div className="dash-kpi-value">{completedWeek}</div>
                    <div className="dash-kpi-sub">Overdue {overdue}</div>
                  </div>
                </section>

                {/* primary analytics chart */}
                <section className="dash-panel dash-chart" aria-label="Task activity">
                  <div className="dash-panel-head">
                    <div>
                      <div className="dash-panel-title">Task activity</div>
                      <div className="dash-panel-sub">
                        {chartTotal} event{chartTotal === 1 ? "" : "s"} in the last {range} days
                        {chartTotal > 0 ? ` · peak ${buckets[peakIdx]} on ${fmtDay(peakDate)}` : ""}
                      </div>
                    </div>
                  </div>
                  {chartTotal === 0 ? (
                    <div className="dash-chart-empty">
                      <p className="dash-chart-empty-title">No task history available yet</p>
                      <p className="dash-chart-empty-sub">Create, move, assign or comment on tasks and activity will appear here.</p>
                    </div>
                  ) : (
                    <ActivityChart buckets={buckets} start={start} max={chartMax} />
                  )}
                </section>

                {/* insights + workload split */}
                <div className="dash-split">
                  <section className="dash-panel" aria-label="Highlights">
                    <div className="dash-panel-title">Highlights</div>
                    <ul className="dash-highlights">
                      {highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  </section>
                  <section className="dash-panel" aria-label="Workload">
                    <div className="dash-panel-title">Workload</div>
                    <div className="dash-panel-sub">Tasks assigned to you</div>
                    <WorkloadBars assigned={assigned} total={assignedTotal} />
                  </section>
                </div>

                {/* projects + recent activity */}
                <div className="dash-split">
                  <section className="dash-panel" aria-label="Projects">
                    <div className="dash-panel-head">
                      <div className="dash-panel-title">Projects ({projects.length})</div>
                      <Link href="/assigned" className="dash-btn-secondary dash-btn-sm">Assigned to me →</Link>
                    </div>
                    {projects.length === 0 ? (
                      <p className="dash-muted">No projects yet. Create one to get started.</p>
                    ) : (
                      <div className="dash-project-list">
                        {projects.map((p) => {
                          const info = perProject.find((x) => x.project_id === p.id);
                          return (
                            <div key={p.id} className="dash-project-row">
                              <Link href={`/projects/${p.id}`}><strong className="dash-text-sm">{p.name}</strong></Link>
                              <span className="dash-row">
                                <span className="dash-muted dash-text-sm">
                                  {info ? `${info.open_tasks} open · ${info.task_count} total` : ""}
                                </span>
                                <button className="btn btn-danger btn-sm" disabled={deletingId === p.id} onClick={() => deleteProject(p.id)}>
                                  {deletingId === p.id ? "Deleting…" : "Delete"}
                                </button>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                  <section className="dash-panel" aria-label="Recent activity">
                    <div className="dash-panel-head">
                      <div className="dash-panel-title">Recent activity</div>
                      {liveBadge}
                    </div>
                    <ActivityFeed items={recent} />
                  </section>
                </div>
              </div>

              {/* right rail */}
              <aside className="dash-rail" aria-label="Workspace overview">
                <section className="dash-panel dash-rail-section" aria-label="Task distribution">
                  <div className="dash-panel-title">Task distribution</div>
                  <DistributionRadial total={totalTasks} done={doneTasks} open={openTasks} pct={donePct} />
                </section>
                <section className="dash-panel dash-rail-section" aria-label="Active projects">
                  <div className="dash-panel-title">Active projects</div>
                  <div className="dash-rail-big">{stats?.project_count ?? projects.length}</div>
                  {openTasks > 0 ? (
                    <>
                      <div className="dash-sharebar" role="img" aria-label="Share of open tasks per project">
                        {projectShare.filter((p) => (p.open_tasks || 0) > 0).map((p, i) => (
                          <span
                            key={p.project_id}
                            style={{ width: `${Math.max(2, ((p.open_tasks || 0) / openTasks) * 100)}%`, background: RAIL_BAR_COLORS[i % RAIL_BAR_COLORS.length] }}
                          />
                        ))}
                      </div>
                      <ul className="dash-legend">
                        {projectShare.filter((p) => (p.open_tasks || 0) > 0).map((p, i) => (
                          <li key={p.project_id}>
                            <i style={{ background: RAIL_BAR_COLORS[i % RAIL_BAR_COLORS.length] }} />
                            {p.project_name} · {p.open_tasks} open
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="dash-muted">No open tasks right now.</p>
                  )}
                </section>
                <section className="dash-panel dash-rail-section" aria-label="Task status">
                  <div className="dash-panel-title">Task status</div>
                  <div className="dash-panel-sub">Assigned to you</div>
                  <ul className="dash-status-rows">
                    <li><span>To Do</span><strong>{assigned["To Do"] ?? 0}</strong></li>
                    <li><span>In Progress</span><strong>{assigned["In Progress"] ?? 0}</strong></li>
                    <li><span>Done</span><strong>{assigned.Done ?? 0}</strong></li>
                  </ul>
                </section>
                <section className="dash-panel dash-rail-section" aria-label="Needs attention">
                  <div className="dash-panel-title">Needs attention</div>
                  <ul className="dash-status-rows">
                    <li><span>Overdue tasks</span><strong className={overdue > 0 ? "dash-alert" : ""}>{overdue}</strong></li>
                    <li><span>Open assigned</span><strong>{openAssigned}</strong></li>
                  </ul>
                </section>
              </aside>
            </div>
          )}
    </EfferdPageShell>
  );
}

/** SVG area chart from real per-day counts. Same frame whether or not data exists. */
function ActivityChart({ buckets, start, max }) {
  const W = 600;
  const H = 240;
  const padL = 36;
  const padR = 8;
  const padT = 12;
  const padB = 26;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = buckets.length;
  const x = (i) => (n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v) => padT + innerH * (1 - v / max);
  const line = buckets.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(n - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const ticks = [0, Math.ceil(max / 2), max];
  const tickIdx = [0, Math.floor((n - 1) / 2), n - 1];
  return (
    <div className="dash-chart-frame">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Task activity over time" style={{ width: "100%", height: "100%", display: "block" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} y1={y(t)} x2={W - padR} y2={y(t)} stroke="#242424" strokeWidth="1" strokeDasharray="4 4" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#888888">{t}</text>
          </g>
        ))}
        <path d={area} fill="#1d70f5" opacity="0.18" />
        <path d={line} fill="none" stroke="#1d70f5" strokeWidth="2" strokeLinecap="round" />
        {tickIdx.map((i) => {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          return (
            <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#888888">
              {fmtDay(d)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/** Progress ring: share of completed vs open tasks across the workspace. */
function DistributionRadial({ total, done, open, pct }) {
  const R = 62;
  const C = 2 * Math.PI * R;
  const off = C * (1 - pct / 100);
  return (
    <div className="dash-radial">
      <svg viewBox="0 0 160 160" width="150" height="150" role="img" aria-label={`${pct}% of tasks completed`}>
        <circle cx="80" cy="80" r={R} fill="none" stroke="#242424" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={R} fill="none" stroke="#1d70f5" strokeWidth="12"
          strokeLinecap="round" strokeDasharray={C.toFixed(1)} strokeDashoffset={off.toFixed(1)}
          transform="rotate(-90 80 80)"
        />
        <text x="80" y="76" textAnchor="middle" fontSize="22" fontWeight="800" fill="#f5f5f5">{total}</text>
        <text x="80" y="94" textAnchor="middle" fontSize="10" fill="#888888">Total tasks</text>
      </svg>
      <ul className="dash-legend dash-legend-center">
        <li><i style={{ background: "#1d70f5" }} />Completed · {done}</li>
        <li><i style={{ background: "#3a3f4a" }} />Open · {open}</li>
      </ul>
    </div>
  );
}

/** Horizontal bars for the assigned-by-status workload cell. */
function WorkloadBars({ assigned, total }) {
  const rows = [
    { label: "To Do", value: assigned["To Do"] ?? 0, color: "#94a3b8" },
    { label: "In Progress", value: assigned["In Progress"] ?? 0, color: "#1d70f5" },
    { label: "Done", value: assigned.Done ?? 0, color: "#22c55e" },
  ];
  return (
    <div className="dash-workload">
      {rows.map((r) => (
        <div key={r.label} className="dash-workload-row">
          <span className="dash-workload-label">{r.label}</span>
          <div className="dash-workload-track">
            <span style={{ width: `${total ? Math.max(2, (r.value / total) * 100) : 0}%`, background: r.color }} />
          </div>
          <strong className="dash-workload-value">{r.value}</strong>
        </div>
      ))}
    </div>
  );
}
