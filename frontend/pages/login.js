import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../lib/auth";
import { getErrorMessage } from "../lib/api";

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.72-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12v3.15c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export default function Login() {
  const { user, authReady, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (authReady && user) router.replace("/dashboard");
  }, [authReady, user, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    const fe = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fe.email = "Enter a valid email.";
    if (!password) fe.password = "Enter your password.";
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      const next = typeof router.query.next === "string" ? router.query.next : "/dashboard";
      router.replace(next);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <Head><title>Log in — TaskFlow</title></Head>
      <h1 className="auth-title">Welcome back</h1>
      <p className="auth-subtitle">Log in to your TaskFlow workspace.</p>
      <ErrorBanner message={error} onDismiss={() => setError("")} />
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email" type="email" className="input" autoComplete="email"
            placeholder="you@team.com"
            value={email} onChange={(e) => setEmail(e.target.value)} required
          />
          {fieldErrors.email ? <span className="form-error">{fieldErrors.email}</span> : null}
        </div>
        <div className="field">
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password" type="password" className="input" autoComplete="current-password"
            placeholder="••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} required
          />
          {fieldErrors.password ? <span className="form-error">{fieldErrors.password}</span> : null}
        </div>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="auth-divider" aria-hidden="true">Or continue with</div>

      {/* Visual placeholder only — no OAuth backend exists yet.
          Disabled so email/password + session behavior is unchanged. */}
      <button
        type="button"
        className="btn auth-btn-github"
        disabled
        title="GitHub sign-in is not configured yet — use email for now."
        aria-disabled="true"
      >
        <GitHubIcon />
        GitHub
      </button>

      <p className="auth-footer">
        Don&apos;t have an account? <Link href="/signup">Sign up</Link>
      </p>
    </AuthShell>
  );
}
