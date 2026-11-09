import { cn } from "@/lib/utils";
import { TICKET_STATUS_LABELS } from "@/lib/labels";
import type { TicketStatus } from "@/lib/api/schemas";

// One class per status, theme tokens only.
const STATUS_CLASSES: Record<TicketStatus, string> = {
  nuevo: "bg-surface-2 text-ink",
  en_revision: "bg-warn/12 text-warn",
  respondido: "bg-brand-soft text-brand-ink",
  resuelto: "bg-positive/12 text-positive",
  cerrado: "bg-surface-2 text-ink-muted",
  descartado: "bg-surface-2 text-ink-muted",
};

export function SupportStatusBadge({
  status,
  className,
}: {
  status: TicketStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 w-fit shrink-0 items-center rounded-full px-2 text-xs font-semibold whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
