// Runs in the browser before the app hydrates (Next.js instrumentation).
// The monitoring SDK loads in its own chunk and only when a DSN is set
// (plan 0.12), so it adds nothing to the first load.
const dsn = process.env.NEXT_PUBLIC_GLITCHTIP_DSN;

if (dsn) {
  void import("@/lib/monitoring").then(({ initMonitoring }) =>
    initMonitoring({
      dsn,
      environment: process.env.NEXT_PUBLIC_GLITCHTIP_ENVIRONMENT,
      release: process.env.NEXT_PUBLIC_APP_VERSION,
    }),
  );
}
