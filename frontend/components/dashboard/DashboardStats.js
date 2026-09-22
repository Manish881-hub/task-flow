/**
 * Real-data stats strip: counts derived from the projects + assigned lists
 * already loaded by the page. No sampled numbers, no fake deltas.
 */
export default function DashboardStats({ projects, assigned }) {
  const open = assigned.filter((t) => t.status !== "Done");
  const done = assigned.filter((t) => t.status === "Done");
  const todo = open.filter((t) => t.status === "To Do").length;
  const progress = open.filter((t) => t.status === "In Progress").length;
  const total = todo + progress + done.length || 1;

  const pct = (n) => `${Math.round((n / total) * 100)}%`;

  return (
    <div className="efferd-stats" aria-label="Workspace stats">
      <div className="efferd-stat-card">
        <div className="efferd-stat-label">Projects</div>
        <div className="efferd-stat-value">{projects.length}</div>
        <div className="efferd-stat-legend">
          <span>{open.length} open assigned</span>
        </div>
      </div>
      <div className="efferd-stat-card">
        <div className="efferd-stat-label">Assigned to me</div>
        <div className="efferd-stat-value">{assigned.length}</div>
        <div className="efferd-stat-legend">
          <span>{done.length} completed</span>
        </div>
      </div>
      <div className="efferd-stat-card">
        <div className="efferd-stat-label">By status</div>
        <div className="efferd-stat-value">{assigned.length}</div>
        <div className="efferd-stat-bar" role="img" aria-label={`${todo} to do, ${progress} in progress, ${done.length} done`}>
          <span className="efferd-stat-fill todo" style={{ width: pct(todo) }} />
          <span className="efferd-stat-fill progress" style={{ width: pct(progress) }} />
          <span className="efferd-stat-fill done" style={{ width: pct(done.length) }} />
        </div>
        <div className="efferd-stat-legend">
          <span><i className="efferd-stat-fill todo" />To Do {todo}</span>
          <span><i className="efferd-stat-fill progress" />In Progress {progress}</span>
          <span><i className="efferd-stat-fill done" />Done {done.length}</span>
        </div>
      </div>
    </div>
  );
}
