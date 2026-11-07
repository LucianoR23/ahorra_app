import { describe, expect, it } from "vitest";
import { brandColor } from "./brand-tokens";

describe("brandColor", () => {
  it("reads a color token per theme from the vendored kit", () => {
    expect(brandColor("bg", "dark")).toMatch(/^#[0-9A-F]{6}$/i);
    expect(brandColor("bg", "light")).not.toBe(brandColor("bg", "dark"));
  });

  it("throws on an unknown token", () => {
    expect(() => brandColor("nope", "dark")).toThrow(/nope/);
  });
});
