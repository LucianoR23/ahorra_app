import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { mutate } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { API, requests, resetRequests, server, signIn, signOut } from "@/test/msw";
import { useInsightsRealtime } from "./insights-stream";

vi.mock("swr", async (orig) => ({ ...(await orig<typeof import("swr")>()), mutate: vi.fn() }));

class FakeEventSource {
  static all: FakeEventSource[] = [];
  url: string;
  closed = false;
  onerror: (() => void) | null = null;
  listeners: Record<string, ((e: MessageEvent<string>) => void)[]> = {};
  constructor(url: string) {
    this.url = url;
    FakeEventSource.all.push(this);
  }
  addEventListener(name: string, fn: (e: MessageEvent<string>) => void) {
    (this.listeners[name] ??= []).push(fn);
  }
  emit(name: string, data: string) {
    for (const fn of this.listeners[name] ?? []) fn({ data } as MessageEvent<string>);
  }
  close() {
    this.closed = true;
  }
}

let ticketNo = 0;

beforeEach(() => {
  FakeEventSource.all = [];
  ticketNo = 0;
  resetRequests();
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.spyOn(console, "debug").mockImplementation(() => {});
  server.use(
    http.post(`${API}/insights/stream-ticket`, () => HttpResponse.json({ ticket: `tkt-${++ticketNo}`, expiresIn: 60 })),
  );
});
afterEach(() => vi.unstubAllGlobals());

const opened = async (n: number) => {
  await waitFor(() => expect(FakeEventSource.all).toHaveLength(n));
  return FakeEventSource.all[n - 1];
};

describe("useInsightsRealtime", () => {
  it("asks for a ticket and opens the stream with it, never with the access token", async () => {
    signIn({ token: "tk", householdId: "h1" });
    renderHook(() => useInsightsRealtime());
    const es = await opened(1);
    const url = new URL(es.url);
    expect(url.origin + url.pathname).toBe(`${API}/insights/stream`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ ticket: "tkt-1" });
    const ticketReq = requests().find((r) => r.path === "/insights/stream-ticket");
    expect(ticketReq?.method).toBe("POST");
    expect(ticketReq?.headers.get("authorization")).toBe("Bearer tk");
    expect(ticketReq?.headers.get("x-household-id")).toBe("h1");
  });

  it("does nothing without a session or a household", async () => {
    signOut();
    renderHook(() => useInsightsRealtime());
    signIn({ householdId: null });
    renderHook(() => useInsightsRealtime());
    await new Promise((r) => setTimeout(r, 20));
    expect(FakeEventSource.all).toHaveLength(0);
    expect(requests()).toHaveLength(0);
  });

  it("revalidates the insight lists on insight.created and ignores broken payloads", async () => {
    signIn();
    renderHook(() => useInsightsRealtime());
    const es = await opened(1);
    es.emit("ready", '{"ok":true}');
    es.emit("insight.created", '{"insight":{"id":"n1"}}');
    expect(mutate).toHaveBeenCalledTimes(1);
    const [match] = vi.mocked(mutate).mock.calls[0] as unknown as [(k: unknown) => boolean];
    expect(match(["/insights", {}])).toBe(true);
    expect(match(["/insights/unread-count"])).toBe(true);
    expect(match(["/insights/n1"])).toBe(true);
    expect(match(["/expenses"])).toBe(false);
    expect(match("/insights")).toBe(false); // SWR keys in hooks.ts are arrays

    es.emit("insight.created", "not json");
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("on an error closes the spent stream and reconnects with a new ticket after a backoff", async () => {
    signIn();
    renderHook(() => useInsightsRealtime());
    const first = await opened(1);
    act(() => first.onerror?.());
    expect(first.closed).toBe(true);
    expect(FakeEventSource.all).toHaveLength(1); // not before the 1 s backoff
    await waitFor(() => expect(FakeEventSource.all).toHaveLength(2), { timeout: 3000 });
    const second = FakeEventSource.all[1];
    expect(new URL(second.url).searchParams.get("ticket")).toBe("tkt-2");
  });

  it("reconnects when the token changes and closes on unmount", async () => {
    signIn({ token: "t1" });
    const { unmount } = renderHook(() => useInsightsRealtime());
    const first = await opened(1);
    act(() => useAuthStore.getState().setToken("t2", "2099-01-01T00:00:00Z"));
    const second = await opened(2);
    expect(first.closed).toBe(true);
    expect(new URL(second.url).searchParams.get("ticket")).toBe("tkt-2");
    unmount();
    expect(second.closed).toBe(true);
  });
});
