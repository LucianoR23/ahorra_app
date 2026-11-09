import { Badge } from "@/components/ui/badge";
import { Money } from "@/components/ui/money";
import type { CardStatement } from "@/lib/api/schemas";
import { STATUS_LABELS } from "@/lib/statements";
import { cn } from "@/lib/utils";

/** A statement's total: one amount per currency, "$ 0" when nothing was billed. */
export function StatementTotal({ statement, className }: { statement: Pick<CardStatement, "totals">; className?: string }) {
  if (statement.totals.length === 0) return <Money amount={0} className={className} />;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      {statement.totals.map((t, i) => (
        <span key={t.currency} className="inline-flex items-baseline gap-2">
          {i > 0 && <span className="text-ink-muted">+</span>}
          <Money amount={t.amount} currency={t.currency} />
        </span>
      ))}
    </span>
  );
}

const STATUS_VARIANT = { open: "secondary", closed: "outline", overdue: "destructive", paid: "positive" } as const;

export function StatementStatusBadge({ statement }: { statement: Pick<CardStatement, "status"> }) {
  return <Badge variant={STATUS_VARIANT[statement.status]}>{STATUS_LABELS[statement.status]}</Badge>;
}
