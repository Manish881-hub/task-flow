import { useState } from "react";
import { apiPost, getErrorMessage } from "../lib/api";

export default function InviteModal({ projectId, onClose, onInvited }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const v = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    setSaving(true);
    try {
      const res = await apiPost(`/api/v1/projects/${projectId}/members`, { email: v });
      onInvited(res?.member || res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Invite member" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>Invite member</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {error ? <div className="banner" role="alert">{error}</div> : null}
        <form onSubmit={submit} noValidate>
          <div className="field">
            <label className="label" htmlFor="invite-email">Email address</label>
            <input
              id="invite-email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError("");
              }}
              placeholder="teammate@example.com"
              autoComplete="email"
              required
            />
            {fieldError ? <span className="form-error">{fieldError}</span> : null}
            <span className="form-hint">They must already have a TaskFlow account.</span>
          </div>
          <div className="row">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Inviting…" : "Send invite"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}
