import { describe, expect, it } from "vitest";
import { STORAGE_KEYS } from "./storage-keys";

describe("storage keys", () => {
  it("are brand-neutral", () => {
    for (const key of Object.values(STORAGE_KEYS)) {
      expect(key).toMatch(/^app\./);
      expect(key).not.toMatch(/ahorr|valuo/i);
    }
  });
});
