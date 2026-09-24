/**
 * Static preview of TaskFlow dashboard — used inside landing hero.
 * Presentational only, no auth/data fetching, so it never triggers 401.
 * Mirrors the real dashboard IA (KPIs, chart, rail) with representative values.
 */
export default function DashboardPreview() {
  return (
    <div className="tuf-dash-preview" role="img" aria-label="TaskFlow dashboard preview">
      {/* top bar */}
      <div className="tuf-dash-preview-top">
        <div className="tuf-dash-preview-brand">
          <span className="tuf-dash-preview-dot" />
          TaskFlow
          <span className="tuf-dash-preview-badge">Live</span>
        </div>
        <div className="tuf-dash-preview-actions">
          <span className="tuf-dash-preview-pill">All projects</span>
          <span className="tuf-dash-preview-pill">7d</span>
          <span className="tuf-dash-preview-pill">30d</span>
          <span className="tuf-dash-preview-btn">New project</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="tuf-dash-preview-kpis">
        <div className="tuf-dash-preview-kpi">
          <div className="tuf-dash-preview-kpi-label">Projects</div>
          <div className="tuf-dash-preview-kpi-value">12</div>
          <div className="tuf-dash-preview-kpi-sub">3 active</div>
        </div>
        <div className="tuf-dash-preview-kpi">
          <div className="tuf-dash-preview-kpi-label">Assigned tasks</div>
          <div className="tuf-dash-preview-kpi-value">34</div>
          <div className="tuf-dash-preview-kpi-sub">To Do 12 · Doing 8 · Done 14</div>
        </div>
        <div className="tuf-dash-preview-kpi">
          <div className="tuf-dash-preview-kpi-label">Completed this week</div>
          <div className="tuf-dash-preview-kpi-value">8</div>
          <div className="tuf-dash-preview-kpi-sub">Overdue 2</div>
        </div>
      </div>

      {/* main grid: chart + rail */}
      <div className="tuf-dash-preview-grid">
        <div className="tuf-dash-preview-main">
          <div className="tuf-dash-preview-panel">
            <div className="tuf-dash-preview-panel-head">
              <div>
                <div className="tuf-dash-preview-panel-title">Task activity</div>
                <div className="tuf-dash-preview-panel-sub">18 events in the last 30 days · peak 4 on Mar 28</div>
              </div>
            </div>
            <svg viewBox="0 0 600 180" className="tuf-dash-preview-chart" preserveAspectRatio="none" aria-hidden="true">
              <line x1="40" y1="20" x2="590" y2="20" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="40" y1="70" x2="590" y2="70" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="40" y1="120" x2="590" y2="120" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M40,100 C100,90 140,40 200,60 C260,80 320,20 400,30 C460,40 520,15 590,20 L590,130 L40,130 Z" fill="#1d70f5" opacity="0.12" />
              <path d="M40,100 C100,90 140,40 200,60 C260,80 320,20 400,30 C460,40 520,15 590,20" fill="none" stroke="#1d70f5" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="200" cy="60" r="3.5" fill="#fff" stroke="#1d70f5" strokeWidth="2" />
              <circle cx="400" cy="30" r="3.5" fill="#fff" stroke="#1d70f5" strokeWidth="2" />
              <circle cx="590" cy="20" r="3.5" fill="#fff" stroke="#1d70f5" strokeWidth="2" />
            </svg>
          </div>

          <div className="tuf-dash-preview-split">
            <div className="tuf-dash-preview-panel tuf-dash-preview-panel-sm">
              <div className="tuf-dash-preview-panel-title">Highlights</div>
              <ul className="tuf-dash-preview-list">
                <li>Demo Sprint carries the heaviest load with 6 open tasks.</li>
                <li>2 overdue tasks need attention.</li>
                <li>5 tasks completed in the last 7 days.</li>
              </ul>
            </div>
            <div className="tuf-dash-preview-panel tuf-dash-preview-panel-sm">
              <div className="tuf-dash-preview-panel-title">Workload</div>
              <div className="tuf-dash-preview-bars">
                <div className="tuf-dash-preview-bar-row"><span>To Do</span><i style={{ width: "42%" }} /><b>12</b></div>
                <div className="tuf-dash-preview-bar-row"><span>In Progress</span><i style={{ width: "28%", background: "#1d70f5" }} /><b>8</b></div>
                <div className="tuf-dash-preview-bar-row"><span>Done</span><i style={{ width: "50%", background: "#22c55e" }} /><b>14</b></div>
              </div>
            </div>
          </div>
        </div>

        <div className="tuf-dash-preview-rail">
          <div className="tuf-dash-preview-panel tuf-dash-preview-panel-sm">
            <div className="tuf-dash-preview-panel-title">Task distribution</div>
            <div className="tuf-dash-preview-radial">
              <svg viewBox="0 0 120 120" width="96" height="96">
                <circle cx="60" cy="60" r="44" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                <circle cx="60" cy="60" r="44" fill="none" stroke="#1d70f5" strokeWidth="10" strokeDasharray="276" strokeDashoffset="96" strokeLinecap="round" transform="rotate(-90 60 60)" />
                <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="800" fill="#0f172a">34</text>
                <text x="60" y="72" textAnchor="middle" fontSize="8" fill="#64748b">Total tasks</text>
              </svg>
            </div>
          </div>
          <div className="tuf-dash-preview-panel tuf-dash-preview-panel-sm">
            <div className="tuf-dash-preview-panel-title">Active projects</div>
            <div className="tuf-dash-preview-sharebar"><i style={{ width: "38%", background: "#1d70f5" }} /><i style={{ width: "24%", background: "#5b8def" }} /><i style={{ width: "18%", background: "#94a3b8" }} /></div>
          </div>
          <div className="tuf-dash-preview-panel tuf-dash-preview-panel-sm">
            <div className="tuf-dash-preview-panel-title">Task status</div>
            <div className="tuf-dash-preview-status"><span>To Do</span><b>12</b></div>
            <div className="tuf-dash-preview-status"><span>In Progress</span><b>8</b></div>
            <div className="tuf-dash-preview-status"><span>Done</span><b>14</b></div>
          </div>
        </div>
      </div>
    </div>
  );
}
