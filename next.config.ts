import { randomUUID } from "node:crypto";
import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Auto-register the SW for precaching/offline on every page load
  register: true,
  // Disable in dev — no precaching noise, SW always fresh
  disable: process.env.NODE_ENV === "development",
  // Offline fallback page (plan 0.13). A new revision per build keeps it in
  // step with the deployed CSS and chunks.
  additionalPrecacheEntries: [{ url: "/offline", revision: randomUUID() }],
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // No "X-Powered-By: Next.js" (plan 0.16): no need to advertise the stack.
  poweredByHeader: false,
  // Required for Docker standalone output (no node_modules in image)
  output: "standalone",
  // @serwist/next injects a webpack config unconditionally. Next 16 uses
  // Turbopack by default in dev and errors on webpack-only configs — an
  // empty turbopack object silences the error without changing behavior.
  turbopack: {},
  // React <ViewTransition> (used in app/layout.tsx) needs no flag since
  // Next 16.4: the App Router supports it out of the box.
  // Security headers on every route (plan 0.16).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders({
          apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
          dev: process.env.NODE_ENV === "development",
          glitchtipDsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN,
        }),
      },
    ];
  },
};

export default withSerwist(nextConfig);
