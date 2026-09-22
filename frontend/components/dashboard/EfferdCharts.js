/**
 * EfferdCharts — Full dashboard body adapted from the Efferd dashboard-6 block.
 * All charts use inline SVG (no external charting library needed).
 * This is a presentational/demo component rendering the dashboard fragment.
 */
import { useState } from "react";

/* ── tiny helpers ───────────────────────────────────────────────── */
function ArrowUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-arrow-up" aria-hidden="true">
      <path d="m5 12 7-7 7 7" /><path d="M12 19V5" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      className="lucide lucide-arrow-down" aria-hidden="true">
      <path d="M12 5v14" /><path d="m19 12-7 7-7-7" />
    </svg>
  );
}
function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
  );
}
function ArrowRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
  );
}

/* ── Delta badge (up / down indicator) ──────────────────────────── */
function Delta({ value, direction = "up", suffix = "vs prior 30 days" }) {
  const isUp = direction === "up";
  const color = isUp ? "var(--delta-up, #10b981)" : "var(--delta-down, #f43f5e)";
  const bg = isUp ? "#10b981" : "#ef4444";
  return (
    <div className="ec-delta-row">
      <span className="ec-delta" style={{ color }}>
        <span className="ec-delta-icon" style={{ background: bg }}>
          {isUp ? <ArrowUpIcon /> : <ArrowDownIcon />}
        </span>
        <span className="ec-delta-value">{value}</span>
      </span>
      <span className="ec-muted-xs">{suffix}</span>
    </div>
  );
}

/* ── KPI metric card ────────────────────────────────────────────── */
function KpiCard({ title, value, deltaValue, deltaDir, isLast }) {
  return (
    <div className="ec-kpi-card" data-slot="dashboard-card">
      {!isLast && <div className="ec-kpi-sep-h" />}
      {!isLast && <div className="ec-kpi-sep-v" />}
      <div className="ec-kpi-body">
        <span className="ec-card-label">{title}</span>
        <span className="ec-kpi-value">{value}</span>
      </div>
      <Delta value={deltaValue} direction={deltaDir} />
    </div>
  );
}

