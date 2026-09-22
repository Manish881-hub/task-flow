import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../lib/auth";
import { getErrorMessage } from "../lib/api";

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
    <div className="page">
      <Head><title>Log in — TaskFlow</title></Head>
      <Navbar />
      <main className="container main" style={{ maxWidth: "28rem" }}>
        <div className="card card-lg">
          <h1>Welcome back</h1>
          <p className="muted">Log in to your TaskFlow workspace.</p>
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email" type="email" className="input" autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)} required
              />
              {fieldErrors.email ? <span className="form-error">{fieldErrors.email}</span> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input
                id="password" type="password" className="input" autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)} required
              />
              {fieldErrors.password ? <span className="form-error">{fieldErrors.password}</span> : null}
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
            No account? <Link href="/signup">Sign up</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
