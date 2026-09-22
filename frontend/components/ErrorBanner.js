export default function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null;
  return (
    <div className="banner" role="alert">
      <div className="spread">
        <span>{message}</span>
        <span className="row">
          {onRetry ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
              Retry
            </button>
          ) : null}
          {onDismiss ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDismiss} aria-label="Dismiss error">
              Dismiss
            </button>
          ) : null}
        </span>
      </div>
    </div>
  );
}
