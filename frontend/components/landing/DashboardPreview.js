/**
 * Real TaskFlow dashboard screenshot — no fake rebuilt cards.
 * The dashboard is rendered as a single image to show the actual product UI.
 */
export default function DashboardPreview() {
  return (
    <div className="dashboard-preview tuf-dash-preview" role="img" aria-label="TaskFlow dashboard preview">
      <img src="/dashboard.png" alt="TaskFlow dashboard" loading="eager" decoding="async" />
    </div>
  );
}
