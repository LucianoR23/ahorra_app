import { renderHook } from "@testing-library/react";
import useSWR, { mutate } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { signIn } from "@/test/msw";
import { clearLocalSession } from "./session";

/** In-memory Cache Storage with the names a deployed app has. */
function fakeCaches(names: string[]) {
  const store = new Set(names);
  return {
    store,
    keys: vi.fn(async () => [...store]),
    delete: vi.fn(async (n: string) => store.delete(n)),
  };
}

const readSWR = (key: string) => renderHook(() => useSWR(key)).result.current.data;

beforeEach(() => {
  signIn({ token: "tk" });
  useHouseholdStore.getState().setCurrentId("h1");
  useHouseholdStore.getState().markResolved("u1");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("clearLocalSession", () => {
  it("signs out and forgets the household, also in localStorage", async () => {
    expect(localStorage.getItem(STORAGE_KEYS.household)).toContain("h1");
    await clearLocalSession();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useHouseholdStore.getState().currentId).toBeNull();
    expect(useHouseholdStore.getState().resolvedFor).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.household)).toBeNull();
  });

  it("keeps device preferences", async () => {
    localStorage.setItem(STORAGE_KEYS.rememberedEmail, "ana@example.com");
    await clearLocalSession();
    expect(localStorage.getItem(STORAGE_KEYS.rememberedEmail)).toBe("ana@example.com");
  });

  it("empties the SWR cache", async () => {
    await mutate("/households/h1/balances", { total: 1000 }, { revalidate: false });
    expect(readSWR("/households/h1/balances")).toEqual({ total: 1000 });
    await clearLocalSession();
    expect(readSWR("/households/h1/balances")).toBeUndefined();
  });

  it("deletes runtime caches and keeps the precache", async () => {
    const c = fakeCaches(["serwist-precache-v2-https://app/", "pages", "pages-rsc", "cross-origin", "apis"]);
    vi.stubGlobal("caches", c);
    await clearLocalSession();
    expect([...c.store]).toEqual(["serwist-precache-v2-https://app/"]);
  });

  it("still signs out when Cache Storage fails", async () => {
    vi.stubGlobal("caches", { keys: vi.fn().mockRejectedValue(new Error("SecurityError")) });
    await expect(clearLocalSession()).resolves.toBeUndefined();
    expect(useAuthStore.getState().accessToken).toBeNull();
  });
});
