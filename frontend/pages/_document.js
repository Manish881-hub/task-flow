import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    // No hardcoded theme class here — next-themes injects its detection
    // script and sets the correct `dark` class before first paint.
    // suppressHydrationWarning is required because that class differs
    // between server HTML and the hydrated client.
    <Html lang="en" suppressHydrationWarning>
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" type="image/png" href="/logo.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
