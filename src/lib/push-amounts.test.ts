import { afterEach, describe, expect, it, vi } from "vitest";
import { pushBody, readPushAmounts, writePushAmounts } from "./push-amounts";

// Plan 1.9: no amounts on the lock screen unless the device opted in.
describe("pushBody", () => {
  const payload = { body: "Ana registró un pago.", bodyWithAmounts: "Ana registró un pago de 10.00 ARS" };

  it("leaves amounts out by default", () => {
    expect(pushBody(payload, false)).toBe("Ana registró un pago.");
  });

  it("shows them on a device that opted in", () => {
    expect(pushBody(payload, true)).toBe("Ana registró un pago de 10.00 ARS");
  });

  it("falls back to the plain body when there is no amount version", () => {
    expect(pushBody({ body: "Ahora sos miembro de Casa" }, true)).toBe("Ahora sos miembro de Casa");
    expect(pushBody({}, true)).toBe("");
  });
});

describe("readPushAmounts", () => {
  it("says no when the browser has no IndexedDB", async () => {
    expect(typeof indexedDB).toBe("undefined");
    expect(await readPushAmounts()).toBe(false);
  });
});

// Just enough IndexedDB for push-amounts: one database, one object store,
// get and put. Requests answer on the next tick, like the real thing.
function fakeIndexedDB({ failOpen = false, failGet = false } = {}) {
  const data = new Map<string, unknown>();
  const stores = new Set<string>();
  const request = <T>(fn: () => T, fail = false) => {
    const req = { result: undefined as T | undefined, error: null as Error | null } as {
      result?: T;
      error: Error | null;
      onsuccess?: () => void;
      onerror?: () => void;
      onupgradeneeded?: () => void;
    };
    setTimeout(() => {
      if (fail) {
        req.error = new Error("blocked");
        req.onerror?.();
        return;
      }
      req.result = fn();
      req.onsuccess?.();
    });
    return req;
  };
  const db = {
    createObjectStore: (name: string) => stores.add(name),
    transaction: (name: string) => {
      if (!stores.has(name)) throw new Error(`no store ${name}`);
      return {
        objectStore: () => ({
          get: (key: string) => request(() => data.get(key), failGet),
          put: (value: unknown, key: string) => request(() => data.set(key, value) && key),
        }),
      };
    },
    close: vi.fn(),
  };
  return {
    db,
    // The first open of a new database fires onupgradeneeded before onsuccess.
    open: () => {
      const req = request(() => {
        if (stores.size === 0) {
          req.result = db;
          req.onupgradeneeded?.();
        }
        return db;
      }, failOpen);
      return req;
    },
  };
}

describe("push amounts in IndexedDB", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is off until written, then remembers the choice", async () => {
    const idb = fakeIndexedDB();
    vi.stubGlobal("indexedDB", idb);
    expect(await readPushAmounts()).toBe(false);
    await writePushAmounts(true);
    expect(await readPushAmounts()).toBe(true);
    await writePushAmounts(false);
    expect(await readPushAmounts()).toBe(false);
    expect(idb.db.close).toHaveBeenCalled();
  });

  it("says no when the database can't be opened or read", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDB({ failOpen: true }));
    expect(await readPushAmounts()).toBe(false);
    await expect(writePushAmounts(true)).rejects.toThrow("blocked");

    vi.stubGlobal("indexedDB", fakeIndexedDB({ failGet: true }));
    expect(await readPushAmounts()).toBe(false);
  });
});
