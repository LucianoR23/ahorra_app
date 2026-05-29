import { cn } from "@/lib/utils";
import { TICKET_STATUS_LABELS } from "@/lib/labels";
import type { TicketStatus } from "@/lib/api/schemas";

// Clases por estado usando los tokens semánticos (resuelven dark/light solos).
const STATUS_CLASSES: Record<TicketStatus, string> = {
  nuevo: "bg-secondary text-foreground",
  en_revision: "bg-warn/10 text-warn",
  respondido: "bg-ai/10 text-ai",
  resuelto: "bg-positive/10 text-positive",
  cerrado: "bg-muted text-muted-foreground",
  descartado: "bg-muted text-muted-foreground",
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
        "inline-flex h-5 w-fit shrink-0 items-center rounded-full px-2 text-[0.625rem] font-medium whitespace-nowrap",
        STATUS_CLASSES[status],
        className,
      )}
    >
      {TICKET_STATUS_LABELS[status]}
    </span>
  );
}
