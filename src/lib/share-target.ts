// PWA Share Target (plan 3.4). Android shares a ticket photo, a payment
// screenshot or a text to the installed app as a POST to SHARE_PATH. The
// service worker keeps it in Cache Storage, on this device only, and sends
// the person to Cargar gasto, which reads it as if the camera had been used
// or the text typed (decided with the user). When the session is closed it
// waits there through the login for SHARE_TTL_MS, then it is dropped; logging
// out deletes it with the other caches.
import { STORAGE_KEYS } from "@/lib/storage-keys";

export const SHARE_PATH = "/compartir";
/** Where the service worker sends the person after keeping the share. */
export const SHARE_LANDING = "/agregar?recibido=1";
export const SHARE_TTL_MS = 10 * 60 * 1000;
/** Same cap as the box and the API (plan §8.3). */
export const SHARE_MAX_TEXT = 300;

const IMAGE_KEY = `${SHARE_PATH}/image`;
const TEXT_KEY = `${SHARE_PATH}/text`;
const AT_HEADER = "x-shared-at";

export type Shared = { image?: File; text?: string };

/**
 * The sentence to read from a shared text: title and text joined, links
 * dropped (apps add a link to the receipt), spaces collapsed, cut to the
 * box's limit. Empty when nothing is left.
 */
export function sharedSentence(title?: string | null, text?: string | null): string {
  const parts: string[] = [];
  for (const raw of [title, text]) {
    const clean = (raw ?? "")
      .replace(/https?:\/\/\S+/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    // Some apps send the same words as title and text.
    if (clean && !parts.some((p) => p.includes(clean))) parts.push(clean);
  }
  return Array.from(parts.join(" ")).slice(0, SHARE_MAX_TEXT).join("").trim();
}

function firstImage(form: FormData): File | undefined {
  for (const value of form.getAll("image")) {
    if (typeof value !== "string" && value.type.startsWith("image/") && value.size > 0) {
      return value;
    }
  }
  return undefined;
}

function str(form: FormData, key: string): string | null {
  const v = form.get(key);
  return typeof v === "string" ? v : null;
}

/** Keeps what was shared, replacing an earlier share. An image wins over text. */
export async function keepShare(store: CacheStorage, form: FormData, now: number): Promise<void> {
  await store.delete(STORAGE_KEYS.shareCache);
  const cache = await store.open(STORAGE_KEYS.shareCache);
  const headers = { [AT_HEADER]: String(now) };
  const image = firstImage(form);
  if (image) {
    await cache.put(
      IMAGE_KEY,
      new Response(await image.arrayBuffer(), {
        headers: { ...headers, "content-type": image.type, "x-name": encodeURIComponent(image.name || "compartido") },
      }),
    );
    return;
  }
  const text = sharedSentence(str(form, "title"), str(form, "text"));
  if (text) {
    await cache.put(TEXT_KEY, new Response(text, { headers: { ...headers, "content-type": "text/plain; charset=utf-8" } }));
  }
}

/**
 * Reads the share once: it is deleted whether it is used or not. Null when
 * there is none, it is older than SHARE_TTL_MS, or storage is unavailable.
 */
export async function takeShare(store: CacheStorage | undefined, now: number): Promise<Shared | null> {
  if (!store) return null;
  try {
    if (!(await store.has(STORAGE_KEYS.shareCache))) return null;
    const cache = await store.open(STORAGE_KEYS.shareCache);
    const [image, text] = await Promise.all([cache.match(IMAGE_KEY), cache.match(TEXT_KEY)]);
    await store.delete(STORAGE_KEYS.shareCache);
    const res = image ?? text;
    const at = Number(res?.headers.get(AT_HEADER));
    if (!res || !Number.isFinite(at) || now - at > SHARE_TTL_MS || at > now) return null;
    if (image) {
      const blob = await image.blob();
      const name = decodeURIComponent(image.headers.get("x-name") ?? "compartido");
      return { image: new File([blob], name, { type: image.headers.get("content-type") ?? blob.type }) };
    }
    const sentence = (await res.text()).trim();
    return sentence ? { text: sentence } : null;
  } catch {
    return null;
  }
}

/**
 * The service worker's answer to the share POST: keep it and go to Cargar
 * gasto. A share that cannot be read still lands there, where the form says
 * nothing arrived.
 */
export async function handleShare(request: Request, store: CacheStorage, now: number): Promise<Response> {
  try {
    await keepShare(store, await request.formData(), now);
  } catch {
    // Unreadable body or storage full: Cargar gasto says nothing arrived.
  }
  return Response.redirect(new URL(SHARE_LANDING, request.url).href, 303);
}

/** True for the share POST the service worker answers. */
export function isShareRequest(request: Request, origin: string): boolean {
  if (request.method !== "POST") return false;
  const url = new URL(request.url);
  return url.origin === origin && url.pathname === SHARE_PATH;
}
