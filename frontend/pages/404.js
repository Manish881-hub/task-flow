import Link from "next/link";
import LandingNavbar from "../components/landing/LandingNavbar";

export default function Custom404() {
  return (
    <div className="tuf-landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <LandingNavbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <h1 style={{ fontSize: "5rem", fontWeight: 800, color: "#1D70F5", margin: 0, lineHeight: 1 }}>404</h1>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "1rem 0 0.5rem 0", color: "#0F172A" }}>
            Page not found
          </h2>
          <p style={{ color: "#64748B", marginBottom: "2rem" }}>
            The page you are looking for doesn't exist or has been moved.
          </p>
          <Link href="/" className="tuf-btn-primary">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}
