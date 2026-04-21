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
  // Enables React 19 <ViewTransition> wrapping for router transitions,
  // powered by the browser's native document.startViewTransition API.
  experimental: {
    viewTransition: true,
  },
};

export default withSerwist(nextConfig);
