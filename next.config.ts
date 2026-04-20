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
};

export default withSerwist(nextConfig);
