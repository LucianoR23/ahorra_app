// Service worker caching rules (plan 0.13). Kept out of app/sw.ts so they can
// be tested. Imported only by the service worker.
import { defaultCache } from "@serwist/next/worker";
import { NetworkOnly, type RuntimeCaching } from "serwist";

/**
 * Serwist's defaults plus one rule in front: cross-origin requests are never
 * cached. The defaults keep cross-origin GETs for an hour (NetworkFirst),
 * which would store API responses (balances, expenses) on the device. The
 * API, GlitchTip and Google are the only other origins the app talks to, and
 * none of them should be read from a cache.
 */
export const runtimeCaching: RuntimeCaching[] = [
  { matcher: ({ sameOrigin }) => !sameOrigin, handler: new NetworkOnly() },
  ...defaultCache,
];

/** Page shown when a navigation fails offline. Precached at build time. */
export const OFFLINE_URL = "/offline";

/** Serves the offline page for documents only (not images, data or scripts). */
export const offlineFallback = {
  entries: [
    {
      url: OFFLINE_URL,
      matcher: ({ request }: { request: Request }) => request.destination === "document",
    },
  ],
};
