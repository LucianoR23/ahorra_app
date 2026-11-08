import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentMonth,
  fmtDateShort,
  fmtMonthLong,
  greeting,
  isoMonth,
  isoToday,
  monthEnd,
  monthStart,
  projectBillingMonth,
  shiftMonth,
} from "./format";
import { FREQUENCY_LABELS, INCOME_SOURCES, incomeSourceLabel, PAYMENT_METHOD_KIND_LABELS, TICKET_OPEN_STATUSES } from "./labels";

afterEach(() => vi.useRealTimers());

describe("dates", () => {
  it("greets by hour", () => {
    expect([greeting(8), greeting(12), greeting(18), greeting(19)]).toEqual(["Buen día", "Buenas tardes", "Buenas tardes", "Buenas noches"]);
  });

  it("today and this month use the local (Buenos Aires) calendar", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-03-01T02:30:00Z")); // still Feb 28 in Buenos Aires
    expect(isoToday()).toBe("2026-02-28");
    expect(currentMonth()).toBe("2026-02");
  });

  it("month helpers", () => {
    expect(isoMonth(new Date(2026, 0, 31))).toBe("2026-01");
    expect(monthStart("2026-02")).toBe("2026-02-01");
    expect(monthEnd("2026-02")).toBe("2026-02-28");
    expect(monthEnd("2028-02")).toBe("2028-02-29");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-11", 3)).toBe("2027-02");
  });

  it("short and long labels in Spanish, tolerant of bad input", () => {
    expect(fmtDateShort("2026-03-09")).toBe("9 mar 2026");
    expect(fmtDateShort("hoy")).toBe("hoy");
    expect(fmtMonthLong("2026-12")).toBe("Diciembre 2026");
    expect(fmtMonthLong("x")).toBe("x");
  });

  it("projects the billing month of a card purchase", () => {
    expect(projectBillingMonth("2026-03-20", 25)).toBe("2026-03");
    expect(projectBillingMonth("2026-03-25", 25)).toBe("2026-03");
    expect(projectBillingMonth("2026-03-26", 25)).toBe("2026-04");
    expect(projectBillingMonth("2026-12-28", 25)).toBe("2027-01");
  });
});

describe("labels", () => {
  it("translate kinds, frequencies and sources", () => {
    expect(PAYMENT_METHOD_KIND_LABELS.wallet).toBe("Billetera Virtual");
    expect(FREQUENCY_LABELS.yearly).toBe("Anual");
    expect(INCOME_SOURCES.map(incomeSourceLabel)).toEqual(["Salario", "Freelance", "Regalo", "Inversión", "Reembolso", "Otro"]);
    expect(incomeSourceLabel("bonus")).toBe("Bonus");
    expect(incomeSourceLabel("")).toBe("");
    expect(TICKET_OPEN_STATUSES).toEqual(["nuevo", "en_revision", "respondido"]);
  });
});
