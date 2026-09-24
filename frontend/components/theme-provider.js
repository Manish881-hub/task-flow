import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Single source of truth for theme state (next-themes, class attribute).
 * Route-level forcing (light on public/auth, user-controlled in app)
 * lives in pages/_app.js — never toggle the `dark` class manually.
 */
export function ThemeProvider({ children, ...props }) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
