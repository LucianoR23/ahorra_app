import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit and component tests (plan §0 Testing policy). E2E lives in Playwright.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    env: { TZ: "America/Argentina/Buenos_Aires" },
    coverage: {
      provider: "v8",
      include: ["src/lib/**", "src/stores/**", "src/components/**"],
      reporter: ["text-summary", "html"],
    },
  },
});
