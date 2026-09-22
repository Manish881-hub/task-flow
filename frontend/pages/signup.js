import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ErrorBanner from "../components/ErrorBanner";
import { useAuth } from "../lib/auth";
import { getErrorMessage } from "../lib/api";

function passwordIssues(pw) {
  const issues = [];
  if (pw.length < 8) issues.push("at least 8 characters");
  if (!/[A-Za-z]/.test(pw)) issues.push("a letter");
  if (!/[0-9]/.test(pw)) issues.push("a digit");
  return issues;
}

export default function Signup() {
  const { user, authReady, signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
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
    if (name.trim().length < 2) fe.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) fe.email = "Enter a valid email.";
    const pwIssues = passwordIssues(password);
    if (pwIssues.length) fe.password = `Password needs ${pwIssues.join(", ")}.`;
    setFieldErrors(fe);
    if (Object.keys(fe).length) return;
    setBusy(true);
    try {
      await signup({ name: name.trim(), email: email.trim().toLowerCase(), password });
      router.replace("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <Head><title>Sign up — TaskFlow</title></Head>
      <Navbar />
      <main className="container main" style={{ maxWidth: "28rem" }}>
        <div className="card card-lg">
          <h1>Create your account</h1>
          <p className="muted">Start organizing work in under a minute.</p>
          <ErrorBanner message={error} onDismiss={() => setError("")} />
          <form onSubmit={submit} noValidate>
            <div className="field">
              <label className="label" htmlFor="name">Name</label>
              <input id="name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
              {fieldErrors.name ? <span className="form-error">{fieldErrors.name}</span> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              {fieldErrors.email ? <span className="form-error">{fieldErrors.email}</span> : null}
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              {fieldErrors.password ? <span className="form-error">{fieldErrors.password}</span> : null}
              <span className="form-hint">Min 8 characters, with at least one letter and one digit.</span>
            </div>
            <button type="submit" className="btn btn-accent btn-block" disabled={busy}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
          <p className="small muted" style={{ marginTop: "1rem", marginBottom: 0 }}>
            Have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
