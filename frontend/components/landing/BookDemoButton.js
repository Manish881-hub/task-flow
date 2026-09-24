import { useCallback, useEffect } from "react";

export const TASKFLOW_CALENDLY_URL = "https://calendly.com/manishbhakti881/30min";
const WIDGET_JS = "https://assets.calendly.com/assets/external/widget.js";
const WIDGET_CSS = "https://assets.calendly.com/assets/external/widget.css";

function ensureCalendlyAssets() {
  if (typeof document === "undefined") return;
  if (!document.querySelector(`link[href="${WIDGET_CSS}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = WIDGET_CSS;
    document.head.appendChild(link);
  }
  if (!document.querySelector(`script[src="${WIDGET_JS}"]`)) {
    const script = document.createElement("script");
    script.src = WIDGET_JS;
    script.async = true;
    document.body.appendChild(script);
  }
}

export default function BookDemoButton({ className = "", children, onAfterClick }) {
  useEffect(() => {
    ensureCalendlyAssets();
  }, []);

  const handleClick = useCallback(
    (e) => {
      e.preventDefault();
      ensureCalendlyAssets();
      const open = () => {
        if (typeof window !== "undefined" && window.Calendly?.initPopupWidget) {
          window.Calendly.initPopupWidget({ url: TASKFLOW_CALENDLY_URL });
          return true;
        }
        return false;
      };
      if (!open()) {
        // Widget script not ready yet — retry briefly, then give up without navigating.
        let attempts = 0;
        const timer = setInterval(() => {
          attempts += 1;
          if (open() || attempts >= 20) clearInterval(timer);
        }, 250);
      }
      if (onAfterClick) onAfterClick();
    },
    [onAfterClick]
  );

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
}
