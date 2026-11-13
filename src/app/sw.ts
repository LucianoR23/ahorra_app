import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { brand } from "@/config/brand";
import { pushBody, readPushAmounts, type PushPayload } from "@/lib/push-amounts";
import { handleShare, isShareRequest } from "@/lib/share-target";
import { offlineFallback, runtimeCaching } from "@/lib/sw-caching";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: offlineFallback,
});

// Share Target (plan 3.4): registered before Serwist so the share POST is
// answered here; Serwist routes only GETs.
self.addEventListener("fetch", (event: FetchEvent) => {
  if (!isShareRequest(event.request, self.location.origin)) return;
  event.respondWith(handleShare(event.request, self.caches, Date.now()));
});

serwist.addEventListeners();

// ── Push notifications ───────────────────────────────────────────────────────

self.addEventListener("push", (event: PushEvent) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = { body: event.data.text() };
  }

  const title = payload.title ?? brand.name;
  // No amounts on the lock screen unless this device opted in (plan 1.9).
  const show = readPushAmounts().then((showAmounts) =>
    self.registration.showNotification(title, {
      body: pushBody(payload, showAmounts),
      icon: "/brand/png/icon-192.png",
      badge: "/brand/png/icon-192.png",
      tag: payload.tag ?? "app",
      data: { url: payload.url ?? "/" },
      requireInteraction: false,
    }),
  );

  event.waitUntil(show);
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url: string = (event.notification.data as { url?: string })?.url ?? "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.endsWith(url) && "focus" in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});
