import Head from "next/head";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Navbar from "../components/Navbar";
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
  const [state, setState] = useState("loading");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setState("loading");
    setError("");
    try {
      const data = await apiGet("/api/v1/assigned");
      const list = Array.isArray(data) ? data : data?.items || data?.tasks || [];
      setTasks(list);
      setState("done");
    } catch (err) {
      setError(getErrorMessage(err));
      setState("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (lastEvent && (lastEvent.type === "assigned_task_updated" || lastEvent.type?.includes("task"))) {
      load();
    }
  }, [lastEvent?._receivedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = tasks.filter((t) => (filter === "all" ? true : t.status === filter));

  return (
    <div className="page">
      <Head><title>Assigned to me — TaskFlow</title></Head>
      <Navbar socketStatus={socketStatus} />
      <main className="container main">
        <div className="spread" style={{ marginBottom: "1rem" }}>
          <div>
            <h1 style={{ marginBottom: "0.2rem" }}>Assigned to me</h1>
            <p className="muted" style={{ margin: 0 }}>Every task assigned to you, across all projects.</p>
          </div>
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            <option value="To Do">To Do</option>
            <option value="In Progress">In Progress</option>
            <option value="Done">Done</option>
          </select>
        </div>

        <ErrorBanner message={error} onRetry={load} onDismiss={() => setError("")} />

        {state === "loading" ? (
          <div className="stack"><Skeleton lines={4} /><Skeleton lines={4} /></div>
        ) : state === "error" && tasks.length === 0 ? (
          <EmptyState title="Could not load tasks" hint="Check your connection and retry." action={<button className="btn btn-primary" onClick={load}>Retry</button>} />
        ) : visible.length === 0 ? (
          <EmptyState title="Nothing here" hint={tasks.length ? "No tasks match this filter." : "No tasks are assigned to you yet."} />
        ) : (
          <div className="stack">
            {visible.map((t) => (
              <div key={t.id} className="card spread">
                <div>
                  <strong>{t.title}</strong>
                  <div className="small muted">
                    {t.project_name || t.project_id ? (
                      <span>Project: {t.project_name || String(t.project_id).slice(0, 8)} · </span>
                    ) : null}
                    {t.priority ? <span>{t.priority} · </span> : null}
                    {t.due_date ? <span>Due {new Date(t.due_date).toLocaleDateString()}</span> : null}
                  </div>
                </div>
                <span className="row">
                  <span className="badge badge-green">{t.status}</span>
                  {t.project_id ? (
                    <Link href={`/projects/${t.project_id}`} className="btn btn-ghost btn-sm">Open</Link>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
