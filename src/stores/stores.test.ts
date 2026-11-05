import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getAuthSnapshot, useAuthStore } from "./auth";
import { getCurrentHouseholdId, useHouseholdStore, useHouseholdsResolved } from "./household";

const user = { id: "u1", email: "ana@example.test", firstName: "Ana", lastName: "Test", isSuperadmin: false };

beforeEach(() => {
  useAuthStore.setState({ user: null, accessToken: null, accessExpiresAt: null, hydrated: false });
  useHouseholdStore.setState({ currentId: null, resolvedFor: null });
});

describe("auth store", () => {
  it("setSession, setToken, setUser, setHydrated and clear", () => {
    const s = useAuthStore.getState();
    s.setSession({ user, accessToken: "t1", accessExpiresAt: "2099-01-01T00:00:00Z" });
    expect(getAuthSnapshot()).toEqual({ token: "t1", user });

    s.setToken("t2", "2099-02-01T00:00:00Z");
    expect(useAuthStore.getState()).toMatchObject({ accessToken: "t2", accessExpiresAt: "2099-02-01T00:00:00Z", user });

    s.setUser({ ...user, firstName: "Ane" });
    expect(useAuthStore.getState().user?.firstName).toBe("Ane");

    s.setHydrated(true);
    s.clear();
    // clear keeps "hydrated": the app knows there is no session.
    expect(useAuthStore.getState()).toMatchObject({ user: null, accessToken: null, accessExpiresAt: null, hydrated: true });
  });

  it("keeps the token in memory only", () => {
    useAuthStore.getState().setToken("secret", "2099-01-01T00:00:00Z");
    expect(JSON.stringify({ ...localStorage })).not.toContain("secret");
  });
});

describe("household store", () => {
  it("persists only the selected household", () => {
    useHouseholdStore.getState().setCurrentId("h1");
    useHouseholdStore.getState().markResolved("u1");
    expect(getCurrentHouseholdId()).toBe("h1");
    const saved = JSON.parse(localStorage.getItem("ahorro.household") ?? "{}");
    expect(saved.state).toEqual({ currentId: "h1" });
  });

  it("restores the selected household from storage", async () => {
    localStorage.setItem("ahorro.household", JSON.stringify({ state: { currentId: "h7" }, version: 0 }));
    await useHouseholdStore.persist.rehydrate();
    expect(useHouseholdStore.getState()).toMatchObject({ currentId: "h7", resolvedFor: null });
  });

  it("useHouseholdsResolved is true only for the user whose households were fetched", () => {
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useHouseholdsResolved(id), {
      initialProps: { id: "u1" } as { id?: string },
    });
    expect(result.current).toBe(false);
    useHouseholdStore.getState().markResolved("u1");
    rerender({ id: "u1" });
    expect(result.current).toBe(true);
    rerender({ id: "u2" });
    expect(result.current).toBe(false);
    rerender({ id: undefined });
    expect(result.current).toBe(false);
  });
});
