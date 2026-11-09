import { describe, expect, it } from "vitest";
import type { CardStatement } from "@/lib/api/schemas";
import { currentStatements, dayMonth, statementDates, totalIn, weekdayDayMonth } from "./statements";

const st = (periodYm: string, extra: Partial<CardStatement> = {}): CardStatement => ({
  periodYm,
  closingDate: `${periodYm}-24`,
  dueDate: "2026-12-03",
  status: "closed",
  totals: [],
  installmentCount: 0,
  minimumPayment: null,
  paidAt: null,
  paidAmount: null,
  paidCurrency: null,
  ...extra,
});

describe("statement dates", () => {
  it("writes days the Argentine way, with the weekday for due dates", () => {
    expect(dayMonth("2026-11-24")).toBe("24/11");
    expect(weekdayDayMonth("2026-12-03")).toBe("jueves 3/12");
  });

  it("says closes / closed / overdue", () => {
    expect(statementDates(st("2026-12", { status: "open", closingDate: "2026-12-24", dueDate: "2027-01-04" }))).toBe(
      "Cierra el 24/12 · vence el 4/1",
    );
    expect(statementDates(st("2026-11"))).toBe("Cerró el 24/11 · vence el jueves 3/12");
    expect(statementDates(st("2026-11", { status: "overdue" }))).toBe("Cerró el 24/11 · venció el jueves 3/12");
  });
});

describe("currentStatements", () => {
  it("picks the statement to pay and the open one", () => {
    const toPay = st("2026-11");
    const next = st("2026-12", { status: "open" });
    expect(currentStatements({ openPeriodYm: "2026-12", statements: [st("2026-10"), toPay, next] })).toEqual({ toPay, next });
  });

  it("crosses the year and copes with nothing loaded", () => {
    expect(currentStatements({ openPeriodYm: "2027-01", statements: [st("2026-12")] }).toPay?.periodYm).toBe("2026-12");
    expect(currentStatements(undefined)).toEqual({ toPay: undefined, next: undefined });
  });
});

describe("totalIn", () => {
  it("reads one currency, zero when absent", () => {
    const s = st("2026-11", { totals: [{ currency: "ARS", amount: 1500 }, { currency: "USD", amount: 10 }] });
    expect(totalIn(s, "USD")).toBe(10);
    expect(totalIn(s, "EUR")).toBe(0);
  });
});
