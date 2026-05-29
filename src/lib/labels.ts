import type { PaymentMethodKind, TicketStatus, TicketType } from "@/lib/api/schemas";

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: "Error",
  improvement: "Mejora",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  nuevo: "Nuevo",
  en_revision: "En revisión",
  respondido: "Respondido",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  descartado: "Descartado",
};

/** Estados que el usuario considera "abiertos" (en juego). */
export const TICKET_OPEN_STATUSES: TicketStatus[] = ["nuevo", "en_revision", "respondido"];

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