/* ── MRR Area Chart (SVG) ───────────────────────────────────────── */
function MrrChart() {
  const W = 588, H = 250;
  const d = "M0,78.7C18,79.5,36,75.1,55,73.7C73,83.3,91,71.1,109,68.3C127,67.5,146,69.8,164,66.4C182,63.7,200,65.5,219,70.8C237,69.1,255,65.5,273,65.2C291,61,309,61.8,328,59.9C346,57.9,364,55.8,382,50.7C400,61.9,419,51.5,437,48.1C455,47.9,474,49.8,492,45.9C510,42.9,528,37.2,528,37.2";
  const areaD = d + `L528,${H}L0,${H}Z`;
  return (
    <div className="ec-mrr-chart" data-slot="dashboard-card">
      <div className="ec-mrr-header">
        <div className="ec-mrr-left">
          <span className="ec-kpi-value" style={{ fontSize: "1.5rem" }}>$92K</span>
          <span className="ec-card-label">Monthly recurring revenue</span>
        </div>
        <div className="ec-delta-row" style={{ fontSize: "0.75rem" }}>
          <Delta value="27.4%" direction="up" suffix="over last 30 days" />
        </div>
      </div>
      <div className="ec-chart-wrap" style={{ height: 220 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="mrr-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="mrr-edge" x1="0" x2={W} y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="0" />
              <stop offset="15%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="1" />
              <stop offset="85%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--chart-2, #3b82f6)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grid lines */}
          {[230,188,146,105,63,21].map((y,i) => (
            <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="var(--ec-border,#23262f)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
          ))}
          <path d={areaD} fill="url(#mrr-fill)" />
          <path d={d} fill="none" stroke="url(#mrr-edge)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="ec-chart-labels-x">
          {["Apr 11","Apr 18","Apr 26","May 3","May 10"].map((l, i) => (
            <span key={i} className="ec-chart-label">{l}</span>
          ))}
        </div>
        <div className="ec-chart-labels-y">
          {["0","20k","40k","60k","80k","100k"].map((l, i) => (
            <span key={i} className="ec-chart-label">{l}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── AI Insights + Budget Usage ─────────────────────────────────── */
function AiInsightsBudget() {
  return (
    <div className="ec-row-split" data-slot="dashboard-card">
      {/* AI Insights */}
      <div className="ec-ai-insights">
        <div className="ec-ai-header">
          <div className="ec-ai-title">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12c.552 0 1.005-.449.95-.998a10 10 0 0 0-8.953-8.951c-.55-.055-.998.398-.998.95v8a1 1 0 0 0 1 1z" />
              <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
            </svg>
            AI Insights
          </div>
          <button className="ec-btn ec-btn-ghost ec-btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
            </svg>
            Ask AI
          </button>
        </div>
        <p className="ec-ai-text">
          Unused budget runway improved by <span className="ec-text-highlight">3.5% this month</span> vs. trailing burn.
        </p>
      </div>
      {/* Separator */}
      <div className="ec-sep-v-inner" />
      {/* Budget Usage */}
      <div className="ec-budget">
        <div className="ec-budget-header">
          <div>
            <span className="ec-card-label">Budget usage</span>
            <span className="ec-kpi-value" style={{ fontSize: "1.5rem" }}>$50,734</span>
          </div>
          <button className="ec-btn ec-btn-ghost ec-btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
              <path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12" />
              <path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17" />
            </svg>
            Manage Budget
          </button>
        </div>
        <div className="ec-budget-bars">
          <div className="ec-budget-seg" style={{ flex: "50 1 0%" }}>
            <div className="ec-budget-seg-label"><span className="ec-muted-xs">50%</span><div className="ec-tick" /></div>
            <div className="ec-budget-bar" style={{ background: "var(--chart-2, #3b82f6)" }} />
          </div>
          <div className="ec-budget-seg" style={{ flex: "25 1 0%" }}>
            <div className="ec-budget-seg-label"><span className="ec-muted-xs">25%</span><div className="ec-tick" /></div>
            <div className="ec-budget-bar" style={{ background: "var(--chart-3, #f59e0b)" }} />
          </div>
          <div className="ec-budget-seg" style={{ flex: "25 1 0%" }}>
            <div className="ec-budget-seg-label"><span className="ec-muted-xs">25%</span><div className="ec-tick" /></div>
            <div className="ec-budget-bar" style={{ background: "var(--chart-4, #8b5cf6)" }} />
          </div>
        </div>
        <div className="ec-budget-legend">
          <span><i style={{ background: "var(--chart-2, #3b82f6)" }} />Unused</span>
          <span><i style={{ background: "var(--chart-3, #f59e0b)" }} />Used</span>
          <span><i style={{ background: "var(--chart-4, #8b5cf6)" }} />Reserved</span>
        </div>
      </div>
    </div>
  );
}

/* ── Orders Bar Chart ───────────────────────────────────────────── */
function OrdersChart() {
  const bars = [48,54,52,56,46,44,60,63,57,52,50,55,49,61,65,60,68,64,72,55,70,66,68,62,75,78,82,74,69,67];
  const peak = Math.max(...bars);
  const peakIdx = bars.indexOf(peak);
  return (
    <div className="ec-orders-chart" data-slot="dashboard-card">
      <div className="ec-orders-header">
        <div>
          <span className="ec-kpi-value" style={{ fontSize: "1.5rem" }}>1,842</span>
          <span className="ec-muted-xs">Orders in the last 30 days</span>
        </div>
        <div className="ec-orders-peak">
          <span className="ec-muted-xs">
            Peak <strong>{peak}</strong> on <strong>May 10</strong>
          </span>
          <Delta value="9.8%" direction="up" suffix="over last 30 days" />
        </div>
      </div>
      <div className="ec-bars-wrap">
        {bars.map((v, i) => {
          const h = (v / 100) * 100;
          const isPeak = i === peakIdx;
          return (
            <div key={i} className="ec-bar-col">
              <div
                className={`ec-bar ${isPeak ? "ec-bar-peak" : ""}`}
                style={{ height: `${h}%` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Revenue Donut Gauge ────────────────────────────────────────── */
function RevenueDonut() {
  const ticks = 54; // total tick lines in the gauge
  const filled = 37; // ~73% filled
  return (
    <div className="ec-donut-card" data-slot="dashboard-card">
      <div className="ec-donut-wrap">
        <svg viewBox="0 0 240 200" className="ec-donut-svg">
          {Array.from({ length: ticks }).map((_, i) => {
            const angle = (i / ticks) * 360 - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = 120, cy = 118, r1 = 82, r2 = 102;
            const x1 = cx + r1 * Math.cos(rad);
            const y1 = cy + r1 * Math.sin(rad);
            const x2 = cx + r2 * Math.cos(rad);
            const y2 = cy + r2 * Math.sin(rad);
            return (
              <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="var(--chart-2, #3b82f6)" strokeWidth="4.5" strokeLinecap="round"
                opacity={i < filled ? 1 : 0.35} />
            );
          })}
        </svg>
        <div className="ec-donut-center">
          <div className="ec-donut-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
              <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
            </svg>
          </div>
          <span className="ec-card-label">Total Revenue</span>
          <span className="ec-donut-amount">$284,920.00</span>
        </div>
      </div>
      <div className="ec-donut-legend">
        <span><i style={{ background: "var(--chart-2)", opacity: 1 }} />Subscriptions</span>
        <span><i style={{ background: "var(--chart-2)", opacity: 0.35 }} />Usage &amp; services</span>
      </div>
      <button className="ec-btn ec-btn-secondary ec-btn-block">View Detail <ArrowRightIcon /></button>
    </div>
  );
}

/* ── Active Customers meter ─────────────────────────────────────── */
function ActiveCustomers() {
  const total = 64, filled = 50; // 78% filled
  return (
    <div className="ec-customers-card" data-slot="dashboard-card">
      <div className="ec-customers-header">
        <span className="ec-card-label">Active customers</span>
        <p className="ec-kpi-value" style={{ fontSize: "1.5rem", margin: 0 }}>2,540</p>
      </div>
      <div className="ec-customers-meter">
        <div className="ec-meter-marker" style={{ left: "78.125%" }}>
          <span className="ec-meter-pct">78%</span>
          <div className="ec-tick" />
        </div>
        <div className="ec-meter-bars">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className="ec-meter-bar-col">
              <div className={`ec-meter-bar ${i < filled ? "" : "ec-meter-bar-faded"}`} />
            </div>
          ))}
        </div>
      </div>
      <div className="ec-donut-legend">
        <span><i style={{ background: "var(--chart-2)" }} />Paid</span>
        <span><i style={{ background: "var(--chart-2)", opacity: 0.35 }} />Free</span>
      </div>
    </div>
  );
}

/* ── Federal Income Tax Card ────────────────────────────────────── */
function TaxCard() {
  return (
    <div className="ec-tax-card" data-slot="dashboard-card">
      <span className="ec-card-label">Federal Income Tax</span>
      <div className="ec-tax-rows">
        <div className="ec-tax-row"><span className="ec-muted-xs">Date:</span><span>March 24, 2025</span></div>
        <div className="ec-tax-row"><span className="ec-muted-xs">Amount:</span><span>$1,450.00</span></div>
        <div className="ec-tax-row"><span className="ec-muted-xs">Payment method:</span><span>**** 4432</span></div>
        <div className="ec-tax-row">
          <span className="ec-muted-xs">Status:</span>
          <span className="ec-badge ec-badge-secondary">Completed</span>
        </div>
      </div>
      <button className="ec-btn ec-btn-secondary ec-btn-block">View Details <ArrowRightIcon /></button>
    </div>
  );
}

/* ── Needs Attention list ───────────────────────────────────────── */
const attentionItems = [
  { icon: "card", label: "Retry failed payments", count: 3 },
  { icon: "megaphone", label: "Draft campaigns", count: 5 },
  { icon: "plug", label: "Webhook delivery errors", count: 1 },
  { icon: "alert", label: "Low inventory SKUs", count: 2 },
  { icon: "cart", label: "Unfulfilled orders", count: 12 },
];
const attentionIcons = {
  card: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>,
  megaphone: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" /><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14" /><path d="M8 6v8" /></svg>,
  plug: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22v-5" /><path d="M15 8V2" /><path d="M17 8a1 1 0 0 1 1 1v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1z" /><path d="M9 8V2" /></svg>,
  alert: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
  cart: <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" /><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" /><circle cx="18" cy="20" r="2" /><circle cx="8" cy="20" r="2" /></svg>,
};

function NeedsAttention() {
  return (
    <div className="ec-attention-card" data-slot="dashboard-card">
      <span className="ec-card-label">Needs attention</span>
      <div className="ec-attention-list">
        {attentionItems.map((item, i) => (
          <a key={i} href="#" className="ec-attention-item" onClick={(e) => e.preventDefault()}>
            <div className="ec-attention-icon">{attentionIcons[item.icon]}</div>
            <div className="ec-attention-label">{item.label}</div>
            <div className="ec-attention-actions">
              <span className="ec-badge ec-badge-secondary ec-badge-count">{item.count}</span>
              <ChevronRightIcon />
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Separator ──────────────────────────────────────────────────── */
function HrSep() {
  return <div className="ec-sep-h" />;
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN EXPORT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function EfferdCharts({ userName, projectCount, assignedCount }) {
  const [range, setRange] = useState("Last 30 days");

  return (
    <div className="ec-body">
      {/* ── Header bar ─────────────────────────────────────────── */}
      <div className="ec-top-bar">
        <div>
          <h2 className="ec-greeting">Good evening{userName ? `, ${userName}` : ""}</h2>
          <p className="ec-subtitle">
            {projectCount} project{projectCount === 1 ? "" : "s"} · {assignedCount} task{assignedCount === 1 ? "" : "s"} assigned to you
          </p>
        </div>
        <div className="ec-top-controls">
          <div className="ec-btn-group">
            <button className="ec-btn ec-btn-outline ec-select-trigger">
              <span>{range}</span>
              <ChevronDownIcon />
            </button>
            <button className="ec-btn ec-btn-outline" aria-label="Open calendar">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" />
              </svg>
              <span className="ec-calendar-range">Aug 24 - Sep 22, 2026</span>
            </button>
          </div>
          <div className="ec-sep-v-small" />
          <div className="ec-top-actions">
            <button className="ec-btn ec-btn-outline">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 17H5" /><path d="M19 7h-9" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" />
              </svg>
              Customize
            </button>
            <button className="ec-btn ec-btn-outline ec-btn-icon" aria-label="More options">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main grid: left (68%) / right (32%) ────────────────── */}
      <div className="ec-grid">
        {/* LEFT column */}
        <div className="ec-col-left">
          {/* KPI row */}
          <div className="ec-kpi-row">
            <KpiCard title="Repeat purchase rate" value="38.4%" deltaValue="2.7%" deltaDir="up" />
            <KpiCard title="Orders" value="1,842" deltaValue="4.1%" deltaDir="up" />
            <KpiCard title="Average order value" value="$154.60" deltaValue="1.3%" deltaDir="down" isLast />
          </div>
          <HrSep />

          {/* MRR chart */}
          <MrrChart />
          <HrSep />

          {/* AI Insights + Budget */}
          <AiInsightsBudget />
          <HrSep />

          {/* Orders bar chart */}
          <OrdersChart />
        </div>

        {/* RIGHT column */}
        <div className="ec-col-right">
          <RevenueDonut />
          <HrSep />
          <ActiveCustomers />
          <HrSep />
          <TaxCard />
          <HrSep />
          <NeedsAttention />
        </div>
      </div>
    </div>
  );
}
