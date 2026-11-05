import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("brand config", () => {
  it("defaults to today's name", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "");
    const { brand } = await import("./brand");
    expect(brand).toMatchObject({ name: "Ahorro", title: "Ahorro — Personal Finance Coach" });
  });

  it("reads the NEXT_PUBLIC_BRAND_* values (how 1.1 switches to Valuo)", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "Valuo");
    vi.stubEnv("NEXT_PUBLIC_BRAND_TAGLINE", "Tu plata, clara");
    vi.stubEnv("NEXT_PUBLIC_BRAND_DESCRIPTION", "Gastos del hogar, en orden.");
    const { brand } = await import("./brand");
    expect(brand).toEqual({ name: "Valuo", tagline: "Tu plata, clara", description: "Gastos del hogar, en orden.", title: "Valuo — Tu plata, clara" });

    const manifest = (await import("@/app/manifest")).default();
    expect(manifest).toMatchObject({ name: "Valuo — Tu plata, clara", short_name: "Valuo", description: "Gastos del hogar, en orden." });
  });
});
