import Link from "next/link";
import LandingNavbar from "../components/landing/LandingNavbar";

function CustomError({ statusCode }) {
  return (
    <div className="tuf-landing" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <LandingNavbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "4rem 1.5rem" }}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          <h1 style={{ fontSize: "4.5rem", fontWeight: 800, color: "#1D70F5", margin: 0, lineHeight: 1 }}>
            {statusCode || "Error"}
          </h1>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, margin: "1rem 0 0.5rem 0", color: "#0F172A" }}>
            {statusCode ? `An error ${statusCode} occurred on server` : "An error occurred on client"}
          </h2>
          <p style={{ color: "#64748B", marginBottom: "2rem" }}>
            Something went wrong while loading this page.
          </p>
          <Link href="/" className="tuf-btn-primary">
            Back to Home
          </Link>
        </div>
      </main>
    </div>
  );
}

CustomError.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default CustomError;
