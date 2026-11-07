import { describe, expect, it } from "vitest";
import { CATEGORY_ICONS, categoryIcon, categoryIconKey, DEFAULT_CATEGORY_ICON } from "./category-icons";

describe("category icons", () => {
  it("keeps stored keys", () => {
    expect(categoryIconKey("shopping-cart")).toBe("shopping-cart");
    expect(categoryIconKey("  bus ")).toBe("bus");
  });

  it("maps the emojis the API seeds and defaults to", () => {
    // internal/domain/category.go seeds + categories default "💰".
    expect(categoryIconKey("🍕")).toBe("utensils");
    expect(categoryIconKey("🏠")).toBe("house");
    expect(categoryIconKey("🚗")).toBe("car");
    expect(categoryIconKey("🎬")).toBe("clapperboard");
    expect(categoryIconKey("💡")).toBe("lightbulb");
    expect(categoryIconKey("💊")).toBe("pill");
    expect(categoryIconKey("📦")).toBe("package");
    expect(categoryIconKey("💰")).toBe("wallet");
  });

  it("ignores the emoji variation selector", () => {
    expect(categoryIconKey("✈")).toBe("plane");
    expect(categoryIconKey("✈️")).toBe("plane");
    expect(categoryIconKey("🛍")).toBe("shopping-bag");
  });

  it("falls back for unknown or empty values", () => {
    for (const value of ["🦄", "whatever", "", null, undefined, "toString", "__proto__"]) {
      expect(categoryIconKey(value)).toBe(DEFAULT_CATEGORY_ICON);
    }
    expect(categoryIcon(null)).toBe(CATEGORY_ICONS[DEFAULT_CATEGORY_ICON]);
  });

  it("has a Spanish label for every icon", () => {
    for (const { label } of Object.values(CATEGORY_ICONS)) expect(label).toMatch(/^\p{Lu}/u);
  });
});
