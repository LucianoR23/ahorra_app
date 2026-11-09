"use client";

import Link from "next/link";
import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { StatementTotal } from "@/components/card-statements/statement-total";
import { useCommitted } from "@/lib/api/hooks";
import type { CardCommitted } from "@/lib/api/schemas";
import { amountIn, monthName } from "@/lib/committed";
import { dayMonth } from "@/lib/statements";
import { CommittedBars, CommittedDollars } from "./committed-bars";

/**
 * "Comprometido" on Inicio (design `Main`, plan 4.2): what the next six
 * statements of every card already have. Nothing without credit cards.
 */
export function CommittedWidget() {
  const { data, isLoading } = useCommitted(6);
  if (isLoading) return <Skeleton className="h-52 w-full rounded-xl" />;
  if (!data || data.cards.length === 0) return null;
  const first = data.months[0];
  const firstAmount = first ? amountIn(first.totals, "ARS") : 0;
  const empty = data.months.every((m) => m.totals.length === 0);
  const month = first ? monthName(first.periodYm) : "";
  const Month = month.charAt(0).toUpperCase() + month.slice(1);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-heading font-semibold">Comprometido</h2>
          <Link href="/tarjetas" className="text-body font-semibold text-brand-ink hover:underline">
            Ver tarjetas
          </Link>
        </div>
        {empty ? (
          <p className="text-body text-ink-muted">No tenés cuotas en los próximos resúmenes.</p>
        ) : (
          <>
            <p className="text-body">
              {firstAmount > 0 ? (
                <>
                  {Month} ya tiene{" "}
                  <Money amount={firstAmount} className="font-semibold" /> en cuotas.
                </>
              ) : (
                <>Lo que ya tienen tus próximos resúmenes.</>
              )}
            </p>
            <CommittedBars months={data.months} />
            <CommittedDollars months={data.months} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * "Tarjetas que vencen" on Inicio (design `Main`): each card's closed
 * statement still to pay. Nothing when every statement is paid.
 */
export function CardsDue() {
  const { data } = useCommitted(6);
  const due = (data?.cards ?? []).filter((c): c is CardCommitted & { toPay: NonNullable<CardCommitted["toPay"]> } => c.toPay !== null);
  if (due.length === 0) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <h2 className="text-heading font-semibold">Tarjetas que vencen</h2>
        <ul className="divide-y divide-border">
          {due.map((c) => (
            <li key={c.paymentMethodId}>
              <Link
                href={`/tarjetas/${c.paymentMethodId}/resumen/${c.toPay.periodYm}`}
                className="flex min-h-16 items-center gap-3 rounded-sm py-3 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                  <CreditCard className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">
                    {c.name}
                    {c.lastFour ? ` ···· ${c.lastFour}` : ""}
                  </span>
                  <span className="mt-0.5 block truncate text-caption text-ink-muted">
                    {c.toPay.status === "overdue" ? "Venció" : "Vence"} el {dayMonth(c.toPay.dueDate)} · cerró el{" "}
                    {Number(c.toPay.closingDate.slice(8, 10))}
                  </span>
                </span>
                <StatementTotal statement={c.toPay} className="shrink-0 text-body font-semibold" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
