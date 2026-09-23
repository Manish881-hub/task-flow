import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AppSidebar } from "../components/app-sidebar";
import RequireAuth from "../components/RequireAuth";
import ErrorBanner from "../components/ErrorBanner";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import ActivityFeed from "../components/ActivityFeed";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "../lib/api";
import { useAuth } from "../lib/auth";
import { useTaskFlowSocket } from "../hooks/useSocket";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { Separator } from "../components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";

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
  const [stats, setStats] = useState(null);
  const [state, setState] = useState("loading"); // loading | error | done
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const [projData, dash] = await Promise.all([
        apiGet("/api/v1/projects?per_page=100"),
        apiGet("/api/v1/dashboard"),
      ]);
      setProjects(normalizeList(projData));
      setStats(dash?.dashboard || dash);
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
      if (p && p.id) setProjects((prev) => [p, ...prev]);
      else load();
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
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const assigned = stats?.assigned_to_me || { "To Do": 0, "In Progress": 0, Done: 0 };
  const busiest = stats?.busiest_project || null;
  const recent = stats?.recent_activity || [];

  return (
    <div className="dark">
      <Head><title>Dashboard — TaskFlow</title></Head>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2">
            <div className="flex items-center gap-2 px-4">
              <SidebarTrigger className="-ml-1" />
              <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="/dashboard">
                      TaskFlow
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Dashboard</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <div style={{ marginLeft: "auto", paddingRight: "1rem" }} className="small muted">
              Socket: {socketStatus} · {user?.name || user?.email || ""}
            </div>
          </header>
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="container main">
              <div className="spread" style={{ marginBottom: "1rem" }}>
                <div>
                  <h1 style={{ marginBottom: "0.2rem" }}>Dashboard</h1>
                  <p className="muted" style={{ margin: 0 }}>Your work across every project, live.</p>
                </div>
                <button className="btn btn-accent" onClick={() => setShowCreate((v) => !v)}>
                  {showCreate ? "Close" : "New project"}
                </button>
              </div>

              <ErrorBanner message={error} onRetry={load} onDismiss={() => setError("")} />

              {showCreate ? (
                <form onSubmit={createProject} className="card" style={{ marginBottom: "1rem" }} noValidate>
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
                <div className="stack"><Skeleton lines={4} /><Skeleton lines={4} /></div>
              ) : state === "error" && !stats ? (
                <EmptyState title="Could not load dashboard" hint="Check your connection and retry." action={<button className="btn btn-primary" onClick={load}>Retry</button>} />
              ) : (
                <>
                  <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
                    <div className="card">
                      <div className="small muted">Projects you are in</div>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats?.project_count ?? projects.length}</div>
                    </div>
                    <div className="card">
                      <div className="small muted">Assigned to me</div>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats?.assigned_total ?? 0}</div>
                      <div className="small muted">To Do {assigned["To Do"] ?? 0} · In Progress {assigned["In Progress"] ?? 0} · Done {assigned.Done ?? 0}</div>
                    </div>
                    <div className="card">
                      <div className="small muted">Completed this week</div>
                      <div style={{ fontSize: "1.8rem", fontWeight: 800 }}>{stats?.completed_this_week ?? 0}</div>
                      <div className="small muted">Overdue: {stats?.overdue_count ?? 0}</div>
                    </div>
                  </div>

                  <div className="grid grid-2">
                    <section className="card" aria-label="Projects">
                      <div className="spread" style={{ marginBottom: "0.75rem" }}>
                        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Projects ({projects.length})</h2>
                        <Link href="/assigned" className="btn btn-ghost btn-sm">Assigned to me →</Link>
                      </div>
                      {projects.length === 0 ? (
                        <p className="muted small">No projects yet. Create one to get started.</p>
                      ) : (
                        <div className="stack">
                          {projects.map((p) => (
                            <div key={p.id} className="spread">
                              <Link href={`/projects/${p.id}`}><strong className="small">{p.name}</strong></Link>
                              <span className="row">
                                <span className="small muted">{p.task_counts ? `${(p.task_counts["To Do"] || 0) + (p.task_counts["In Progress"] || 0)} open` : ""}</span>
                                <button className="btn btn-ghost btn-sm" disabled={deletingId === p.id} onClick={() => deleteProject(p.id)}>
                                  {deletingId === p.id ? "Deleting…" : "Delete"}
                                </button>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {busiest ? (
                        <p className="small muted" style={{ marginBottom: 0 }}>
                          Busiest: <strong>{busiest.project_name}</strong> ({busiest.open_tasks} open tasks)
                        </p>
                      ) : null}
                    </section>
                    <section className="card" aria-label="Recent activity">
                      <h2 style={{ margin: 0, marginBottom: "0.75rem", fontSize: "1.1rem" }}>
                        Recent activity {socketStatus === "Live" ? <span className="badge badge-green">live</span> : <span className="badge">reconnecting</span>}
                      </h2>
                      <ActivityFeed items={recent} />
                    </section>
                  </div>
                </>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
