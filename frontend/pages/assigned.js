import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import EfferdPageShell from "../components/EfferdPageShell";
import RequireAuth from "../components/RequireAuth";
import EmptyState from "../components/EmptyState";
import Skeleton from "../components/Skeleton";
import ErrorBanner from "../components/ErrorBanner";
import { apiGet, getErrorMessage } from "../lib/api";
import { useTaskFlowSocket } from "../hooks/useSocket";

export default function Assigned() {
  return (
    <RequireAuth>
      <AssignedInner />
    </RequireAuth>
  );
}

function AssignedInner() {
  const { status: socketStatus, lastEvent } = useTaskFlowSocket();
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setState("loading");
      setError("");
    }
    try {
      const [taskData, projData] = await Promise.all([
        apiGet("/api/v1/assigned?per_page=100"),
        apiGet("/api/v1/projects?per_page=100").catch(() => []),
      ]);
      const list = Array.isArray(taskData) ? taskData : taskData?.items || taskData?.tasks || [];
      setTasks(list);
      const plist = Array.isArray(projData) ? projData : projData?.items || projData?.projects || [];
      setProjects(plist);
      setState("done");
    } catch (err) {
      setError(getErrorMessage(err));
      if (!silent) setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lastEvent && (lastEvent.type === "assigned_task_updated" || lastEvent.type?.includes("task"))) {
      load(true);
    }
  }, [lastEvent?._receivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const names = {};
  for (const p of projects) names[String(p.id)] = p.name;
  const visible = tasks.filter(
    (t) =>
      (filter === "all" ? true : t.status === filter) &&
      (projectFilter === "all" ? true : String(t.project_id) === projectFilter)
  );

  return (
    <EfferdPageShell title="Assigned to me" crumb="Assigned to me" socketStatus={socketStatus}>
      <ErrorBanner message={error} onRetry={load} onDismiss={() => setError("")} />

      <div className="dash-head">
        <div>
          <h1 className="dash-title">Assigned to me</h1>
          <p className="dash-subtitle">Every task assigned to you across all projects.</p>
        </div>
        <div className="dash-controls">
          {projects.length > 0 ? (
            <select
              className="dash-select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter by project"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          ) : null}
          <select
            className="dash-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {state === "loading" ? (
        <div className="stack"><Skeleton lines={4} /><Skeleton lines={4} /></div>
      ) : state === "error" && tasks.length === 0 ? (
        <EmptyState title="Could not load tasks" hint="Check your connection and retry." action={<button className="btn btn-primary" onClick={load}>Retry</button>} />
      ) : (
        <section className="eff-section" aria-label="Tasks">
          <div className="eff-section-head">
            <h2 className="eff-section-title">Tasks · {visible.length}</h2>
          </div>
          {visible.length === 0 ? (
            <EmptyState
              title="Nothing here"
              hint={tasks.length ? "No tasks match these filters." : "No tasks are assigned to you yet."}
            />
          ) : (
            <div>
              {visible.map((t) => (
                <div key={t.id} className="eff-row">
                  <div>
                    <strong className="dash-text-sm">{t.title}</strong>
                    <div className="dash-text-sm dash-muted">
                      {t.project_id ? (
                        <span>{names[String(t.project_id)] || `Project ${String(t.project_id).slice(0, 8)}`} · </span>
                      ) : null}
                      {t.priority ? <span>{t.priority} · </span> : null}
                      {t.due_date ? <span>Due {new Date(t.due_date).toLocaleDateString()}</span> : <span>No due date</span>}
                    </div>
                  </div>
                  <span className="dash-row">
                    <span className="badge badge-green">{t.status}</span>
                    {t.project_id ? (
                      <Link href={`/projects/${t.project_id}`} className="dash-btn-secondary dash-btn-sm">Open</Link>
                    ) : null}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </EfferdPageShell>
  );
}
