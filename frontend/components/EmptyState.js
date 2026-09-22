export default function EmptyState({ title, hint, action }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 13h6M9 17h4M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9l-6-6z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13 3v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h3 style={{ marginBottom: "0.25rem" }}>{title}</h3>
      {hint ? <p className="muted small" style={{ margin: "0 auto 1rem auto" }}>{hint}</p> : null}
      {action || null}
    </div>
  );
}
