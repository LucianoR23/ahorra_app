// Ahorra Service Worker — Web Push + deep-link navigation

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Ahorra", body: event.data.text() };
  }

  const title = payload.title ?? "Ahorra";
  const options = {
    body: payload.body ?? "",
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
    tag: payload.tag ?? "ahorra",
    data: { url: payload.url ?? "/" },
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        // Focus existing window if already open on that URL
        for (const client of windowClients) {
          if (client.url.endsWith(url) && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      }),
  );
});

// Activate immediately — no waiting for old tabs to close
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(clients.claim()),
);
