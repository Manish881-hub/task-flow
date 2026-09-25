import { useEffect } from "react";

/**
 * Landing-only scroll reset.
 *
 * Browsers restore the previous scroll position on refresh. On the very tall
 * landing page (with an absolutely positioned dashboard preview) that means
 * a refresh can reopen mid-page instead of at the hero.
 *
 * This hook forces "/" to start at scroll 0 on mount, without touching any
 * other route. Intentional hash navigation (e.g. "/#features") is respected
 * and left alone.
 */
export default function useLandingScrollReset() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Respect intentional anchor navigation — only reset bare "/" loads.
    try {
      if (window.location && window.location.hash) return;
    } catch {
      // If location is unreadable, fall through to reset.
    }

    let previous = "auto";
    try {
      previous = window.history.scrollRestoration || "auto";
      window.history.scrollRestoration = "manual";
    } catch {
      // Older browsers may not support scrollRestoration — still reset.
    }

    const reset = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    reset();

    const frame = requestAnimationFrame(reset);

    return () => {
      cancelAnimationFrame(frame);
      try {
        window.history.scrollRestoration = previous;
      } catch {
        // Ignore restore failures.
      }
    };
  }, []);
}
