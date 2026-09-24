import Link from "next/link";
import { useState } from "react";
import { useAuth } from "../../lib/auth";
import DashboardPreview from "./DashboardPreview";

export default function HeroSection() {
  const { isAuthed } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <section className="tuf-hero">
      {/* single hero background layer — isolation fix for duplicate landscape bug */}
      <div className="tuf-hero-background" aria-hidden="true" />

      {/* transparent navbar positioned ON TOP OF hero image — not baked into the image */}
      <header className="landing-nav tuf-hero-nav">
        <div className="landing-nav-inner tuf-hero-nav-inner">
          <Link href="/" className="tuf-hero-logo" aria-label="TaskFlow home">
            <img src="/logo.png" alt="TaskFlow" width={28} height={28} className="tuf-hero-logo-img" />
            <span>TaskFlow</span>
          </Link>

          <nav className="tuf-hero-links landing-nav-center" aria-label="Primary">
            <Link href="#features" className="tuf-hero-link">Product</Link>
            <Link href="#features" className="tuf-hero-link">Features</Link>
            <a href="#faq" className="tuf-hero-link">How it works</a>
            <a href="#pricing" className="tuf-hero-link">Pricing</a>
          </nav>

          <div className="tuf-hero-actions nav-actions">
            {isAuthed ? (
              <Link href="/dashboard" className="tuf-btn-primary tuf-hero-cta">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="tuf-hero-link tuf-hero-link-muted">Log in</Link>
                <Link href="/signup" className="tuf-btn-primary tuf-hero-cta">Get started</Link>
              </>
            )}
            <button
              type="button"
              className="tuf-hero-menu-btn"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                {mobileOpen ? <path d="M6 18L18 6M6 6l12 12" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
              </svg>
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="tuf-hero-mobile">
            <Link href="#features" className="tuf-hero-mobile-link" onClick={() => setMobileOpen(false)}>Product</Link>
            <Link href="#features" className="tuf-hero-mobile-link" onClick={() => setMobileOpen(false)}>Features</Link>
            <a href="#faq" className="tuf-hero-mobile-link" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#pricing" className="tuf-hero-mobile-link" onClick={() => setMobileOpen(false)}>Pricing</a>
            {!isAuthed ? (
              <div className="tuf-hero-mobile-ctas">
                <Link href="/login" className="tuf-btn-secondary-lg" onClick={() => setMobileOpen(false)}>Log in</Link>
                <Link href="/signup" className="tuf-btn-primary" onClick={() => setMobileOpen(false)}>Get started</Link>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* centered hero content — above background, below dashboard preview */}
      <div className="hero-content tuf-hero-content tuf-container">
        <div className="tuf-hero-badge">
          <span className="tuf-hero-badge-dot" />
          Live boards update as your team works
        </div>
        <h1 className="tuf-hero-new-title">
          manage your work
          <br />
          without the busywork.
        </h1>
        <p className="tuf-hero-new-sub">plan tasks. collaborate. ship faster.</p>
        <div className="tuf-hero-new-ctas">
          <Link href={isAuthed ? "/dashboard" : "/signup"} className="tuf-btn-primary tuf-btn-primary-lg">
            Get started
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </Link>
          <Link href="#features" className="tuf-btn-secondary-lg tuf-hero-secondary">
            View demo
          </Link>
        </div>
      </div>

      {/* floating product preview — REAL TaskFlow dashboard screenshot, absolutely anchored to hero bottom */}
      <DashboardPreview />
    </section>
  );
}
