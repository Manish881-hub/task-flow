import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { apiGet } from "../lib/api";

/**
 * Global command palette: live search across projects + assigned tasks.
 * Opens from the header search trigger or Command-K. Keyboard-first:
 * ArrowUp/Down moves, Enter opens, Escape closes.
 */
export default function SearchPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | done | error
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const [p, t] = await Promise.all([
        apiGet("/api/v1/projects?per_page=100").catch(() => []),
        apiGet("/api/v1/assigned?per_page=100").catch(() => []),
      ]);
      setProjects(Array.isArray(p) ? p : []);
      setTasks(Array.isArray(t) ? t : []);
      setState("done");
    } catch {
      setState("error");
    }
  }, []);

  // Reset + load each time the palette opens; lock body scroll.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    load();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, load]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (s) => !q || String(s || "").toLowerCase().includes(q);
    const proj = projects
      .filter((p) => match(p.name) || match(p.description))
      .slice(0, q ? 6 : 8)
      .map((p) => ({ kind: "project", id: `p-${p.id}`, title: p.name, sub: "Project", target: `/projects/${p.id}`, raw: p }));
    const task = tasks
      .filter((t) => match(t.title) || match(t.description))
      .slice(0, q ? 8 : 8)
      .map((t) => ({
        kind: "task",
        id: `t-${t.id}`,
        title: t.title,
        sub: `${t.status || ""}${t.project_name ? ` · ${t.project_name}` : ""}`,
        target: t.project_id ? `/projects/${t.project_id}` : "/assigned",
        raw: t,
      }));
    return [...proj, ...task];
  }, [projects, tasks, query]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (item) => {
      if (!item) return;
      onClose();
      router.push(item.target);
    },
    [onClose, router]
  );

  const onKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  // Keep the active option visible.
  useEffect(() => {
    const el = listRef.current && listRef.current.querySelector(`[data-idx="${active}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div className="palette-overlay" onClick={onClose}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search projects and tasks"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="palette-input-row">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="m21 21-4.34-4.34" />
            <circle cx="11" cy="11" r="8" />
          </svg>
          <input
            ref={inputRef}
            className="palette-input"
            placeholder="Search projects and tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-autocomplete="list"
            aria-activedescendant={results[active] ? results[active].id : undefined}
          />
          <button type="button" className="icon-btn" aria-label="Close search" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div id="palette-list" ref={listRef} className="palette-list" role="listbox" aria-label="Results">
          {state === "loading" ? <p className="muted small palette-hint">Loading workspace…</p> : null}
          {state === "error" ? <p className="form-error palette-hint">Could not load. Check your connection.</p> : null}
          {state === "done" && results.length === 0 ? (
            <p className="muted small palette-hint">
              {query.trim() ? `No matches for “${query.trim()}”.` : "No projects or tasks yet."}
            </p>
          ) : null}
          {results.map((r, i) => (
            <button
              key={r.id}
              id={r.id}
              data-idx={i}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`palette-item${i === active ? " active" : ""}`}
              onClick={() => go(r)}
              onMouseMove={() => setActive(i)}
            >
              <span className={`palette-kind palette-kind-${r.kind}`} aria-hidden="true">
                {r.kind === "project" ? "P" : "T"}
              </span>
              <span className="palette-text">
                <strong className="small">{r.title}</strong>
                {r.sub ? <span className="small muted"> · {r.sub}</span> : null}
              </span>
              <span className="badge">{r.kind === "project" ? "Board" : r.raw.status || "Task"}</span>
            </button>
          ))}
        </div>

        <div className="palette-foot" aria-hidden="true">
          <span><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
          <span><kbd className="kbd">↵</kbd> open</span>
          <span><kbd className="kbd">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
