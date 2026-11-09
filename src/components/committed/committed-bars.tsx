"use client";

import { Money } from "@/components/ui/money";
import type { PeriodTotals } from "@/lib/api/schemas";
import { amountIn, monthName, monthShort } from "@/lib/committed";
import { useDiscreet } from "@/stores/discreet";
import { cn } from "@/lib/utils";

/**
 * "Comprometido" bars (designs `Main` and `Tarjetas`): one bar per closing
 * month, in pesos, the first one highlighted. With `values`, each bar shows
 * its compact amount on top, hidden in discreet mode (plan 1.9: the bars
 * stay, they are proportions). Screen readers get the list of amounts.
 */
export function CommittedBars({
  months,
  values = false,
  className,
}: {
  months: PeriodTotals[];
  values?: boolean;
  className?: string;
}) {
  const hidden = useDiscreet();
  const amounts = months.map((m) => amountIn(m.totals, "ARS"));
  const max = Math.max(...amounts, 0);

  return (
    <div className={className}>
      <ul className="sr-only">
        {months.map((m, i) => (
          <li key={m.periodYm}>
            {monthName(m.periodYm)}: <Money amount={amounts[i]} />
          </li>
        ))}
      </ul>
      <div aria-hidden className="flex h-28 items-end gap-2">
        {months.map((m, i) => {
          const pct = max > 0 ? Math.max((amounts[i] / max) * 100, amounts[i] > 0 ? 6 : 3) : 3;
          return (
            <div key={m.periodYm} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              {values && (
                <span className="h-5 truncate text-center text-caption text-ink-muted">
                  {!hidden && amounts[i] > 0 ? <Money amount={amounts[i]} compact /> : null}
                </span>
              )}
              <div className={cn("flex items-end", values ? "h-[calc(100%-1.5rem)]" : "h-full")}>
                <span
                  data-testid="committed-bar"
                  className={cn("w-full rounded-md", i === 0 ? "bg-brand" : "bg-ink-muted")}
                  style={{ height: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div aria-hidden className="mt-2 flex gap-2">
        {months.map((m, i) => (
          <span
            key={m.periodYm}
            className={cn("flex-1 text-center text-caption", i === 0 ? "font-semibold text-ink" : "text-ink-muted")}
          >
            {monthShort(m.periodYm)}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Dollars do not fit the pesos bars: "Más US$ 120 en dólares (dic, ene)."
 * Nothing when no month has dollars.
 */
export function CommittedDollars({ months }: { months: PeriodTotals[] }) {
  const withUsd = months.filter((m) => amountIn(m.totals, "USD") > 0);
  if (withUsd.length === 0) return null;
  const total = withUsd.reduce((sum, m) => sum + amountIn(m.totals, "USD"), 0);
  return (
    <p className="text-caption text-ink-muted">
      Más <Money amount={total} currency="USD" /> en dólares ({withUsd.map((m) => monthShort(m.periodYm).toLowerCase()).join(", ")}).
    </p>
  );
}
