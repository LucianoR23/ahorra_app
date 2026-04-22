import type { PaymentMethodKind } from "@/lib/api/schemas";

export const PAYMENT_METHOD_KIND_LABELS: Record<PaymentMethodKind, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
  other: "Otro",
};

export type RecurringFrequency = "weekly" | "monthly" | "yearly";

export const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  weekly: "Semanal",
  monthly: "Mensual",
  yearly: "Anual",
};

export const INCOME_SOURCE_LABELS: Record<string, string> = {
  salario: "Salario",
  freelance: "Freelance",
  venta: "Venta",
  regalo: "Regalo",
  interes: "Interés",
  otro: "Otro",
};

export function incomeSourceLabel(source: string): string {
  return INCOME_SOURCE_LABELS[source] ?? (source ? source.charAt(0).toUpperCase() + source.slice(1) : source);
}
