import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import EfferdPageShell from "../../components/EfferdPageShell";
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

  // Backlog controls — server-side (spec item 14): every change hits
  // GET /projects/{id}/tasks?status&priority&assignee_id&search&sort&order&page.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [sort, setSort] = useState("created_desc");
  const [page, setPage] = useState(1);
  const [backlog, setBacklog] = useState([]);
  const [backlogMeta, setBacklogMeta] = useState({ total: 0, total_pages: 1 });
  const [backlogState, setBacklogState] = useState("idle");
  const [backlogError, setBacklogError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

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
        apiGet(`/api/v1/projects/${id}/tasks?per_page=100`),
        apiGet(`/api/v1/projects/${id}/activity?per_page=30`).catch(() => []),
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
        apiGet(`/api/v1/projects/${id}/tasks?per_page=100`),
        apiGet(`/api/v1/projects/${id}/activity?per_page=30`).catch(() => []),
      ]);
      setTasks(Array.isArray(t) ? t : t?.items || t?.tasks || []);
      setActivity(Array.isArray(a) ? a : a?.items || a?.activity || []);
    } catch {}
  }, [id]);

  // Server-side backlog fetch. Board columns above keep using the full
  // `tasks` list; this list is the paginated/sorted/filtered backlog view.
  const loadBacklog = useCallback(async () => {
    if (!id) return;
    setBacklogState("loading");
    setBacklogError("");
    const params = new URLSearchParams({ page: String(page), per_page: "10" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (priorityFilter !== "all") params.set("priority", priorityFilter);
    if (assigneeFilter !== "all") params.set("assignee_id", assigneeFilter);
    if (debouncedSearch) params.set("search", debouncedSearch);
    const sortMap = {
      created_desc: ["created_at", "desc"],
      created_asc: ["created_at", "asc"],
      due_asc: ["due_date", "asc"],
      due_desc: ["due_date", "desc"],
      priority: ["priority", "desc"],
    };
    const [sortField, sortOrder] = sortMap[sort] || ["created_at", "desc"];
    params.set("sort", sortField);
    params.set("order", sortOrder);
    try {
      const res = await apiGet(`/api/v1/projects/${id}/tasks?${params.toString()}`);
      const list = Array.isArray(res) ? res : res?.items || res?.tasks || res || [];
      const items = Array.isArray(list) ? list : [];
      setBacklog(items);
      setBacklogMeta({
        total: res?.meta?.total ?? items.length,
        total_pages: res?.meta?.total_pages ?? 1,
      });
      setBacklogState("done");
    } catch (err) {
      setBacklogError(getErrorMessage(err));
      setBacklogState("error");
    }
  }, [id, page, statusFilter, priorityFilter, assigneeFilter, debouncedSearch, sort]);

  useEffect(() => {
    if (id) loadBacklog();
  }, [id, loadBacklog]);

  // Live updates: board refetch + backlog refetch stay consistent.
  useEffect(() => {
    if (lastEvent) {
      refreshTasks();
      loadBacklog();
    }
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

  // Backlog rows come from the server (loadBacklog). Board columns below
  // keep using the full `tasks` list fetched for the kanban view.
  const safePage = Math.max(1, page);
  const totalPages = Math.max(1, backlogMeta.total_pages || 1);

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
      await apiPatch(`/api/v1/projects/${id}/tasks/${taskId}`, { status: nextStatus });
      refreshTasks();
      loadBacklog();
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
    <EfferdPageShell
      title={project?.name ? project.name : "Project"}
      crumb={project?.name ? project.name : "Project"}
      socketStatus={socketStatus}
      currentProjectId={typeof id === "string" ? id : undefined}
      headRight={
        socketStatus === "Live"
          ? <span className="badge badge-green">live</span>
          : <span className="badge">reconnecting</span>
      }
    >
      <ErrorBanner message={error} onRetry={loadProject} onDismiss={() => setError("")} />

      {state === "loading" && !project ? (
        <Skeleton lines={5} />
      ) : state === "error" && !project ? (
        <EmptyState title="Could not load project" hint="It may have been deleted or you lost access." action={<button className="btn btn-primary" onClick={loadProject}>Retry</button>} />
      ) : (
        <>
          <div className="dash-head">
            <div>
              <h1 className="dash-title">{project?.name}</h1>
              {project?.description ? <p className="dash-subtitle">{project.description}</p> : null}
            </div>
            <div className="dash-controls">
              <button className="btn btn-accent btn-sm" onClick={() => setModalTask(null)}>New task</button>
              {isOwner ? <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(true)}>Invite</button> : null}
            </div>
          </div>

            {state === "loading" ? (
              <div className="grid grid-3"><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
            ) : tasks.length === 0 ? (
              <section className="eff-section" aria-label="Board">
                <EmptyState
                  title="No tasks yet"
                  hint="Create the first task to populate the board."
                  action={<button className="btn btn-accent" onClick={() => setModalTask(null)}>Create task</button>}
                />
              </section>
            ) : (
              <section aria-label="Board" className="eff-section">
                <div className="eff-section-head">
                  <h2 className="eff-section-title">Board · {tasks.length}</h2>
                </div>
                <div className="board">
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
                </div>
              </section>
            )}

            <div className="dash-grid">
              <section className="eff-section" aria-label="Backlog">
                <div className="eff-section-head">
                  <h2 className="eff-section-title">Backlog <span className="small muted">· server-side · {backlogMeta.total} total</span></h2>
                </div>
                <div className="toolbar">
                  <input
                    id="backlog-search"
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
                  <select className="select" value={assigneeFilter} onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }} aria-label="Filter by assignee">
                    <option value="all">All assignees</option>
                    <option value="unassigned" disabled>— pick a member —</option>
                    {members.map((m) => (
                      <option key={m.user_id || m.id} value={m.user_id || m.id}>{m.name || m.email}</option>
                    ))}
                  </select>
                  <select className="select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort tasks">
                    <option value="created_desc">Newest</option>
                    <option value="created_asc">Oldest</option>
                    <option value="due_asc">Due soon</option>
                    <option value="due_desc">Due later</option>
                    <option value="priority">Priority</option>
                  </select>
                </div>
                {backlogState === "loading" ? (
                  <p className="muted small">Loading backlog…</p>
                ) : backlogState === "error" ? (
                  <p className="form-error">{backlogError || "Could not load backlog."} <button className="btn btn-ghost btn-sm" onClick={loadBacklog}>Retry</button></p>
                ) : backlog.length === 0 ? (
                  <p className="muted small">No tasks match these filters.</p>
                ) : (
                  <div>
                    {backlog.map((t) => (
                      <div key={t.id} className="eff-row">
                        <button className="nav-link" style={{ textAlign: "left" }} onClick={() => setModalTask(t)}>
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

              <div className="dash-rail">
                <section className="eff-section" aria-label="Members">
                  <div className="eff-section-head">
                    <h2 className="eff-section-title">Members ({members.length})</h2>
                    {isOwner ? <button className="btn btn-ghost btn-sm" onClick={() => setShowInvite(true)}>Invite</button> : null}
                  </div>
                  <div>
                    {members.length === 0 ? <p className="muted small">No members listed.</p> : null}
                    {members.map((m) => {
                      const mid = m.user_id || m.id;
                      const label = m.name || m.email || String(mid).slice(0, 8);
                      return (
                        <div key={mid} className="eff-row">
                          <span className="dash-row">
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

                <section className="eff-section" aria-label="Activity">
                  <div className="eff-section-head">
                    <h2 className="eff-section-title">Activity</h2>
                    {socketStatus === "Live" ? <span className="badge badge-green">live</span> : <span className="badge">updating on reconnect</span>}
                  </div>
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
              loadBacklog();
            }}
            onDeleted={() => {
              setModalTask(undefined);
              refreshTasks();
              loadBacklog();
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
    </EfferdPageShell>
  );
}
