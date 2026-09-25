import { useEffect, useMemo, useRef } from "react";

const MUTED = { r: 0x7b, g: 0x87, b: 0x98 }; // #7b8798
const ACTIVE = { r: 0x14, g: 0x20, b: 0x33 }; // #142033

function clamp01(v) {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

// smoothstep for subtle, non-flashy per-word easing
function smooth(t) {
  return t * t * (3 - 2 * t);
}

/**
 * ScrollTextReveal — Framer-style "Text Reveal on Scroll" recreated with
 * native browser APIs (no framer-motion, no Framer module).
 *
 * Each word starts muted (#7b8798) and transitions to #142033 as the heading
 * travels from the lower viewport (~85%) to the upper-middle (~35%).
 * Progress is scroll-linked (scrubs both directions), staggered per word,
 * and applied via direct style updates inside requestAnimationFrame —
 * no React state churn on scroll.
 *
 * Coexists with Reveal.js: this component NEVER uses `data-reveal`
 * (no opacity/transform), only per-word `color`, so a parent may keep its
 * fade-up while the heading itself scrubs color. No layout shift:
 * words are plain inline spans, typography untouched.
 *
 * Reduced motion: renders final color statically, no listeners.
 *
 * @param {string} text - heading text; use "\n" for an explicit <br/>.
 * @param {string} as - heading tag (default "h2").
 */
export default function ScrollTextReveal({
  text = "",
  as: Tag = "h2",
  className = "",
  mutedColor = "#7b8798",
  activeColor = "#142033",
}) {
  const rootRef = useRef(null);
  const wordRefs = useRef([]);

  // Split into lines -> words, preserving spaces via explicit text nodes
  // and <br/> for "\n". Flat word index drives the stagger.
  const lines = useMemo(() => {
    return String(text)
      .split("\n")
      .map((line) =>
        line
          .split(" ")
          .filter((w, i, arr) => !(w === "" && (i === 0 || arr[i - 1] === "")))
      );
  }, [text]);

  const wordCount = useMemo(
    () => lines.reduce((n, words) => n + words.filter(Boolean).length, 0),
    [lines]
  );

  // Parse custom colors once (defaults match MUTED/ACTIVE above).
  const colors = useMemo(() => {
    const toRgb = (hex, fallback) => {
      const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
      if (!m) return fallback;
      const v = m[1];
      return {
        r: parseInt(v.slice(0, 2), 16),
        g: parseInt(v.slice(2, 4), 16),
        b: parseInt(v.slice(4, 6), 16),
      };
    };
    return {
      from: toRgb(mutedColor, MUTED),
      to: toRgb(activeColor, ACTIVE),
    };
  }, [mutedColor, activeColor]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;
    const words = wordRefs.current.filter(Boolean);
    if (words.length === 0) return;

    // Reduced motion: final color, no scroll work.
    let reduced = false;
    try {
      reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }
    if (reduced) {
      const { to } = colors;
      const final = `rgb(${to.r}, ${to.g}, ${to.b})`;
      words.forEach((el) => {
        el.style.color = final;
      });
      return;
    }

    const { from, to } = colors;
    let rafId = 0;
    let ticking = false;

    const isMobile = () =>
      typeof window !== "undefined" && window.innerWidth < 640;

    const update = () => {
      ticking = false;
      if (!root.isConnected) return;
      const rect = root.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      // Scroll-linked progress: element top travels from lower viewport
      // to upper-middle. Mobile uses a shorter travel (snappier, simpler).
      const mobile = isMobile();
      const startY = vh * (mobile ? 0.9 : 0.85);
      const endY = vh * (mobile ? 0.45 : 0.35);
      const overall = clamp01((startY - rect.top) / (startY - endY || 1));

      // Per-word stagger: word i starts at i * stagger, eases over `window`.
      // Desktop: slow overlap (subtle, no flashing). Mobile: slightly larger
      // stagger + shorter window for a simpler feel on small screens.
      const stagger = mobile ? 0.1 : 0.06;
      const win = mobile ? 0.35 : 0.45;
      const n = words.length;

      for (let i = 0; i < n; i += 1) {
        const s = i * stagger;
        const local = clamp01((overall - s) / win);
        const e = smooth(local);
        const r = Math.round(from.r + (to.r - from.r) * e);
        const g = Math.round(from.g + (to.g - from.g) * e);
        const b = Math.round(from.b + (to.b - from.b) * e);
        words[i].style.color = `rgb(${r}, ${g}, ${b})`;
      }
    };

    const requestUpdate = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(update);
    };

    // Paint initial state immediately (no waiting for first scroll).
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    // Re-run once fonts/layout settle so progress matches final geometry.
    const t = window.setTimeout(requestUpdate, 100);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.clearTimeout(t);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [colors, wordCount]);

  // Reset refs each render; callback refs repopulate in order.
  wordRefs.current = [];
  let flatIndex = 0;

  return (
    <Tag ref={rootRef} className={`scroll-text-reveal ${className}`.trim()}>
      {lines.map((words, li) => (
        <span key={`line-${li}`} style={{ display: "contents" }}>
          {li > 0 && <br />}
          {words.map((word, wi) => {
            if (!word) return null;
            const idx = flatIndex++;
            const isLastInLine = wi === words.length - 1;
            const isLastOverall =
              li === lines.length - 1 && isLastInLine;
            return (
              <span key={`w-${li}-${wi}`} style={{ display: "contents" }}>
                <span
                  ref={(el) => {
                    if (el) wordRefs.current[idx] = el;
                  }}
                  className="str-word"
                  style={{ color: mutedColor }}
                >
                  {word}
                </span>
                {!isLastOverall && (isLastInLine ? " " : " ")}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
