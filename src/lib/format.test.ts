import { afterEach, describe, expect, it, vi } from "vitest";
import {
  currentMonth,
  fmtARS,
  fmtDateShort,
  fmtMoney,
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

describe("money", () => {
  it("formats pesos for es-AR", () => {
    expect(fmtARS(1234567)).toBe("$1.234.567");
    expect(fmtARS(1234.5, { decimals: 2 })).toBe("$1.234,50");
    expect(fmtARS(-500)).toBe("$-500");
  });

  it("compacts thousands only below a million", () => {
    expect(fmtARS(12500, { compact: true })).toBe("$12.5k");
    expect(fmtARS(250000, { compact: true })).toBe("$250k");
    expect(fmtARS(999, { compact: true })).toBe("$999");
    expect(fmtARS(2_500_000, { compact: true })).toBe("$2.500.000");
  });

  it("prefixes by currency", () => {
    expect(fmtMoney(1500, "USD")).toBe("US$1.500");
    expect(fmtMoney(1500, "EUR", { decimals: 2 })).toBe("€1.500,00");
    expect(fmtMoney(1500, "ARS", { compact: true })).toBe("$1.5k");
  });
});

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
