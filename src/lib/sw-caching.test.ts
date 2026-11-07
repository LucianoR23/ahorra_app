import { NetworkOnly, type RouteMatchCallbackOptions } from "serwist";
import { describe, expect, it } from "vitest";
import { offlineFallback, OFFLINE_URL, runtimeCaching } from "./sw-caching";

const APP = "https://next.example.com";

function match(url: string, init?: RequestInit) {
  const u = new URL(url);
  const opts = {
    url: u,
    request: new Request(u, init),
    sameOrigin: u.origin === APP,
    event: {} as ExtendableEvent,
  } as RouteMatchCallbackOptions;
  return runtimeCaching.find((r) => {
    if (r.method && r.method !== (init?.method ?? "GET")) return false;
    const m = r.matcher;
    if (typeof m === "function") return Boolean(m(opts));
    if (m instanceof RegExp) return m.test(url);
    return m === url;
  });
}

describe("runtimeCaching", () => {
  it.each([
    "https://api-next.example.com/households/h1/balances",
    "https://api-next.example.com/me",
    "https://errors.example.com/api/1/envelope/",
    "https://accounts.google.com/gsi/client",
  ])("never caches cross-origin %s", (url) => {
    expect(match(url)?.handler).toBeInstanceOf(NetworkOnly);
  });

  it("puts the cross-origin rule first, ahead of Serwist's defaults", () => {
    expect(runtimeCaching[0].handler).toBeInstanceOf(NetworkOnly);
    expect(runtimeCaching.length).toBeGreaterThan(1);
  });
});

describe("offlineFallback", () => {
  const [entry] = offlineFallback.entries;
  const req = (destination: RequestDestination) => ({ destination }) as Request;

  it("serves the offline page for documents only", () => {
    expect(entry.url).toBe(OFFLINE_URL);
    expect(entry.matcher({ request: req("document") })).toBe(true);
    expect(entry.matcher({ request: req("image") })).toBe(false);
    expect(entry.matcher({ request: req("") })).toBe(false);
  });
});
