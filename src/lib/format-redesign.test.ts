import { afterEach, describe, expect, it, vi } from "vitest";
import { dayLabel, formatAmount } from "./format";

describe("formatAmount (design README §6)", () => {
  it("writes pesos with a space and es-AR digits", () => {
    expect(formatAmount(128450.5)).toBe("$ 128.450,50");
    expect(formatAmount(2500)).toBe("$ 2.500");
  });

  it("drops ,00 in lists but keeps it when asked", () => {
    expect(formatAmount(89990, "ARS", { cents: "auto" })).toBe("$ 89.990");
    expect(formatAmount(89990, "ARS", { cents: "always" })).toBe("$ 89.990,00");
    expect(formatAmount(1.5, "ARS", { cents: "never" })).toBe("$ 2");
  });

  it("uses US$ for dollars and the code for unknown currencies", () => {
    expect(formatAmount(1200, "USD")).toBe("US$ 1.200");
    expect(formatAmount(10, "BRL")).toBe("BRL 10");
  });

  it("signs incomes with + and negatives with -", () => {
    expect(formatAmount(1151143, "ARS", { income: true })).toBe("+ $ 1.151.143");
    expect(formatAmount(-500)).toBe("-$ 500");
  });

  it("rounds float noise instead of showing it", () => {
    expect(formatAmount(0.1 + 0.2)).toBe("$ 0,30");
    expect(formatAmount(100.004)).toBe("$ 100");
  });
});

describe("dayLabel", () => {
  const today = "2026-11-07"; // Saturday

  it("says Hoy and Ayer", () => {
    expect(dayLabel("2026-11-07", today)).toBe("Hoy");
    expect(dayLabel("2026-11-06T23:59:00Z", today)).toBe("Ayer");
  });

  it("uses the weekday within the last week", () => {
    expect(dayLabel("2026-11-02", today)).toBe("Lun 2");
    expect(dayLabel("2026-11-05", today)).toBe("Jue 5");
  });

  it("falls back to d/m, with the year when it differs", () => {
    expect(dayLabel("2026-10-31", today)).toBe("31/10");
    expect(dayLabel("2026-12-03", today)).toBe("3/12");
    expect(dayLabel("2025-12-03", today)).toBe("3/12/25");
  });

  it("keeps garbage as is", () => {
    expect(dayLabel("nope", today)).toBe("nope");
  });

  describe("without an injected today", () => {
    afterEach(() => vi.useRealTimers());
    it("uses the local day in Buenos Aires", () => {
      // 01:30 UTC on the 8th is still the 7th in Buenos Aires (UTC-3).
      vi.useFakeTimers({ now: new Date("2026-11-08T01:30:00Z") });
      expect(dayLabel("2026-11-07")).toBe("Hoy");
    });
  });
});
