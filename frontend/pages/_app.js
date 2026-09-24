import Head from "next/head";
import { useRouter } from "next/router";
import { AuthProvider } from "../lib/auth";
import { ThemeProvider } from "../components/theme-provider";
import "../styles/globals.css";
import "../styles/landing.css";
import "../styles/efferd-dashboard.css";
import "../styles/auth.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const pathname = router.pathname || "";

  // Only the authenticated app surface is user-themeable.
  // Landing + auth stay forced light so they can never inherit dashboard dark.
  const isAppPage =
    pathname === "/dashboard" ||
    pathname === "/assigned" ||
    pathname.startsWith("/projects/");

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="taskflow-dashboard-theme"
      forcedTheme={isAppPage ? undefined : "light"}
    >
      <AuthProvider>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Component {...pageProps} />
      </AuthProvider>
    </ThemeProvider>
  );
}
