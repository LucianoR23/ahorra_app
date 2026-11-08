import { describe, expect, it } from "vitest";
import {
  bankOptions,
  cardDraftError,
  cardDrafts,
  cardInput,
  defaultCardName,
  findByName,
  otherMethodInputs,
  parseDay,
  periodFromDays,
  type CardDraft,
  type PayOption,
} from "./onboarding";
import { track } from "./track";

const draft = (over: Partial<CardDraft> = {}): CardDraft => ({
  key: "visa",
  network: "visa",
  bank: "Galicia",
  bankLocked: false,
  closingDay: "25",
  dueDay: "5",
  ...over,
});

describe("periodFromDays", () => {
  it("closes this month when the day is still ahead", () => {
    expect(periodFromDays("2026-11-08", 25, 5)).toEqual({ closingDate: "2026-11-25", dueDate: "2026-12-05" });
  });

  it("closing today counts as this month", () => {
    expect(periodFromDays("2026-11-25", 25, 5).closingDate).toBe("2026-11-25");
  });

  it("moves to next month once the day passed, across the year", () => {
    expect(periodFromDays("2026-12-26", 25, 5)).toEqual({ closingDate: "2027-01-25", dueDate: "2027-02-05" });
  });

  it("keeps the due date in the closing month when it comes later", () => {
    expect(periodFromDays("2026-11-01", 3, 20)).toEqual({ closingDate: "2026-11-03", dueDate: "2026-11-20" });
  });

  it("a due day equal to the closing day falls next month", () => {
    expect(periodFromDays("2026-11-01", 10, 10)).toEqual({ closingDate: "2026-11-10", dueDate: "2026-12-10" });
  });

  it("days past the end of the month fall on its last day", () => {
    expect(periodFromDays("2027-02-01", 31, 30)).toEqual({ closingDate: "2027-02-28", dueDate: "2027-03-30" });
    expect(periodFromDays("2026-12-01", 31, 31)).toEqual({ closingDate: "2026-12-31", dueDate: "2027-01-31" });
  });
});

describe("parseDay", () => {
  it.each([
    ["1", 1],
    [" 31 ", 31],
    ["07", 7],
  ])("%s → %d", (raw, want) => expect(parseDay(raw)).toBe(want));

  it.each(["", "0", "32", "1.5", "-3", "abc", "123"])("%j is not a day", (raw) => expect(parseDay(raw)).toBeNull());
});

describe("cards", () => {
  it("one draft per picked network, plus the Mercado Pago card when the user has it", () => {
    const picked = new Set<PayOption>(["amex", "visa", "mercadopago", "cash"]);
    expect(cardDrafts(picked, false).map((d) => d.key)).toEqual(["visa", "amex"]);
    const withMp = cardDrafts(picked, true);
    expect(withMp.map((d) => d.key)).toEqual(["visa", "amex", "mercadopago-card"]);
    expect(withMp[2]).toMatchObject({ network: "mastercard", bank: "Mercado Pago", bankLocked: true });
  });

  it("names a card after network and bank", () => {
    expect(defaultCardName("visa", " Galicia ")).toBe("Visa Galicia");
    expect(defaultCardName("amex", "")).toBe("American Express");
  });

  it("offers the user's banks first and no duplicates", () => {
    const opts = bankOptions(["galicia", "Mi banco"]);
    expect(opts.slice(0, 2)).toEqual(["galicia", "Mi banco"]);
    expect(opts).not.toContain("Galicia");
    expect(opts).toContain("Santander");
  });

  it("says what a draft is missing", () => {
    expect(cardDraftError(draft())).toBeNull();
    expect(cardDraftError(draft({ bank: " " }))).toBe("Elegí el banco");
    expect(cardDraftError(draft({ closingDay: "40" }))).toMatch(/cierre/);
    expect(cardDraftError(draft({ dueDay: "" }))).toMatch(/vencimiento/);
  });

  it("builds the credit card body with the next statement", () => {
    expect(cardInput(draft(), "bank-1", "  ", "2026-11-08")).toEqual({
      name: "Visa Galicia",
      kind: "credit",
      bankId: "bank-1",
      allowsInstallments: true,
      creditCard: {
        alias: "Visa Galicia",
        network: "visa",
        defaultClosingDay: 25,
        defaultDueDay: 5,
        currentPeriod: { closingDate: "2026-11-25", dueDate: "2026-12-05" },
      },
    });
    expect(cardInput(draft(), "b", "Visa Gold", "2026-11-08").name).toBe("Visa Gold");
  });
});

describe("other methods", () => {
  it("adds the Mercado Pago wallet and a debit; Efectivo already exists", () => {
    expect(otherMethodInputs(new Set<PayOption>(["visa"]))).toEqual([]);
    expect(otherMethodInputs(new Set<PayOption>(["mercadopago", "cash"]))).toEqual([
      { name: "Mercado Pago", kind: "wallet", allowsInstallments: false },
      { name: "Débito", kind: "debit", allowsInstallments: false },
    ]);
  });

  it("matches names ignoring case and spaces", () => {
    const list = [{ name: "Mercado Pago" }, { name: "Débito" }];
    expect(findByName(list, " mercado pago ")).toBe(list[0]);
    expect(findByName(list, "Visa")).toBeUndefined();
    expect(findByName(undefined, "Visa")).toBeUndefined();
  });
});

describe("track", () => {
  it("is a no-op until analytics exist (plan 13.3)", () => {
    expect(track("onboarding_step_viewed", { step: "name" })).toBeUndefined();
  });
});
