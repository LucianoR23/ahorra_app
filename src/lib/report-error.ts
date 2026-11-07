// Sends an error caught by a React error boundary to GlitchTip (plan 0.13).
// Loads the monitoring chunk only when a DSN is set, like
// instrumentation-client.ts, so pages without monitoring don't pay for it.

/** Reports a caught error. Never throws. */
export function reportError(error: unknown): void {
  if (!process.env.NEXT_PUBLIC_GLITCHTIP_DSN) return;
  void import("@/lib/monitoring")
    .then(({ captureError }) => captureError(error))
    .catch(() => {});
}
