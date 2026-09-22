import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/auth";

export default function LandingNavbar() {
  const { user, isAuthed } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="tuf-navbar">
      <div className="tuf-container tuf-nav-inner">
        <Link href="/" className="tuf-logo" aria-label="TaskFlow Home">
          <img
            src="/logo.png"
            alt="TaskFlow Logo"
            className="tuf-logo-img"
            width={34}
            height={34}
          />
          <span className="tuf-logo-text">
            TaskFlow
          </span>
        </Link>

        <nav className="tuf-nav-links" aria-label="Main Navigation">
          <Link href={isAuthed ? "/dashboard" : "/login"} className="tuf-nav-link">
            Dashboard
          </Link>
          <a href="#features" className="tuf-nav-link">
            Explore
          </a>
          <a href="#faq" className="tuf-nav-link">
            FAQ
          </a>
        </nav>

        <div className="tuf-nav-actions">
          {isAuthed ? (
            <Link href="/dashboard" className="tuf-btn-primary">
              Go to Dashboard
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>
          ) : (
            <>
              <Link href="/login" className="tuf-btn-link">
                Log in
              </Link>
              <Link href="/signup" className="tuf-btn-primary">
                Get Started
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </>
          )}

          <button
            type="button"
            className="tuf-mobile-menu-btn"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div style={{ background: "#ffffff", borderBottom: "1px solid #e2e8f0", padding: "1rem 1.5rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <Link href={isAuthed ? "/dashboard" : "/login"} className="tuf-nav-link" onClick={() => setMobileOpen(false)}>
              Dashboard
            </Link>
            <a href="#features" className="tuf-nav-link" onClick={() => setMobileOpen(false)}>
              Explore
            </a>
            <a href="#faq" className="tuf-nav-link" onClick={() => setMobileOpen(false)}>
              FAQ
            </a>
            <hr style={{ border: "none", borderTop: "1px solid #f1f5f9", margin: "0.5rem 0" }} />
            {!isAuthed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <Link href="/login" className="tuf-btn-secondary-lg" onClick={() => setMobileOpen(false)}>
                  Log in
                </Link>
                <Link href="/signup" className="tuf-btn-primary" style={{ textAlign: "center" }} onClick={() => setMobileOpen(false)}>
                  Get Started &gt;
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}
