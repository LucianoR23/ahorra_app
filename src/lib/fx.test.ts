import { describe, expect, it } from "vitest";
import type { Rate } from "@/lib/api/schemas";
import { convert, rateFor, rateSourceLabel, sourceOf } from "./fx";

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
