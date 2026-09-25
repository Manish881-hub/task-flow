import { useEffect, useRef } from "react";

/**
 * Subtle scroll-reveal for major landing blocks only (features, testimonials,
 * FAQ, final CTA). Hero + dashboard preview stay static.
 *
 * Usage: attach the returned ref to a section, then mark children with
 * `data-reveal` and an optional `data-reveal-delay="120"` (ms).
 * Elements animate once: opacity 0 → 1, translateY(24px) → 0 over 650ms.
 * Respects prefers-reduced-motion via CSS (elements render visible, no motion).
 */
export function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || typeof document === "undefined") return;
    const els = root.querySelectorAll("[data-reveal]:not(.is-visible)");
    if (typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );
    els.forEach((el) => {
      const delay = el.getAttribute("data-reveal-delay");
      if (delay) el.style.transitionDelay = `${delay}ms`;
      observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return ref;
}
