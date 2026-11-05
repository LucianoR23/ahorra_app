import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import { API, lastRequest, server } from "@/test/msw";
import {
  fetchVapidPublicKey,
  isIosSafari,
  isStandalone,
  registerServiceWorker,
  sendSubscriptionToBackend,
  subscribeToPush,
  unsubscribePush,
} from "./push";

afterEach(() => vi.unstubAllGlobals());

const fakeSub = (endpoint = "https://fcm.googleapis.com/x") =>
  ({
    endpoint,
    toJSON: () => ({ endpoint, keys: { p256dh: "pk", auth: "au" } }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }) as unknown as PushSubscription;

describe("fetchVapidPublicKey", () => {
  it("returns the key, or an empty string when push is off or the call fails", async () => {
    server.use(http.get(`${API}/push/vapid-public-key`, () => HttpResponse.json({ publicKey: "BPk", enabled: true })));
    await expect(fetchVapidPublicKey()).resolves.toBe("BPk");
    server.use(http.get(`${API}/push/vapid-public-key`, () => HttpResponse.json({ publicKey: "", enabled: false })));
    await expect(fetchVapidPublicKey()).resolves.toBe("");
    server.use(http.get(`${API}/push/vapid-public-key`, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchVapidPublicKey()).resolves.toBe("");
    server.use(http.get(`${API}/push/vapid-public-key`, () => HttpResponse.error()));
    await expect(fetchVapidPublicKey()).resolves.toBe("");
  });
});

describe("subscriptions", () => {
  it("sends the subscription with the bearer token", async () => {
    server.use(http.post(`${API}/push/subscriptions`, () => HttpResponse.json({ id: "s1" }, { status: 201 })));
    await expect(sendSubscriptionToBackend(fakeSub(), "tk", "test-agent")).resolves.toBe(true);
    const r = lastRequest();
    expect(r.headers.get("authorization")).toBe("Bearer tk");
    await expect.poll(() => (r.body ? JSON.parse(r.body) : null)).toEqual({
      endpoint: "https://fcm.googleapis.com/x", keys: { p256dh: "pk", auth: "au" }, userAgent: "test-agent",
    });
  });

  it("reports failure on an error status or a network error", async () => {
    server.use(http.post(`${API}/push/subscriptions`, () => new HttpResponse(null, { status: 422 })));
    await expect(sendSubscriptionToBackend(fakeSub(), "tk")).resolves.toBe(false);
    server.use(http.post(`${API}/push/subscriptions`, () => HttpResponse.error()));
    await expect(sendSubscriptionToBackend(fakeSub(), "tk")).resolves.toBe(false);
  });

  it("subscribeToPush reuses an existing subscription, otherwise subscribes with the decoded key", async () => {
    const existing = fakeSub();
    const reg = { pushManager: { getSubscription: vi.fn().mockResolvedValue(existing), subscribe: vi.fn() } };
    await expect(subscribeToPush(reg as never, "AQAB")).resolves.toBe(existing);
    expect(reg.pushManager.subscribe).not.toHaveBeenCalled();

    const created = fakeSub();
    reg.pushManager.getSubscription.mockResolvedValue(null);
    reg.pushManager.subscribe.mockResolvedValue(created);
    await expect(subscribeToPush(reg as never, "AQAB")).resolves.toBe(created);
    const opts = reg.pushManager.subscribe.mock.calls[0][0];
    expect(opts.userVisibleOnly).toBe(true);
    expect(new Uint8Array(opts.applicationServerKey)).toEqual(new Uint8Array([1, 0, 1]));

    reg.pushManager.subscribe.mockRejectedValue(new Error("denied"));
    await expect(subscribeToPush(reg as never, "AQAB")).resolves.toBeNull();
  });

  it("unsubscribePush unsubscribes in the browser and tells the API", async () => {
    const sub = fakeSub("https://fcm.googleapis.com/mine");
    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue(sub) } }) },
    });
    server.use(http.delete(`${API}/push/subscriptions`, () => new HttpResponse(null, { status: 204 })));
    await unsubscribePush("tk");
    expect(sub.unsubscribe).toHaveBeenCalled();
    const r = lastRequest();
    expect(r.method).toBe("DELETE");
    await expect.poll(() => r.body).toBe('{"endpoint":"https://fcm.googleapis.com/mine"}');
  });
});

describe("environment checks", () => {
  it("registerServiceWorker returns null without service worker support", async () => {
    // jsdom has no navigator.serviceWorker.
    await expect(registerServiceWorker()).resolves.toBeNull();
  });

  it("registerServiceWorker registers /sw.js at the root scope", async () => {
    const register = vi.fn().mockResolvedValue({ scope: "/" });
    vi.stubGlobal("navigator", { ...navigator, serviceWorker: { register } });
    await expect(registerServiceWorker()).resolves.toEqual({ scope: "/" });
    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
  });

  it("isStandalone reads the display mode", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q === "(display-mode: standalone)" }));
    expect(isStandalone()).toBe(true);
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    expect(isStandalone()).toBe(false);
  });

  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1", true],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/130.0 Mobile/15E148 Safari/604.1", false],
    ["Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36", false],
  ])("isIosSafari(%s) = %s", (ua, want) => {
    vi.stubGlobal("navigator", { ...navigator, userAgent: ua });
    expect(isIosSafari()).toBe(want);
  });
});
