import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // `dark` activates the dark shadcn tokens pre-hydration; the inline
    // body paint covers the very first frame and _app clears it on mount
    // so light pages (login, landing) are unaffected afterwards.
    <Html lang="en" className="dark">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>
      <body style={{ background: "#111111", color: "#f5f5f5" }}>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
