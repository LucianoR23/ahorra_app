import { API_URL } from "./api/client";


/** Convert VAPID base64url public key to Uint8Array for pushManager.subscribe(). */
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

/**
 * Fetch the VAPID public key from the backend.
 * Returns empty string if push is not configured server-side.
 */
export async function fetchVapidPublicKey(): Promise<string> {
  try {
    const res = await fetch(`${API_URL}/push/vapid-public-key`, {
      cache: "no-store",
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? "";
  } catch {
    return "";
  }
}

/** Register /sw.js and return the ServiceWorkerRegistration. */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

/**
 * Subscribe to push using the given VAPID public key.
 * Returns the PushSubscription or null on failure.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration,
  vapidPublicKey: string,
): Promise<PushSubscription | null> {
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing;
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  } catch {
    return null;
  }
}

/** Send PushSubscription to the backend. Requires access token. */
export async function sendSubscriptionToBackend(
  subscription: PushSubscription,
  accessToken: string,
  userAgent?: string,
): Promise<boolean> {
  const json = subscription.toJSON();
  try {
    const res = await fetch(`${API_URL}/push/subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
        userAgent: userAgent ?? navigator.userAgent,
      }),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

/**
 * Unsubscribe from push (browser-side) and notify the backend.
 * Reads the current subscription directly from the SW — no localStorage needed.
 * Should be called on logout.
 */
export async function unsubscribePush(accessToken: string): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;

    const endpoint = sub.endpoint;
    await sub.unsubscribe();

    await fetch(`${API_URL}/push/subscriptions`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      credentials: "include",
      body: JSON.stringify({ endpoint }),
    });
  } catch {
    // Ignore — backend GC stale subs on 404/410 from push service anyway
  }
}

/** True when running as an installed PWA (standalone mode). */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** True when the browser is Safari on iOS (without Chrome/Firefox UA override). */
export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iP(hone|ad|od)/.test(navigator.userAgent) &&
    /Safari/.test(navigator.userAgent) &&
    !/CriOS|FxiOS|OPiOS/.test(navigator.userAgent)
  );
}
