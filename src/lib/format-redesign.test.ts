import { afterEach, describe, expect, it, vi } from "vitest";
import { dayLabel, formatAmount, maskAmountsInText, maskedAmount } from "./format";

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
    expect(formatAmount(10, "XYZ")).toBe("XYZ 10");
  });

  it("writes the view currencies of plan 5.6, crypto with up to 8 decimals", () => {
    expect(formatAmount(123.75, "BRL")).toBe("R$ 123,75");
    expect(formatAmount(1500, "UYU")).toBe("$U 1.500");
    expect(formatAmount(30.8, "USDT")).toBe("USDT 30,80");
    expect(formatAmount(0.000396, "BTC")).toBe("BTC 0,000396");
    expect(formatAmount(1.5, "ETH", { compact: true })).toBe("ETH 1,5");
    expect(formatAmount(-0.123456789, "BTC")).toBe("-BTC 0,12345679");
    expect(maskedAmount("BTC")).toBe("BTC ••••••");
  });

  it("signs incomes with + and negatives with -", () => {
    expect(formatAmount(1151143, "ARS", { income: true })).toBe("+ $ 1.151.143");
    expect(formatAmount(-500)).toBe("-$ 500");
  });

  it("rounds float noise instead of showing it", () => {
    expect(formatAmount(0.1 + 0.2)).toBe("$ 0,30");
    expect(formatAmount(100.004)).toBe("$ 100");
  });

  it("compacts thousands below a million with an es-AR comma", () => {
    expect(formatAmount(12500, "ARS", { compact: true })).toBe("$ 12,5k");
    expect(formatAmount(250000, "ARS", { compact: true })).toBe("$ 250k");
    expect(formatAmount(999, "ARS", { compact: true })).toBe("$ 999");
    expect(formatAmount(2_500_000, "ARS", { compact: true })).toBe("$ 2.500.000");
    expect(formatAmount(1500, "USD", { compact: true, income: true })).toBe("+ US$ 1,5k");
  });
});

describe("discreet mode (plan 1.9)", () => {
  it("hides an amount behind a fixed-length mask", () => {
    expect(maskedAmount()).toBe("$ ••••••");
    expect(maskedAmount("USD")).toBe("US$ ••••••");
  });

  it("masks the amounts the API writes inside notification text", () => {
    expect(maskAmountsInText("Juan cargó \"Súper\" te toca 1234.56 ARS")).toBe("Juan cargó \"Súper\" te toca $ ••••••");
    expect(maskAmountsInText("Semana cerrada: $45210.00")).toBe("Semana cerrada: $ ••••••");
    expect(maskAmountsInText("Pasó de 10.00 USD a 12.50 USD (umbral 20%).")).toBe("Pasó de $ •••••• a $ •••••• (umbral 20%).");
    expect(maskAmountsInText("En 3 días vence la cuota 2/6 de \"TV\" ($ 1.500).")).toBe("En 3 días vence la cuota 2/6 de \"TV\" ($ ••••••).");
  });

  it("masks the es-AR amounts the API writes since plan 1.10c", () => {
    expect(maskAmountsInText("Ana cargó \"Súper\". Te toca $ 19.450,50.")).toBe("Ana cargó \"Súper\". Te toca $ ••••••.");
    expect(maskAmountsInText("Pasó de US$ 500 a US$ 1.200 (umbral 20%).")).toBe("Pasó de $ •••••• a $ •••••• (umbral 20%).");
    expect(maskAmountsInText("Llevás -$ 20 ahorrados de € 1.234.567,89 objetivo este mes.")).toBe(
      "Llevás -$ •••••• ahorrados de $ •••••• objetivo este mes.",
    );
    expect(maskAmountsInText("El resumen de tu Visa vence el sábado 7/3: $ 300 + US$ 25,10.")).toBe(
      "El resumen de tu Visa vence el sábado 7/3: $ •••••• + $ ••••••.",
    );
  });

  it("leaves text without amounts alone", () => {
    const text = "Objetivo al 80%. Cuota 3/12 del 15/11. Sumaste 2 categorías.";
    expect(maskAmountsInText(text)).toBe(text);
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
