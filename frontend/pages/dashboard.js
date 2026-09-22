import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import RequireAuth from "../components/RequireAuth";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
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
  const [assigned, setAssigned] = useState([]);
  const [activity, setActivity] = useState([]);
  const [state, setState] = useState("loading"); // loading | error | done
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [projData, assignedData] = await Promise.all([
        apiGet("/api/v1/projects"),
        apiGet("/api/v1/tasks/assigned").catch(() => []),
      ]);
      const list = normalizeList(projData);
      setProjects(list);
      setAssigned(normalizeList(assignedData));

      // Recent activity: fan out to first few projects, tolerate failures.
      const recent = [];
      for (const p of list.slice(0, 3)) {
        try {
          const a = await apiGet(`/api/v1/projects/${p.id}/activity?limit=5`);
          const items = Array.isArray(a) ? a : a?.items || a?.activity || [];
          recent.push(...items);
        } catch {}
      }
      recent.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setActivity(recent.slice(0, 8));
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

  const createProject = async (e) => {
    e.preventDefault();
    if (newName.trim().length < 3) return;
    setCreating(true);
    try {
      const created = await apiPost("/api/v1/projects", {
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      const p = created?.project || created;
      setProjects((prev) => [p, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project and all its tasks?")) return;
    try {
      await apiDelete(`/api/v1/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const counts = (p) => {
    if (p.task_counts) return p.task_counts;
    const tasks = p.tasks || [];
    return {
      todo: tasks.filter((t) => t.status === "To Do").length,
      in_progress: tasks.filter((t) => t.status === "In Progress").length,
      done: tasks.filter((t) => t.status === "Done").length,
    };
  };

  return (
    <div className="page">
      <Head><title>Dashboard — TaskFlow</title></Head>
      <Navbar socketStatus={socketStatus} />
      <main className="container main">
        <div className="spread" style={{ marginBottom: "1rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.2rem" }}>Good to see you{user?.name ? `, ${user.name}` : ""}</h1>
            <p className="muted" style={{ margin: 0 }}>
              {projects.length} project{projects.length === 1 ? "" : "s"} · {assigned.length} task{assigned.length === 1 ? "" : "s"} assigned to you
            </p>
          </div>
          <button className="btn btn-accent" onClick={() => setShowCreate((s) => !s)}>
            New project
          </button>
        </div>

        <ErrorBanner message={error} onRetry={load} onDismiss={() => setError("")} />

        {showCreate ? (
          <div className="card" style={{ marginBottom: "1rem" }}>
            <form onSubmit={createProject}>
              <div className="form-row two">
                <div className="field">
                  <label className="label" htmlFor="proj-name">Project name</label>
                  <input
                    id="proj-name" className="input" value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Website redesign" maxLength={80} required
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="proj-desc">Description (optional)</label>
                  <input
                    id="proj-desc" className="input" value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Q4 marketing site refresh" maxLength={300}
                  />
                </div>
              </div>
              <div className="row">
                <button type="submit" className="btn btn-primary" disabled={creating || newName.trim().length < 3}>
                  {creating ? "Creating…" : "Create project"}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="grid grid-3"><Skeleton lines={3} /><Skeleton lines={3} /><Skeleton lines={3} /></div>
        ) : state === "error" && projects.length === 0 ? (
          <EmptyState title="Could not load projects" hint="Check your connection and retry." action={<button className="btn btn-primary" onClick={load}>Retry</button>} />
        ) : projects.length === 0 ? (
          <EmptyState
            title="No projects yet"
            hint="Create your first project to start tracking work."
            action={<button className="btn btn-accent" onClick={() => setShowCreate(true)}>Create project</button>}
          />
        ) : (
          <div className="grid grid-3">
            {projects.map((p) => {
              const c = counts(p);
              return (
                <div key={p.id} className="card">
                  <div className="spread">
                    <Link href={`/projects/${p.id}`} className="card-title">{p.name}</Link>
                    <button className="icon-btn" aria-label={`Delete ${p.name}`} onClick={() => deleteProject(p.id)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {p.description ? <p className="muted small">{p.description}</p> : null}
                  <div className="row" style={{ margin: "0.6rem 0" }}>
                    <span className="badge">{c.todo ?? 0} To Do</span>
                    <span className="badge badge-gold">{c.in_progress ?? 0} In Progress</span>
                    <span className="badge badge-green">{c.done ?? 0} Done</span>
                  </div>
                  <Link href={`/projects/${p.id}`} className="btn btn-ghost btn-sm btn-block">Open board</Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
          <div className="card">
            <div className="spread" style={{ marginBottom: "0.75rem" }}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Assigned to me</h2>
              <Link href="/assigned" className="nav-link">View all</Link>
            </div>
            {assigned.length === 0 ? (
              <p className="muted small">Nothing assigned to you right now.</p>
            ) : (
              <div className="stack">
                {assigned.slice(0, 5).map((t) => (
                  <div key={t.id} className="spread">
                    <Link href={t.project_id ? `/projects/${t.project_id}` : "/assigned"}>
                      <strong className="small">{t.title}</strong>
                    </Link>
                    <span className="badge">{t.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h2 style={{ margin: 0, marginBottom: "0.75rem", fontSize: "1.1rem" }}>Recent activity</h2>
            <ActivityFeed items={activity} />
          </div>
        </div>
      </main>
    </div>
  );
}
