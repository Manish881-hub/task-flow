import Head from "next/head";
import { useEffect } from "react";
import { AuthProvider } from "../lib/auth";
import "../styles/globals.css";
import "../styles/landing.css";
import "../styles/efferd-dashboard.css";

export default function App({ Component, pageProps }) {
  // _document paints a dark body for the first frame; hand control back
  // to the stylesheets once React is alive so light pages keep their theme.
  useEffect(() => {
    document.body.style.backgroundColor = "";
    document.body.style.color = "";
  }, []);
  return (
    <AuthProvider>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
