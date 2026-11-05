import { act, renderHook } from "@testing-library/react";
import { mutate } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/stores/auth";
import { API, signIn, signOut } from "@/test/msw";
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

beforeEach(() => {
  FakeEventSource.all = [];
  vi.stubGlobal("EventSource", FakeEventSource);
  vi.spyOn(console, "debug").mockImplementation(() => {});
});
afterEach(() => vi.unstubAllGlobals());

describe("useInsightsRealtime", () => {
  it("opens the stream with the token and household in the query", () => {
    signIn({ token: "tk", householdId: "h1" });
    renderHook(() => useInsightsRealtime());
    expect(FakeEventSource.all).toHaveLength(1);
    const url = new URL(FakeEventSource.all[0].url);
    expect(url.origin + url.pathname).toBe(`${API}/insights/stream`);
    expect(Object.fromEntries(url.searchParams)).toEqual({ access_token: "tk", householdId: "h1" });
  });

  it("does nothing without a session or a household", () => {
    signOut();
    renderHook(() => useInsightsRealtime());
    signIn({ householdId: null });
    renderHook(() => useInsightsRealtime());
    expect(FakeEventSource.all).toHaveLength(0);
  });

  it("revalidates the insight lists on insight.created and ignores broken payloads", () => {
    signIn();
    renderHook(() => useInsightsRealtime());
    const es = FakeEventSource.all[0];
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
    es.onerror?.();
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("reconnects when the token changes and closes on unmount", () => {
    signIn({ token: "t1" });
    const { unmount } = renderHook(() => useInsightsRealtime());
    act(() => useAuthStore.getState().setToken("t2", "2099-01-01T00:00:00Z"));
    expect(FakeEventSource.all).toHaveLength(2);
    expect(FakeEventSource.all[0].closed).toBe(true);
    expect(new URL(FakeEventSource.all[1].url).searchParams.get("access_token")).toBe("t2");
    unmount();
    expect(FakeEventSource.all[1].closed).toBe(true);
  });
});
