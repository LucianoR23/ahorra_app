import { describe, expect, it } from "vitest";
import { CATEGORY_ICONS, categoryIcon, categoryIconKey, DEFAULT_CATEGORY_ICON } from "./category-icons";

describe("category icons", () => {
  it("keeps stored keys", () => {
    expect(categoryIconKey("shopping-cart")).toBe("shopping-cart");
    expect(categoryIconKey("  bus ")).toBe("bus");
  });

  it("has every icon the API seeds (internal/domain/category.go)", () => {
    const seeded = ["shopping-cart", "store", "bike", "utensils", "bus", "ticket", "car-taxi-front", "fuel", "building",
      "key-round", "lightbulb", "zap", "flame", "droplet", "wifi", "smartphone", "heart-pulse", "briefcase-medical",
      "pill", "graduation-cap", "tv", "paw-print", "shirt", "sofa", "gift", "plane", "landmark", "package"];
    for (const key of seeded) expect(categoryIconKey(key)).toBe(key);
  });

  it("falls back for unknown or empty values", () => {
    // Plan 1.4 migrated stored emojis; one left over shows the default.
    for (const value of ["🍕", "🦄", "whatever", "", null, undefined, "toString", "__proto__"]) {
      expect(categoryIconKey(value)).toBe(DEFAULT_CATEGORY_ICON);
    }
    expect(categoryIcon(null)).toBe(CATEGORY_ICONS[DEFAULT_CATEGORY_ICON]);
  });

  it("has a Spanish label for every icon", () => {
    for (const { label } of Object.values(CATEGORY_ICONS)) expect(label).toMatch(/^\p{Lu}/u);
  });
});
