import { STORAGE_KEYS } from "@/lib/storage-keys";

// Amounts in push notifications (plan 1.9). By default a push never shows
// an amount, since it can appear on a locked screen. A user can opt in per
// device. The choice lives in IndexedDB because the service worker, which
// shows the push, can't read localStorage.

const STORE = "prefs";
const KEY = "pushAmounts";

export type PushPayload = {
  title?: string;
  body?: string;
  /** Same message with amounts (API 1.9). */
  bodyWithAmounts?: string;
  tag?: string;
  url?: string;
};

/** The text a push shows: with amounts only when this device opted in. */
export function pushBody(payload: PushPayload, showAmounts: boolean): string {
  if (showAmounts && payload.bodyWithAmounts) return payload.bodyWithAmounts;
  return payload.body ?? "";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(STORAGE_KEYS.deviceDb, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = op(db.transaction(STORE, mode).objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }).finally(() => db.close()),
  );
}

/** False unless this device opted in; also false when IndexedDB fails. */
export async function readPushAmounts(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    return (await run("readonly", (s) => s.get(KEY))) === true;
  } catch {
    return false;
  }
}

export async function writePushAmounts(show: boolean): Promise<void> {
  await run("readwrite", (s) => s.put(show, KEY));
}
