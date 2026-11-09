"use client";

import { Card, CardContent } from "@/components/ui/card";
import { InstallmentBar } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { useCommitted, useInstallmentPlans } from "@/lib/api/hooks";
import { endsIn } from "@/lib/committed";
import { CommittedBars, CommittedDollars } from "./committed-bars";

/**
 * Below the statements in Tarjetas (design `Tarjetas`, plan 4.2): what the
 * picked card already has in its next six statements, and its expenses in
 * installments still being billed.
 */
export function CardCommittedSection({ paymentMethodId }: { paymentMethodId: string }) {
  return (
    <>
      <CardCommittedChart paymentMethodId={paymentMethodId} />
      <InstallmentPlans paymentMethodId={paymentMethodId} />
    </>
  );
}

function CardCommittedChart({ paymentMethodId }: { paymentMethodId: string }) {
  const { data, isLoading } = useCommitted(6);
  if (isLoading || !data) return <Skeleton className="h-52 w-full rounded-2xl" />;
  const card = data.cards.find((c) => c.paymentMethodId === paymentMethodId);
  if (!card) return null;
  // The card's own six months, from its open period.
  const months = card.months.filter((m) => m.periodYm >= card.openPeriodYm);
  const empty = months.every((m) => m.totals.length === 0);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <h2 className="text-heading font-semibold">Comprometido en esta tarjeta</h2>
        {empty ? (
          <p className="text-caption text-ink-muted">No tiene cuotas en los próximos resúmenes.</p>
        ) : (
          <>
            <CommittedBars months={months} values />
            <CommittedDollars months={months} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

function InstallmentPlans({ paymentMethodId }: { paymentMethodId: string }) {
  const { data, isLoading } = useInstallmentPlans(paymentMethodId);
  if (isLoading || !data) return <Skeleton className="h-32 w-full rounded-2xl" />;
  if (data.plans.length === 0) return null;

  return (
    <section aria-labelledby="installment-plans" className="flex flex-col gap-3">
      <h2 id="installment-plans" className="text-heading font-semibold">
        Cuotas en curso
      </h2>
      <Card>
        <CardContent>
          <ul className="divide-y divide-border">
            {data.plans.map((p) => (
              <li key={p.expenseId} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-body font-semibold text-ink">{p.description}</span>
                  <span className="shrink-0 text-body">
                    <Money amount={p.nextInstallmentAmount} currency={p.currency} className="font-semibold" />
                    <span className="text-caption text-ink-muted"> / mes</span>
                  </span>
                </div>
                <span className="text-caption text-ink-muted">
                  <InstallmentBar current={p.nextInstallmentNumber} total={p.totalInstallments} /> · {endsIn(p.lastPeriodYm)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
