import { afterEach, describe, expect, it, vi } from "vitest";
import { LEGACY_STORAGE_KEYS, STORAGE_KEYS, migrateLegacyStorage } from "./storage-keys";

afterEach(() => vi.resetModules());

describe("storage keys", () => {
  it("are brand-neutral", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key).toMatch(/^app\./);
      expect(key).not.toMatch(/ahorr|valuo/i);
    }
  });

  it("migrates every old key once, keeping a value already under the new name", () => {
    localStorage.setItem("ahorra.remembered_email", "ana@example.test");
    localStorage.setItem("ahorra.install.dismissed", "1");
    localStorage.setItem("ahorra.push.dismissed", "old");
    localStorage.setItem(STORAGE_KEYS.pushDismissed, "new");

    migrateLegacyStorage();

    expect(localStorage.getItem(STORAGE_KEYS.rememberedEmail)).toBe("ana@example.test");
    expect(localStorage.getItem(STORAGE_KEYS.installDismissed)).toBe("1");
    expect(localStorage.getItem(STORAGE_KEYS.pushDismissed)).toBe("new");
    for (const oldKey of Object.keys(LEGACY_STORAGE_KEYS)) {
      expect(localStorage.getItem(oldKey)).toBeNull();
    }

    migrateLegacyStorage(); // idempotent
    expect(localStorage.getItem(STORAGE_KEYS.rememberedEmail)).toBe("ana@example.test");
  });

  it("tolerates missing or failing storage", () => {
    expect(() => migrateLegacyStorage(undefined)).not.toThrow();
    const broken = { getItem: () => { throw new Error("denied"); } } as unknown as Storage;
    expect(() => migrateLegacyStorage(broken)).not.toThrow();
  });

  it("the household store reads the migrated household on first load", async () => {
    localStorage.setItem("ahorro.household", JSON.stringify({ state: { currentId: "h-legacy" }, version: 0 }));
    const { useHouseholdStore } = await import("@/stores/household"); // fresh module: migration runs first
    expect(useHouseholdStore.getState().currentId).toBe("h-legacy");
    expect(localStorage.getItem("ahorro.household")).toBeNull();
  });
});
