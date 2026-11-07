import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("brand config", () => {
  it("defaults to Valuo", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "");
    vi.stubEnv("NEXT_PUBLIC_BRAND_TAGLINE", "");
    vi.stubEnv("NEXT_PUBLIC_BRAND_DESCRIPTION", "");
    const { brand } = await import("./brand");
    expect(brand).toEqual({
      name: "Valuo",
      tagline: "Sabé cuánto vale tu mes",
      description: "Gastos, tarjetas y cuotas, solo o en hogar.",
      title: "Valuo · Sabé cuánto vale tu mes",
    });
  });

  it("NEXT_PUBLIC_BRAND_* override the defaults", async () => {
    vi.stubEnv("NEXT_PUBLIC_BRAND_NAME", "Otro");
    vi.stubEnv("NEXT_PUBLIC_BRAND_TAGLINE", "Tu plata, clara");
    vi.stubEnv("NEXT_PUBLIC_BRAND_DESCRIPTION", "Gastos del hogar, en orden.");
    const { brand } = await import("./brand");
    expect(brand).toEqual({ name: "Otro", tagline: "Tu plata, clara", description: "Gastos del hogar, en orden.", title: "Otro · Tu plata, clara" });

    const manifest = (await import("@/app/manifest")).default();
    expect(manifest).toMatchObject({ name: "Otro · Tu plata, clara", short_name: "Otro", description: "Gastos del hogar, en orden." });
  });
});
