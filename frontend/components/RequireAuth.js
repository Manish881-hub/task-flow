import { useRouter } from "next/router";
import { useEffect } from "react";
import { useAuth } from "../lib/auth";
import Skeleton from "./Skeleton";

/** Redirects to /login when there is no user after the silent refresh finishes. */
export default function RequireAuth({ children }) {
  const { user, authReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authReady && !user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [authReady, user, router]);

  if (!authReady) {
    return (
      <div className="container main">
        <Skeleton lines={6} />
      </div>
    );
  }

  if (!user) return null;
  return children;
}
