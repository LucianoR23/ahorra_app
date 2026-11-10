import { describe, expect, it } from "vitest";
import { cashOrInstallments, parsePrefill, prefillHref, presentValue } from "./simulator";

describe("presentValue", () => {
  it("is the plain sum when money earns nothing", () => {
    expect(presentValue(1000, 3, 0)).toBe(3000);
  });

  it("discounts each installment from the month it is paid", () => {
    // 1000/1.1 + 1000/1.21
    expect(presentValue(1000, 2, 10)).toBeCloseTo(1735.54, 2);
  });
});

describe("cashOrInstallments", () => {
  it("prefers installments without interest when money earns something", () => {
    const r = cashOrInstallments(120000, 120000, 6, 3);
    expect(r.best).toBe("cuotas");
    expect(r.presentValue).toBeLessThan(120000);
  });

  it("prefers cash when the installments carry more interest than the yield", () => {
    expect(cashOrInstallments(100000, 150000, 6, 2).best).toBe("contado");
  });

  it("calls it even when they cost the same", () => {
    expect(cashOrInstallments(3000, 3000, 3, 0)).toEqual({ best: "igual", presentValue: 3000, difference: 0 });
  });
});

describe("prefill", () => {
  it("round-trips through Cargar gasto's query", () => {
    const href = prefillHref({ amount: 1500.5, currency: "USD", paymentMethodId: "pm1", installments: 6, categoryId: "c1" });
    expect(href).toBe("/agregar?amount=1500.5&currency=USD&paymentMethodId=pm1&installments=6&categoryId=c1");
    const params = Object.fromEntries(new URLSearchParams(href.split("?")[1]));
    expect(parsePrefill(params)).toEqual({ amount: 1500.5, currency: "USD", paymentMethodId: "pm1", installments: 6, categoryId: "c1" });
  });

  it("leaves one installment out of the link", () => {
    expect(prefillHref({ amount: 10, installments: 1 })).toBe("/agregar?amount=10");
  });

  it("drops what does not parse", () => {
    expect(parsePrefill({ amount: "-3", currency: "BTC", installments: "99", paymentMethodId: ["a", "b"] })).toEqual({});
  });
});
