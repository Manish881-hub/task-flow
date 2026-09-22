export default function Skeleton({ lines = 4 }) {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: i === 0 ? 28 : 18, width: i === 0 ? "40%" : `${95 - i * 7}%` }}
        />
      ))}
      <div className="card" aria-hidden="true">
        <div className="skeleton" style={{ height: 120 }} />
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      <div className="skeleton" style={{ height: 22, width: "55%", marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 16, width: "90%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 16, width: "70%" }} />
    </div>
  );
}
