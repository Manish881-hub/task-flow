import Head from "next/head";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import Navbar from "../../components/Navbar";
import RequireAuth from "../../components/RequireAuth";
import TaskCard from "../../components/TaskCard";
import TaskModal from "../../components/TaskModal";
import InviteModal from "../../components/InviteModal";
import ActivityFeed from "../../components/ActivityFeed";
import EmptyState from "../../components/EmptyState";
import Skeleton, { CardSkeleton } from "../../components/Skeleton";
import ErrorBanner from "../../components/ErrorBanner";
import { apiDelete, apiGet, apiPatch, getErrorMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { useTaskFlowSocket } from "../../hooks/useSocket";

const COLUMNS = ["To Do", "In Progress", "Done"];
const PAGE_SIZE = 10;

export default function ProjectPage() {
  return (
    <RequireAuth>
      <ProjectInner />
    </RequireAuth>
  );
}

function ProjectInner() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const { status: socketStatus, lastEvent } = useTaskFlowSocket(typeof id === "string" ? id : undefined);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");

  // Backlog controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);

  // Modals / dnd
  const [modalTask, setModalTask] = useState(undefined); // undefined=closed, null=new, object=edit
  const [showInvite, setShowInvite] = useState(false);
  const [dragOver, setDragOver] = useState(null);

  const loadProject = useCallback(async () => {
    if (!id) return;
    setState("loading");
    setError("");
    try {
      const [p, t, a] = await Promise.all([
        apiGet(`/api/v1/projects/${id}`),
        apiGet(`/api/v1/projects/${id}/tasks?limit=200`),
        apiGet(`/api/v1/projects/${id}/activity?limit=30`).catch(() => []),
      ]);
      setProject(p?.project || p);
      const list = Array.isArray(t) ? t : t?.items || t?.tasks || [];
      setTasks(list);
      setActivity(Array.isArray(a) ? a : a?.items || a?.activity || []);
      setState("done");
    } catch (err) {
      setError(getErrorMessage(err));
      setState("error");
    }
  }, [id]);

  useEffect(() => {
    if (id) loadProject();
  }, [id, loadProject]);

  const refreshTasks = useCallback(async () => {
    if (!id) return;
    try {
      const [t, a] = await Promise.all([
        apiGet(`/api/v1/projects/${id}/tasks?limit=200`),
        apiGet(`/api/v1/projects/${id}/activity?limit=30`).catch(() => []),
      ]);
      setTasks(Array.isArray(t) ? t : t?.items || t?.tasks || []);
      setActivity(Array.isArray(a) ? a : a?.items || a?.activity || []);
    } catch {}
  }, [id]);

  // Live updates from WS — REST refetch keeps UI correct even after reconnects.
  useEffect(() => {
    if (lastEvent) refreshTasks();
  }, [lastEvent?._receivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const members = useMemo(() => {
    if (!project) return [];
    return project.members || project.project_members || [];
  }, [project]);

  const myRole = useMemo(() => {
    if (!user) return null;
    const m = members.find((x) => (x.user_id || x.id) === user.id);
    if (m) return m.role || "member";
    if (project && (project.owner_id === user.id || project.owner?.id === user.id)) return "owner";
    return "member";
  }, [members, project, user]);
  const isOwner = myRole === "owner";

  // Client-side backlog filtering (also sent to server when supported).
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = tasks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
      if (q && !(`${t.title || ""} ${t.description || ""}`.toLowerCase().includes(q))) return false;
      return true;
    });
    const prioRank = { High: 0, Medium: 1, Low: 2 };
    list = [...list].sort((a, b) => {
      switch (sort) {
        case "due_asc":
          return new Date(a.due_date || "9999") - new Date(b.due_date || "9999");
        case "due_desc":
          return new Date(b.due_date || "9999") - new Date(a.due_date || "9999");
        case "priority":
          return (prioRank[a.priority] ?? 9) - (prioRank[b.priority] ?? 9);
        case "title":
          return String(a.title).localeCompare(String(b.title));
        case "created_asc":
          return new Date(a.created_at || 0) - new Date(b.created_at || 0);
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
    });
    return list;
  }, [tasks, search, statusFilter, priorityFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const byStatus = useMemo(() => {
    const map = { "To Do": [], "In Progress": [], Done: [] };
    for (const t of tasks) {
      if (map[t.status]) map[t.status].push(t);
      else map["To Do"].push(t);
    }
    return map;
  }, [tasks]);

  // --- drag & drop ---
  const onDragStart = (e, task) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: task.id, status: task.status }));
    e.dataTransfer.effectAllowed = "move";
  };

  const moveTask = async (taskId, nextStatus) => {
    const prev = tasks.find((t) => t.id === taskId);
    if (!prev || prev.status === nextStatus) return;
    // Optimistic move; rollback on failure.
    setTasks((cur) => cur.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)));
    try {
      await apiPatch(`/api/v1/tasks/${taskId}`, { status: nextStatus });
      refreshTasks();
    } catch (err) {
      setTasks((cur) => cur.map((t) => (t.id === taskId ? { ...t, status: prev.status } : t)));
      setError(getErrorMessage(err));
    }
  };

  const removeMember = async (memberUserId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    try {
      await apiDelete(`/api/v1/projects/${id}/members/${memberUserId}`);
      loadProject();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (!id) return null;

  return (
    <div className="page">
      <Head><title>{project?.name ? `${project.name} — TaskFlow` : "Project — TaskFlow"}</title></Head>
      <Navbar socketStatus={socketStatus} />
      <main className="container main">
        <ErrorBanner message={error} onRetry={loadProject} onDismiss={() => setError("")} />

        {state === "loading" && !project ? (
          <Skeleton lines={5} />
        ) : state === "error" && !project ? (
          <EmptyState title="Could not load project" hint="It may have been deleted or you lost access." action={<button className="btn btn-primary" onClick={loadProject}>Retry</button>} />
        ) : (
          <>
            <div className="spread" style={{ marginBottom: "1rem" }}>
              <div>
                <h1 style={{ marginBottom: "0.2rem" }}>{project?.name}</h1>
                {project?.description ? <p className="muted" style={{ margin: 0 }}>{project.description}</p> : null}
              </div>
              <div className="row">
                <button className="btn btn-accent" onClick={() => setModalTask(null)}>New task</button>
                {isOwner ? <button className="btn btn-ghost" onClick={() => setShowInvite(true)}>Invite</button> : null}
              </div>
            </div>

            {state === "loading" ? (
              <div className="grid grid-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
            ) : tasks.length === 0 ? (
              <EmptyState
                title="No tasks yet"
                hint="Create the first task to populate the board."
                action={<button className="btn btn-accent" onClick={() => setModalTask(null)}>Create task</button>}
              />
            ) : (
              <section aria-label="Board" className="board">
                {COLUMNS.map((col) => (
                  <div
                    key={col}
                    className={`column${dragOver === col ? " over" : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(col);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      try {
                        const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                        if (data?.id) moveTask(data.id, col);
                      } catch {}
                    }}
                  >
                    <div className="column-head">
                      <span className="column-title">{col}</span>
                      <span className="count">{byStatus[col].length}</span>
                    </div>
                    {byStatus[col].map((t) => (
                      <TaskCard key={t.id} task={t} draggable onDragStart={onDragStart} onOpen={setModalTask} />
                    ))}
                    {byStatus[col].length === 0 ? <p className="muted small">Drop tasks here.</p> : null}
                  </div>
                ))}
              </section>
            )}

            <div className="grid grid-2" style={{ marginTop: "1.5rem" }}>
              <section className="card" aria-label="Backlog">
                <h2 style={{ fontSize: "1.1rem" }}>Backlog</h2>
                <div className="toolbar">
                  <input
                    className="input search" placeholder="Search tasks…" value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }} aria-label="Search tasks"
                  />
                  <select className="select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} aria-label="Filter by status">
                    <option value="all">All statuses</option>
                    {COLUMNS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="select" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} aria-label="Filter by priority">
                    <option value="all">All priorities</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                  <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
                    <option value="created_desc">Newest</option>
                    <option value="created_asc">Oldest</option>
                    <option value="due_asc">Due soon</option>
                    <option value="due_desc">Due later</option>
                    <option value="priority">Priority</option>
                    <option value="title">Title A–Z</option>
                  </select>
                </div>
                {pageItems.length === 0 ? (
                  <p className="muted small">No tasks match these filters.</p>
                ) : (
                  <div className="stack">
                    {pageItems.map((t) => (
                      <div key={t.id} className="spread" style={{ borderBottom: "1px solid var(--color-border)", paddingBottom: "0.6rem" }}>
                        <button className="nav-link" style={{ textAlign: "left", color: "var(--color-fg)" }} onClick={() => setModalTask(t)}>
                          <strong className="small">{t.title}</strong>
                          <span className="small muted"> · {t.status} · {t.priority || "—"}</span>
                        </button>
                        <span className="badge">{t.due_date ? new Date(t.due_date).toLocaleDateString() : "No due date"}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pagination">
                  <button className="btn btn-ghost btn-sm" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
                  <span className="small muted">Page {safePage} of {totalPages}</span>
                  <button className="btn btn-ghost btn-sm" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
                </div>
              </section>

              <div className="stack">
                <section className="card" aria-label="Members">
                  <div className="spread" style={{ marginBottom: "0.75rem" }}>
                    <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Members ({members.length})</h2>
                    {isOwner ? <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(true)}>Invite</button> : null}
                  </div>
                  <div className="stack">
                    {members.length === 0 ? <p className="muted small">No members listed.</p> : null}
                    {members.map((m) => {
                      const mid = m.user_id || m.id;
                      const label = m.name || m.email || String(mid).slice(0, 8);
                      return (
                        <div key={mid} className="spread">
                          <span className="row">
                            <span className="avatar" aria-hidden="true">{String(label).charAt(0).toUpperCase()}</span>
                            <span className="small"><strong>{label}</strong> <span className="muted">{m.role ? `· ${m.role}` : ""}</span></span>
                          </span>
                          {isOwner && mid !== user?.id ? (
                            <button className="btn btn-ghost btn-sm" onClick={() => removeMember(mid)}>Remove</button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                  {!isOwner ? <p className="small muted" style={{ marginTop: "0.75rem", marginBottom: 0 }}>Only owners can invite or remove members.</p> : null}
                </section>

                <section className="card" aria-label="Activity">
                  <h2 style={{ margin: 0, marginBottom: "0.75rem", fontSize: "1.1rem" }}>
                    Activity {socketStatus === "Live" ? <span className="badge badge-green">live</span> : <span className="badge">updating on reconnect</span>}
                  </h2>
                  <ActivityFeed items={activity} />
                </section>
              </div>
            </div>
          </>
        )}

        {modalTask !== undefined ? (
          <TaskModal
            projectId={id}
            task={modalTask}
            members={members}
            onClose={() => setModalTask(undefined)}
            onSaved={() => {
              setModalTask(undefined);
              refreshTasks();
            }}
            onDeleted={() => {
              setModalTask(undefined);
              refreshTasks();
            }}
          />
        ) : null}

        {showInvite ? (
          <InviteModal
            projectId={id}
            onClose={() => setShowInvite(false)}
            onInvited={() => {
              setShowInvite(false);
              loadProject();
            }}
          />
        ) : null}
      </main>
    </div>
  );
}
