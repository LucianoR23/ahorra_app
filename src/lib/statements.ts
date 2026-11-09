import { mutate } from "swr";
import type { AdjustmentKind, CardStatement, CardStatementList, StatementStatus } from "@/lib/api/schemas";
import { shiftMonth } from "@/lib/format";

// Credit card statements (plan 4.1): what the screens say about them.

export const STATUS_LABELS: Record<StatementStatus, string> = {
  open: "En curso",
  closed: "A pagar",
  overdue: "Vencido",
  paid: "Pagado",
};

export const ADJUSTMENT_LABELS: Record<AdjustmentKind, string> = {
  interest: "Intereses",
  tax: "Impuestos",
  fee: "Comisión",
  credit: "Bonificación",
  other: "Otro",
};

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

function parts(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "24/11" */
export function dayMonth(iso: string): string {
  const { m, d } = parts(iso);
  return `${d}/${m}`;
}

/** "miércoles 3/12" */
export function weekdayDayMonth(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d}/${m}`;
}

/** The line under a statement's total, e.g. "Cerró el 24/11 · vence el miércoles 3/12". */
export function statementDates(s: Pick<CardStatement, "status" | "closingDate" | "dueDate">): string {
  if (s.status === "open") return `Cierra el ${dayMonth(s.closingDate)} · vence el ${dayMonth(s.dueDate)}`;
  const closed = `Cerró el ${dayMonth(s.closingDate)}`;
  if (s.status === "overdue") return `${closed} · venció el ${weekdayDayMonth(s.dueDate)}`;
  return `${closed} · vence el ${weekdayDayMonth(s.dueDate)}`;
}

/** The statement to pay (the one before the open period) and the open one. */
export function currentStatements(list: CardStatementList | undefined): {
  toPay: CardStatement | undefined;
  next: CardStatement | undefined;
} {
  if (!list) return { toPay: undefined, next: undefined };
  const prev = shiftMonth(list.openPeriodYm, -1);
  return {
    toPay: list.statements.find((s) => s.periodYm === prev),
    next: list.statements.find((s) => s.periodYm === list.openPeriodYm),
  };
}

/** The total in one currency, 0 when nothing was billed in it. */
export function totalIn(s: Pick<CardStatement, "totals">, currency: string): number {
  return s.totals.find((t) => t.currency === currency)?.amount ?? 0;
}

/** Refetches every statement of a card (list and details) after a change. */
export function invalidateStatements(paymentMethodId: string) {
  const prefix = `/payment-methods/${paymentMethodId}/credit-card/statements`;
  return mutate((key) => Array.isArray(key) && typeof key[0] === "string" && key[0].startsWith(prefix));
}
