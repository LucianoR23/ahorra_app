import { describe, expect, it } from "vitest";
import type { Rate } from "@/lib/api/schemas";
import { availableViewCurrencies, convert, isStale, periodChange, pricedByCoinGecko, rateFor, rateSourceLabel, sourceOf, viewCurrencyOf } from "./fx";

const rate = (currency: string, source: string, rateSell: number, rateAvg = rateSell - 10): Rate => ({
  currency, source, rateSell, rateAvg, rateBuy: rateSell - 20, lastUpdate: "2026-11-10T12:00:00Z", fetchedAt: "2026-11-10T12:00:00Z",
});

const rates = [
  rate("USD", "oficial", 1000),
  rate("USD", "bolsa", 1200),
  rate("USD", "tarjeta", 2041),
  rate("EUR", "oficial", 1100),
  rate("EUR", "blue", 0, 1300),
];

describe("rateFor (plan 5.1, same rules as the API)", () => {
  it("uses the selling price of the source", () => {
    expect(rateFor(rates, "USD", "bolsa")).toBe(1200);
    expect(rateFor(rates, "USD", "tarjeta")).toBe(2041);
  });

  it("falls back to the average without a selling price", () => {
    expect(rateFor(rates, "EUR", "blue")).toBe(1300);
  });

  it("prices a euro through the dollar when that source has no euro", () => {
    expect(rateFor(rates, "EUR", "bolsa")).toBe(1320);
  });

  it("is null without the rate, and 1 for pesos", () => {
    expect(rateFor(rates, "USD", "cripto")).toBeNull();
    expect(rateFor(undefined, "USD", "bolsa")).toBeNull();
    expect(rateFor(rates, "ARS", "bolsa")).toBe(1);
  });
});

describe("convert", () => {
  it("converts into pesos and from pesos", () => {
    expect(convert(rates, 100, "USD", "ARS", "tarjeta")).toEqual({ amountBase: 204100, rate: 2041 });
    expect(convert(rates, 120000, "ARS", "USD", "bolsa")).toEqual({ amountBase: 100, rate: 1 / 1200 });
  });

  it("is identity in the same currency and null without rates", () => {
    expect(convert(rates, 5, "USD", "USD", "bolsa")).toEqual({ amountBase: 5, rate: 1 });
    expect(convert(rates, 5, "USD", "ARS", "cripto")).toBeNull();
  });
});

describe("labels", () => {
  it("names the sources", () => {
    expect(rateSourceLabel("bolsa")).toBe("MEP");
    expect(rateSourceLabel("contadoconliqui")).toBe("CCL");
    expect(rateSourceLabel("futuro")).toBe("futuro");
    expect(sourceOf(undefined)).toBe("bolsa");
    expect(sourceOf("blue")).toBe("blue");
  });
});

describe("isStale (plan 5.2)", () => {
  const stale = (r: Rate): Rate => ({ ...r, stale: true });
  it("follows the rate used, or the three a crossed euro uses", () => {
    const list = [stale(rate("USD", "tarjeta", 2041)), rate("USD", "bolsa", 1200), rate("USD", "oficial", 1000), stale(rate("EUR", "oficial", 1100))];
    expect(isStale(list, "USD", "tarjeta")).toBe(true);
    expect(isStale(list, "USD", "bolsa")).toBe(false);
    expect(isStale(list, "EUR", "bolsa")).toBe(true); // through the stale official euro
    expect(isStale(list, "ARS", "tarjeta")).toBe(false);
    expect(isStale(undefined, "USD", "bolsa")).toBe(false);
  });
});

describe("periodChange (plan 5.2b)", () => {
  it("compares the last selling price with the first", () => {
    expect(periodChange([{ rateSell: 1500, rateAvg: 0 }, { rateSell: 1587.9, rateAvg: 0 }])).toBeCloseTo(5.86, 2);
    expect(periodChange([{ rateSell: 0, rateAvg: 1000 }, { rateSell: 900, rateAvg: 0 }])).toBe(-10);
    expect(periodChange([{ rateSell: 1500, rateAvg: 0 }])).toBeNull();
  });
});

describe("Ver en currencies (plan 5.6)", () => {
  it("offers the dollar always and the rest with a quote", () => {
    expect(availableViewCurrencies(undefined).map((c) => c.value)).toEqual(["USD"]);
    expect(availableViewCurrencies([rate("BTC", "cripto", 1e8), rate("EUR", "oficial", 1100)]).map((c) => c.value)).toEqual(["USD", "EUR", "BTC"]);
  });

  it("knows each currency and which need CoinGecko's mention", () => {
    expect(viewCurrencyOf("CLP")?.label).toBe("Pesos chilenos");
    expect(viewCurrencyOf("ARS")).toBeUndefined();
    expect(["USDT", "BTC", "ETH", "EUR"].map(pricedByCoinGecko)).toEqual([false, true, true, false]);
  });
});
