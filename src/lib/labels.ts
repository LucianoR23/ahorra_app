import type { PaymentMethodKind } from "@/lib/api/schemas";

export const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  wallet: "Billetera Virtual",
  transfer: "Transferencia",
};

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  salary: "Salario",
  freelance: "Freelance",
  gift: "Regalo",
  investment: "Inversión",
  refund: "Reembolso",
  other: "Otro",
};

export const INCOME_SOURCES = ["salary", "freelance", "gift", "investment", "refund", "other"] as const;

export function incomeSourceLabel(source: string): string {
  return INCOME_SOURCE_LABELS[source] ?? (source ? source.charAt(0).toUpperCase() + source.slice(1) : source);
}

export const WEEKDAY_LABELS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAY_LABELS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
export const MONTH_LABELS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const MONTH_LABELS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
