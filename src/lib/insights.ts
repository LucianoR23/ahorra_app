// Notifications (insights): the labels and links the inbox and the detail share.

const TYPE_LABELS: Record<string, string> = {
  daily_summary: "Resumen diario",
  weekly_review: "Resumen semanal",
  card_closing_soon: "Cierre de tarjeta",
  card_due_soon: "Vencimiento de tarjeta",
  credit_period_reminder: "Cierre de tarjeta",
  alert: "Alerta",
  alert_goal_warning: "Alerta de objetivo",
  alert_goal_exceeded: "Objetivo excedido",
  tip: "Consejo",
  shared_expense: "Gasto compartido",
  invite: "Invitación a hogar",
  settlement: "Pago registrado",
  recurring_spike: "Aumento de un gasto fijo",
};

export function insightTypeLabel(type: string): string {
  return TYPE_LABELS[type] ?? "Aviso";
}

/** Where a notification leads, with the button's label, if anywhere. */
export function insightLink(insight: {
  insightType: string;
  metadata?: Record<string, unknown> | null;
}): { href: string; label: string } | undefined {
  const pm = insight.metadata?.payment_method_id;
  const expenseId = insight.metadata?.expenseId;
  const ym = insight.metadata?.period_ym;
  switch (insight.insightType) {
    case "card_due_soon":
      return typeof pm === "string" && typeof ym === "string"
        ? { href: `/tarjetas/${pm}/resumen/${ym}`, label: "Ver resumen" }
        : { href: "/tarjetas", label: "Ver tarjetas" };
    case "card_closing_soon":
    case "credit_period_reminder":
      return { href: "/tarjetas", label: "Ver tarjetas" };
    case "alert":
    case "alert_goal_warning":
    case "alert_goal_exceeded":
      return { href: "/objetivos", label: "Ver objetivos" };
    case "recurring_spike":
      return { href: "/recurrentes", label: "Ver recurrentes" };
    case "shared_expense":
      return typeof expenseId === "string"
        ? { href: `/movimientos/${expenseId}`, label: "Ver gasto" }
        : { href: "/deudas", label: "Ver cuentas" };
    case "settlement":
      return { href: "/deudas", label: "Ver cuentas" };
    default:
      return undefined;
  }
}

/** "hace 5 min", "hace 3 h", "Ayer", "12/3" */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "numeric", timeZone: "America/Argentina/Buenos_Aires" });
}
