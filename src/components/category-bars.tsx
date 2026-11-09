import { Money } from "@/components/ui/money";
import { cn } from "@/lib/utils";

export type CategoryBar = { name: string; total: number; pct?: number };

/**
 * Where the money went, as bars (design `Main`, "En qué se fue"): the
 * biggest in `accent`, the rest in `ink-muted` (README §5, no category
 * colors). Bars are relative to the biggest; `pct` shows next to the amount.
 */
export function CategoryBars({ rows, currency, className }: { rows: CategoryBar[]; currency: string; className?: string }) {
  const max = Math.max(...rows.map((r) => r.total), 0);
  return (
    <ul className={cn("flex flex-col gap-4", className)}>
      {rows.map((r, i) => (
        <li key={`${r.name}-${i}`} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 text-body">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0">
              {r.pct !== undefined && <span className="mr-2 text-caption text-ink-muted">{Math.round(r.pct)}%</span>}
              <Money amount={r.total} currency={currency} />
            </span>
          </div>
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-border">
            <div
              data-testid="category-bar"
              className={cn(
                "h-full origin-left rounded-full motion-safe:animate-[grow-x_var(--duration-slow)_ease-out]",
                i === 0 ? "bg-brand" : "bg-ink-muted",
              )}
              style={{ width: `${max > 0 ? Math.max((r.total / max) * 100, 2) : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
