import Link from "next/link";

/**
 * Shared dark split-screen shell for /login and /signup.
 *
 * Presentational only — no auth logic, no API calls, no redirects.
 * All session handling stays in `lib/auth.js` + page-level submit handlers.
 * This keeps the seam at the page (Matt `tdd` / `code-review` rule:
 * behavior through public interfaces, no business logic in layout).
 */
export default function AuthShell({ children }) {
  return (
    <div className="auth-page">
      <section className="auth-brand-panel" aria-label="TaskFlow">
        <div className="auth-brand-overlay" aria-hidden="true" />
        <div className="auth-brand-content">
          <Link href="/" className="auth-brand" aria-label="TaskFlow home">
            <img
              src="/logo.png"
              alt="TaskFlow"
              className="auth-brand-logo"
              width={32}
              height={32}
            />
            <span className="auth-brand-name">TaskFlow</span>
          </Link>

          <div className="auth-brand-spacer" aria-hidden="true" />

          <div className="auth-brand-quote">
            <p className="auth-brand-headline">
              Organize work. Ship faster.
            </p>
            <p className="auth-brand-sub">
              Everything your team needs in one place — boards, assignments,
              and live updates.
            </p>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-inner">{children}</div>
      </section>
    </div>
  );
}
