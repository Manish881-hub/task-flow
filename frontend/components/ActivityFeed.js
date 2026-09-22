export default function ActivityFeed({ items }) {
  if (!items || items.length === 0) {
    return <p className="muted small">No activity yet.</p>;
  }
  return (
    <div className="activity" aria-live="polite">
      {items.map((a, i) => {
        const name = a.user_name || a.user?.name || a.actor || "Someone";
        const initial = String(name).charAt(0).toUpperCase();
        const text = a.description || a.text || a.event_type || "Activity";
        const when = a.created_at ? new Date(a.created_at).toLocaleString() : "";
        return (
          <div key={a.id || `${when}-${i}`} className="activity-item">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <div>
              <div className="small"><strong>{name}</strong> <span className="muted">{text}</span></div>
              {when ? <div className="small muted">{when}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
