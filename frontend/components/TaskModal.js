import { useEffect, useState } from "react";
import { apiDelete, apiGet, apiPost, getErrorMessage } from "../lib/api";

const STATUSES = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

function validate(values) {
  const errors = {};
  if (!values.title || values.title.trim().length < 3) {
    errors.title = "Title must be at least 3 characters.";
  } else if (values.title.trim().length > 120) {
    errors.title = "Title must be under 120 characters.";
  }
  if (values.description && values.description.length > 2000) {
    errors.description = "Description must be under 2000 characters.";
  }
  if (!STATUSES.includes(values.status)) errors.status = "Pick a valid status.";
  if (values.priority && !PRIORITIES.includes(values.priority)) {
    errors.priority = "Pick a valid priority.";
  }
  if (values.due_date) {
    const d = new Date(values.due_date);
    if (Number.isNaN(d.getTime())) errors.due_date = "Invalid date.";
  }
  return errors;
}

export default function TaskModal({ projectId, task, members, onClose, onSaved, onDeleted }) {
  const editing = Boolean(task?.id);
  const [values, setValues] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "To Do",
    priority: task?.priority || "Medium",
    due_date: task?.due_date ? String(task.due_date).slice(0, 10) : "",
    assignee_id: task?.assignee_id || "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [comments, setComments] = useState([]);
  const [commentsState, setCommentsState] = useState("idle");
  const [commentText, setCommentText] = useState("");
  const [commentError, setCommentError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    setCommentsState("loading");
    apiGet(`/api/v1/tasks/${task.id}/comments`)
      .then((data) => {
        if (cancelled) return;
        setComments(Array.isArray(data) ? data : data?.items || data?.comments || []);
        setCommentsState("done");
      })
      .catch(() => {
        if (!cancelled) setCommentsState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [editing, task?.id]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = (k) => (e) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate(values);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    setSubmitError("");
    const payload = {
      title: values.title.trim(),
      description: values.description.trim() || null,
      status: values.status,
      priority: values.priority,
      due_date: values.due_date || null,
      assignee_id: values.assignee_id || null,
    };
    try {
      let saved;
      if (editing) {
        const { apiPatch } = await import("../lib/api");
        saved = await apiPatch(`/api/v1/tasks/${task.id}`, payload);
      } else {
        saved = await apiPost(`/api/v1/projects/${projectId}/tasks`, payload);
      }
      onSaved(saved);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    setSaving(true);
    try {
      await apiDelete(`/api/v1/tasks/${task.id}`);
      onDeleted(task);
    } catch (err) {
      setSubmitError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    setCommentError("");
    const text = commentText.trim();
    if (text.length < 1) {
      setCommentError("Comment cannot be empty.");
      return;
    }
    if (text.length > 1000) {
      setCommentError("Comment must be under 1000 characters.");
      return;
    }
    try {
      const created = await apiPost(`/api/v1/tasks/${task.id}/comments`, { content: text });
      setComments((c) => [...c, created?.comment || created]);
      setCommentText("");
    } catch (err) {
      setCommentError(getErrorMessage(err));
    }
  };

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={editing ? "Edit task" : "Create task"} onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 style={{ margin: 0 }}>{editing ? "Edit task" : "New task"}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {submitError ? <div className="banner" role="alert">{submitError}</div> : null}

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="label" htmlFor="task-title">Title</label>
            <input id="task-title" className="input" value={values.title} onChange={set("title")} maxLength={120} required />
            {errors.title ? <span className="form-error">{errors.title}</span> : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="task-desc">Description</label>
            <textarea id="task-desc" className="textarea" value={values.description} onChange={set("description")} maxLength={2000} />
            {errors.description ? <span className="form-error">{errors.description}</span> : null}
          </div>

          <div className="form-row two">
            <div className="field">
              <label className="label" htmlFor="task-status">Status</label>
              <select id="task-status" className="select" value={values.status} onChange={set("status")}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {errors.status ? <span className="form-error">{errors.status}</span> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="task-priority">Priority</label>
              <select id="task-priority" className="select" value={values.priority} onChange={set("priority")}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              {errors.priority ? <span className="form-error">{errors.priority}</span> : null}
            </div>
          </div>

          <div className="form-row two">
            <div className="field">
              <label className="label" htmlFor="task-due">Due date</label>
              <input id="task-due" type="date" className="input" value={values.due_date} onChange={set("due_date")} />
              {errors.due_date ? <span className="form-error">{errors.due_date}</span> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="task-assignee">Assignee</label>
              <select id="task-assignee" className="select" value={values.assignee_id} onChange={set("assignee_id")}>
                <option value="">Unassigned</option>
                {(members || []).map((m) => (
                  <option key={m.user_id || m.id} value={m.user_id || m.id}>
                    {m.name || m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="row" style={{ marginTop: "0.5rem" }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Create task"}
            </button>
            {editing ? (
              <button type="button" className="btn btn-danger" disabled={saving} onClick={handleDelete}>
                Delete
              </button>
            ) : null}
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
          </div>
        </form>

        {editing ? (
          <>
            <hr className="divider" />
            <h3>Comments</h3>
            {commentsState === "loading" ? <p className="muted small">Loading comments…</p> : null}
            {commentsState === "error" ? <p className="form-error">Could not load comments.</p> : null}
            <div className="stack" style={{ marginBottom: "0.9rem" }}>
              {comments.length === 0 && commentsState === "done" ? (
                <p className="muted small">No comments yet.</p>
              ) : null}
              {comments.map((c) => (
                <div key={c.id || c.created_at + c.content} className="comment">
                  <div className="small" style={{ fontWeight: 700 }}>
                    {c.author_name || c.user_name || c.user?.name || "Member"}
                    <span className="muted" style={{ fontWeight: 400 }}>
                      {" "}· {c.created_at ? new Date(c.created_at).toLocaleString() : ""}
                    </span>
                  </div>
                  <div className="small">{c.content}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment}>
              <div className="field">
                <label className="label" htmlFor="new-comment">Add a comment</label>
                <textarea
                  id="new-comment"
                  className="textarea"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  maxLength={1000}
                  placeholder="Write an update…"
                />
                {commentError ? <span className="form-error">{commentError}</span> : null}
              </div>
              <button type="submit" className="btn btn-ghost btn-sm">Post comment</button>
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
