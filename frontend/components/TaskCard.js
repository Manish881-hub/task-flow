export function PriorityBadge({ priority }) {
  if (!priority) return null;
  const tone = priority === "High" ? "badge-red" : priority === "Medium" ? "badge-gold" : "badge-slate";
  return <span className={`badge ${tone}`}>{priority}</span>;
}

export function StatusBadge({ status }) {
  if (!status) return null;
  return <span className="badge badge-green">{status}</span>;
}

export default function TaskCard({ task, onOpen, draggable, onDragStart }) {
  const assignee = task.assignee_name || task.assignee?.name || task.assignee_email;
  return (
    <article
      className="task"
      role="button"
      tabIndex={0}
      aria-label={`Open task ${task.title}`}
      onClick={() => onOpen && onOpen(task)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen && onOpen(task);
        }
      }}
      draggable={Boolean(draggable)}
      onDragStart={(e) => onDragStart && onDragStart(e, task)}
    >
      <div className="task-title">{task.title}</div>
      {task.description ? <div className="small muted">{task.description.slice(0, 90)}</div> : null}
      <div className="task-meta" style={{ marginTop: "0.5rem" }}>
        <PriorityBadge priority={task.priority} />
        {assignee ? <span className="badge">{assignee}</span> : null}
        {task.due_date ? (
          <span className="badge">{new Date(task.due_date).toLocaleDateString()}</span>
        ) : null}
      </div>
    </article>
  );
}
