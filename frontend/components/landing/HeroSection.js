import Link from "next/link";
import { useAuth } from "../../lib/auth";

export default function HeroSection() {
  const { isAuthed } = useAuth();

  return (
    <section className="tuf-hero">
      <div className="tuf-container">
        <div className="tuf-hero-grid">
          {/* Hero Left Content */}
          <div>
            <Link href="#features" className="tuf-badge-pill">
              <span className="tuf-badge-tag">NEW</span>
              <span>Live boards update as your team works</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </Link>

            <h1 className="tuf-hero-title">
              Boards that keep
              <br />
              every team in sync
            </h1>

            <p className="tuf-hero-subtitle">
              Create projects, assign tasks, and watch boards update live as your
              team ships — no refresh, no status meetings, no lost work.
            </p>

            <div className="tuf-hero-ctas">
              <Link href={isAuthed ? "/dashboard" : "/signup"} className="tuf-btn-primary tuf-btn-primary-lg">
                Start for free
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
              <Link href="#features" className="tuf-btn-secondary-lg">
                See features
              </Link>
            </div>

            <div className="tuf-trusted-by">
              <span className="tuf-trusted-label">Powered By</span>
              <div className="tuf-trusted-logos">
                {/* Next.js */}
                <div className="tuf-partner-logo">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <span>NEXT.JS</span>
                </div>

                {/* FastAPI */}
                <div className="tuf-partner-logo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />
                  </svg>
                  <span>FASTAPI</span>
                </div>

                {/* PostgreSQL */}
                <div className="tuf-partner-logo">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <ellipse cx="12" cy="6" rx="7" ry="3" stroke="currentColor" strokeWidth="2" fill="none" />
                    <path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6" stroke="currentColor" strokeWidth="2" fill="none" />
                  </svg>
                  <span>POSTGRESQL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Right: Dashboard Mockup */}
          <div className="tuf-hero-graphic-wrap">
            <div className="tuf-app-mockup">
              {/* Mini Sidebar */}
              <div className="tuf-mock-sidebar">
                <div className="tuf-mock-brand">
                  <span className="tuf-mock-brand-dot" />
                  <span>TaskFlow</span>
                </div>

                <div className="tuf-mock-nav-group">
                  <span className="tuf-mock-nav-label">Workspace</span>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                    Boards
                  </div>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Assigned
                  </div>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                    </svg>
                    Activity
                  </div>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                    In Progress
                  </div>
                </div>

                <div className="tuf-mock-nav-group">
                  <span className="tuf-mock-nav-label">Insights</span>
                  <div className="tuf-mock-nav-item active">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    Trends
                  </div>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    Velocity
                  </div>
                  <div className="tuf-mock-nav-item">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    Reports
                  </div>
                </div>
              </div>

              {/* Mock Content */}
              <div className="tuf-mock-content">
                <div className="tuf-mock-topbar">
                  <div className="tuf-mock-title-area">
                    <h4>Trends</h4>
                    <span>How your key metrics have moved over time</span>
                  </div>
                  <div className="tuf-mock-search">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Search...</span>
                  </div>
                </div>

                {/* 3 Metric Cards */}
                <div className="tuf-mock-metrics-row">
                  <div className="tuf-mock-metric-card">
                    <div className="tuf-mock-metric-header">
                      <span className="tuf-mock-metric-label">Tasks Done</span>
                      <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>This sprint</span>
                    </div>
                    <div className="tuf-mock-metric-val">48</div>
                    <div className="tuf-mock-metric-delta">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      +18% from prev period
                    </div>
                  </div>

                  <div className="tuf-mock-metric-card">
                    <div className="tuf-mock-metric-header">
                      <span className="tuf-mock-metric-label">In Progress</span>
                      <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>Across boards</span>
                    </div>
                    <div className="tuf-mock-metric-val">12</div>
                    <div className="tuf-mock-metric-delta">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="18 15 12 9 6 15" />
                      </svg>
                      +4 from last week
                    </div>
                  </div>

                  <div className="tuf-mock-metric-card">
                    <div className="tuf-mock-metric-header">
                      <span className="tuf-mock-metric-label">Overdue</span>
                      <span style={{ fontSize: "0.6rem", color: "#94a3b8" }}>Needs attention</span>
                    </div>
                    <div className="tuf-mock-metric-val">3</div>
                    <div className="tuf-mock-metric-delta" style={{ color: "#f59e0b" }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                      -2 from last week
                    </div>
                  </div>
                </div>

                {/* Line Chart Card */}
                <div className="tuf-mock-chart-card">
                  <div className="tuf-mock-chart-title">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#E87F24" strokeWidth="2.5">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 14 14" />
                    </svg>
                    <span>Throughput over time</span>
                  </div>
                  <div className="tuf-mock-chart-desc">Completed vs created tasks for the last 30 days</div>

                  <svg className="tuf-mock-svg-chart" viewBox="0 0 360 110" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="tufChartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#E87F24" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#E87F24" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,80 C30,75 50,45 80,50 C110,55 130,25 160,35 C190,45 220,15 250,22 C280,30 310,12 360,18 L360,110 L0,110 Z"
                      fill="url(#tufChartGrad)"
                    />
                    <path
                      d="M0,80 C30,75 50,45 80,50 C110,55 130,25 160,35 C190,45 220,15 250,22 C280,30 310,12 360,18"
                      fill="none"
                      stroke="#E87F24"
                      strokeWidth="2.5"
                    />
                    {/* Points on curve */}
                    <circle cx="80" cy="50" r="3.5" fill="#ffffff" stroke="#E87F24" strokeWidth="2" />
                    <circle cx="160" cy="35" r="3.5" fill="#ffffff" stroke="#E87F24" strokeWidth="2" />
                    <circle cx="250" cy="22" r="3.5" fill="#ffffff" stroke="#E87F24" strokeWidth="2" />
                    <circle cx="360" cy="18" r="3.5" fill="#ffffff" stroke="#E87F24" strokeWidth="2" />
                  </svg>

                  <div className="tuf-mock-chart-axes">
                    <span>Mar 16</span>
                    <span>Mar 23</span>
                    <span>Mar 30</span>
                    <span>Apr 6</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
