import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Auto-register the SW for precaching/offline on every page load
  register: true,
  // Disable in dev — no precaching noise, SW always fresh
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Required for Docker standalone output (no node_modules in image)
  output: "standalone",
  // @serwist/next injects a webpack config unconditionally. Next 16 uses
  // Turbopack by default in dev and errors on webpack-only configs — an
  // empty turbopack object silences the error without changing behavior.
  turbopack: {},
  // React <ViewTransition> (used in app/layout.tsx) needs no flag since
  // Next 16.4: the App Router supports it out of the box.
};

export default withSerwist(nextConfig);
