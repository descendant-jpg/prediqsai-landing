import type { NextConfig } from "next";

// In dev the API server runs inside this workspace on :8080.
// On Vercel, API_ORIGIN should point at the production API.
const apiOrigin =
  process.env.API_ORIGIN ??
  (process.env.VERCEL ? "https://api.prediqsai.com" : "http://localhost:8080");

const nextConfig: NextConfig = {
  // Replit serves this artifact under /website/; Vercel serves it at the root.
  // Next requires basePath without a trailing slash.
  basePath: (process.env.BASE_PATH || "").replace(/\/+$/, ""),
  allowedDevOrigins: [
    "*.replit.dev",
    "*.picard.replit.dev",
    "*.repl.co",
    "*.replit.app",
  ],
  async rewrites() {
    // Browser calls /api/* stay same-origin; in dev Replit's path router
    // sends them to the api-server, on Vercel this rewrite proxies them.
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
