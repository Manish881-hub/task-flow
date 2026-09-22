/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Production builds write to .next-build when NEXT_DIST_DIR is set, so a
  // concurrent `next build` can never corrupt the dev server's `.next`.
  // Docker/CI run plain `npm run build` and still emit to `.next`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

module.exports = nextConfig;
