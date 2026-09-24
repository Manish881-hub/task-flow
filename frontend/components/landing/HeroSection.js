import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../lib/auth";
import DashboardPreview from "./DashboardPreview";

const TASKFLOW_CALENDLY_URL = "https://calendly.com/manishbhakti881/30min";

const PRODUCT_ITEMS = [
  { label: "Task Boards", desc: "Organize projects with drag-and-drop boards", href: "#features" },
  { label: "Real-time Sync", desc: "See updates as your team works", href: "#features" },
  { label: "Teams & Roles", desc: "Manage members and access", href: "#features" },
  { label: "Workflows", desc: "Customize how work moves", href: "#features" },
];

export default function HeroSection() {
  const { isAuthed } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (productRef.current && !productRef.current.contains(e.target)) setProductOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <>
      {/* Floating sticky glass navbar — light version for bright hero */}
      <header className="tuf-glass-sticky-wrap">
        <div className="tuf-glass-nav">
          <Link href="/" className="tuf-hero-logo tuf-glass-logo" aria-label="TaskFlow home">
            <img src="/logo.png" alt="TaskFlow" width={28} height={28} className="tuf-hero-logo-img" />
            <span>TaskFlow</span>
          </Link>

          <nav className="tuf-glass-center" aria-label="Primary">
            <div className="tuf-product-wrap" ref={productRef}>
              <button
                type="button"
                aria-expanded={productOpen}
                aria-haspopup="true"
                className={`tuf-glass-link tuf-glass-product ${productOpen ? "is-open" : ""}`}
                onClick={() => setProductOpen((v) => !v)}
                onMouseEnter={() => setProductOpen(true)}
              >
                Product
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`tuf-plus-icon ${productOpen ? "is-open" : ""}`}
                  aria-hidden="true"
                >
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              {productOpen ? (
                <div
                  className="tuf-product-dropdown"
                  onMouseLeave={() => setProductOpen(false)}
                >
                  <div className="tuf-product-dropdown-label">PRODUCT</div>
                  {PRODUCT_ITEMS.map((it) => (
                    <Link key={it.label} href={it.href} className="tuf-product-item" onClick={() => setProductOpen(false)}>
                      <span className="tuf-product-item-title">{it.label}</span>
                      <span className="tuf-product-item-desc">{it.desc}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <Link href="#features" className="tuf-glass-link">Resources</Link>
            <a href="#pricing" className="tuf-glass-link">Pricing</a>
          </nav>

          <div className="tuf-glass-actions">
            {isAuthed ? (
              <Link href="/dashboard" className="tuf-btn-primary tuf-hero-cta">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="tuf-glass-link tuf-glass-link-muted">Log in</Link>
                <a
                  href={TASKFLOW_CALENDLY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="tuf-glass-link tuf-glass-demo"
                >
                  Book a demo
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
                <Link href="/signup" className="tuf-btn-primary tuf-hero-cta">
                  Get started
                </Link>
              </>
            )}
            <button
              type="button"
              className="tuf-glass-menu-btn"
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

        {/* Mobile overlay — floating rounded glass, not full-screen dark */}
        {mobileOpen ? (
          <div className="tuf-glass-mobile-overlay" role="dialog" aria-modal="true">
            <div className="tuf-glass-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-hidden="true" />
            <div className="tuf-glass-mobile-panel">
              <div className="tuf-glass-mobile-head">
                <Link href="/" className="tuf-hero-logo" aria-label="TaskFlow home" onClick={() => setMobileOpen(false)}>
                  <img src="/logo.png" alt="TaskFlow" width={28} height={28} className="tuf-hero-logo-img" />
                  <span>TaskFlow</span>
                </Link>
                <button type="button" aria-label="Close menu" className="tuf-glass-mobile-close" onClick={() => setMobileOpen(false)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="tuf-glass-mobile-body">
                <div className="tuf-glass-mobile-label">Product</div>
                {PRODUCT_ITEMS.map((it) => (
                  <Link key={it.label} href={it.href} className="tuf-glass-mobile-link" onClick={() => setMobileOpen(false)}>
                    <span className="tuf-glass-mobile-link-title">{it.label}</span>
                    <span className="tuf-glass-mobile-link-desc">{it.desc}</span>
                  </Link>
                ))}
                <div className="tuf-glass-mobile-sep" />
                <Link href="#features" className="tuf-glass-mobile-link" onClick={() => setMobileOpen(false)}>Resources</Link>
                <a href="#pricing" className="tuf-glass-mobile-link" onClick={() => setMobileOpen(false)}>Pricing</a>
              </div>
              {!isAuthed ? (
                <div className="tuf-glass-mobile-ctas">
                  <Link href="/login" className="tuf-btn-secondary-lg" onClick={() => setMobileOpen(false)}>Log in</Link>
                  <a href={TASKFLOW_CALENDLY_URL} target="_blank" rel="noopener noreferrer" className="tuf-btn-secondary-lg" onClick={() => setMobileOpen(false)}>
                    Book a demo →
                  </a>
                  <Link href="/signup" className="tuf-btn-primary" onClick={() => setMobileOpen(false)}>Get started</Link>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      <section className="tuf-hero">
        <div className="tuf-hero-background" aria-hidden="true" />

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

        <DashboardPreview />
      </section>
    </>
  );
}
