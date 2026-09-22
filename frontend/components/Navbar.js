import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../lib/auth";

export function LiveDot({ status }) {
  const on = status === "Live";
  const busy = status === "Reconnecting" || status === "Connecting";
  return (
    <span className="live-pill" role="status" aria-label={`Connection ${status}`}>
      <span className={`live-dot${on ? " on" : busy ? " busy" : ""}`} aria-hidden="true" />
      {status || "Closed"}
    </span>
  );
}

export default function Navbar({ socketStatus }) {
  const { user, isAuthed, logout } = useAuth();
  const router = useRouter();

  const isActive = (href) => router.pathname === href;

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <header className="header">
      <div className="container nav">
        <Link href={isAuthed ? "/dashboard" : "/"} className="brand" aria-label="TaskFlow home">
          <span className="brand-mark" aria-hidden="true">T</span>
          TaskFlow
        </Link>
        <nav className="nav-links" aria-label="Primary">
          {socketStatus ? <LiveDot status={socketStatus} /> : null}
          {isAuthed ? (
            <>
              <Link href="/dashboard" className={`nav-link${isActive("/dashboard") ? " active" : ""}`}>
                Dashboard
              </Link>
              <Link href="/assigned" className={`nav-link${isActive("/assigned") ? " active" : ""}`}>
                Assigned
              </Link>
              <span className="badge badge-green" title={user?.email || ""}>
                {user?.name || user?.email || "User"}
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className={`nav-link${isActive("/login") ? " active" : ""}`}>
                Log in
              </Link>
              <Link href="/signup" className="btn btn-accent btn-sm">
                Get started
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
