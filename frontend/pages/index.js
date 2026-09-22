import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect } from "react";
import Navbar from "../components/Navbar";
import Skeleton from "../components/Skeleton";
import { useAuth } from "../lib/auth";

function CheckIcon() {
  return (
    <svg className="check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Home() {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && user) router.replace("/dashboard");
  }, [authReady, user, router]);

  if (!authReady) {
    return (
      <div className="page">
        <Navbar />
        <main className="container main">
          <Skeleton lines={5} />
        </main>
      </div>
    );
  }

  if (user) return null; // redirecting

  return (
    <div className="page">
      <Head>
        <title>TaskFlow — Team task boards, live</title>
        <meta name="description" content="Create projects, manage tasks on a board, and see teammates' changes live." />
      </Head>
      <Navbar />
      <main className="container main">
        <section className="hero">
          <div>
            <span className="badge badge-green">Live collaboration</span>
            <h1>Team task boards that stay in sync.</h1>
            <p className="lead">
              Create projects, invite teammates, drag tasks across the board,
              and watch every change arrive live over WebSockets.
            </p>
            <div className="row" style={{ marginTop: "1.25rem" }}>
              <Link href="/signup" className="btn btn-accent">Start free</Link>
              <Link href="/login" className="btn btn-ghost">Log in</Link>
            </div>
            <ul className="check-list">
              <li><CheckIcon /> Projects with owner / member roles</li>
              <li><CheckIcon /> Board, backlog search, filters, and sorting</li>
              <li><CheckIcon /> Comments and a live activity feed</li>
            </ul>
          </div>
          <div className="hero-card">
            <div className="card card-lg">
              <div className="card-title">Demo Sprint</div>
              <p className="muted small">How a project looks once your team joins.</p>
              <div className="grid grid-3" style={{ marginTop: "1rem" }}>
                {[
                  { col: "To Do", n: 2, tone: "" },
                  { col: "In Progress", n: 1, tone: "badge-gold" },
                  { col: "Done", n: 1, tone: "badge-green" },
                ].map((c) => (
                  <div key={c.col} className="column" style={{ background: "#fff" }}>
                    <div className="column-head">
                      <span className="column-title">{c.col}</span>
                      <span className="count">{c.n}</span>
                    </div>
                    <div className="task"><div className="task-title">Design onboarding</div></div>
                    {c.n > 1 ? <div className="task"><div className="task-title">Write API docs</div></div> : null}
                  </div>
                ))}
              </div>
            </div>
            <div className="card">
              <div className="spread">
                <strong>Live updates</strong>
                <span className="live-pill"><span className="live-dot on" /> Live</span>
              </div>
              <p className="muted small" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                When a teammate moves a card, your board updates instantly — no refresh needed.
              </p>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        <div className="container spread">
          <span>TaskFlow — built for small teams.</span>
          <span>Flat, fast, accessible.</span>
        </div>
      </footer>
    </div>
  );
}
