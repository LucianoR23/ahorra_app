import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// End-to-end tests (plan §0, item 0.21h): the real front end against the real
// API and a throwaway Postgres. Locally:
//   1. a Postgres the API can migrate (e.g. `docker compose up -d` in
//      valuo_api, then E2E_DATABASE_URL=postgres://...:5433/valuo_e2e),
//   2. `pnpm test:e2e`.
// The API checkout defaults to ../valuo_api (E2E_API_DIR overrides it).
// CI provides both (see .github/workflows/ci.yml, job e2e).

// Same calendar day everywhere: test helpers, the browser and the API.
process.env.TZ = "America/Argentina/Buenos_Aires";

const API_PORT = 8080;
const WEB_PORT = 3005;
const API_URL = `http://localhost:${API_PORT}`;

const apiDir = path.resolve(process.env.E2E_API_DIR ?? "../valuo_api");
const dbURL = process.env.E2E_DATABASE_URL ?? "postgres://valuo:valuo_dev_pw@localhost:5433/valuo_e2e?sslmode=disable";
const ci = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  // One API and one database for every test: run serially. Tests create their
  // own users and households, so they never depend on each other's data.
  workers: 1,
  fullyParallel: false,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /screens\.spec\.ts/ },
    // Screenshot harness (plan 1.10a), run on its own: `pnpm test:screens`.
    { name: "screens", use: { ...devices["Desktop Chrome"] }, testMatch: /screens\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "go run ./cmd/api",
      cwd: apiDir,
      url: `${API_URL}/health/ready`,
      reuseExistingServer: !ci,
      timeout: 180_000,
      env: {
        PORT: String(API_PORT),
        ENV: "dev",
        LOG_LEVEL: "warn",
        TZ: "America/Argentina/Buenos_Aires",
        DATABASE_URL: dbURL,
        MIGRATE_ON_START: "true",
        MIGRATE_DATABASE_URL: dbURL,
        JWT_SECRET: "e2e-access-secret-0123456789abcdefghij",
        JWT_REFRESH_SECRET: "e2e-refresh-secret-0123456789abcdefghij",
        ALLOWED_ORIGINS: `http://localhost:${WEB_PORT}`,
        APP_BASE_URL: `http://localhost:${WEB_PORT}`,
        // No RESEND_API_KEY: emails are not sent. No VAPID keys: no push.
      },
    },
    {
      // CI builds first (pnpm build) and serves the production build.
      command: ci ? `pnpm start -p ${WEB_PORT}` : `pnpm dev`,
      url: `http://localhost:${WEB_PORT}/login`,
      reuseExistingServer: !ci,
      timeout: 180_000,
      env: { NEXT_PUBLIC_API_URL: API_URL },
    },
  ],
});
