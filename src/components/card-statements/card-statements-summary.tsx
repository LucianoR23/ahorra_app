"use client";

import { useState } from "react";
import Link from "next/link";
import { CreditCard as CardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCardStatements, useCreditCard, usePaymentMethods } from "@/lib/api/hooks";
import type { CardStatement, PaymentMethod } from "@/lib/api/schemas";
import { currentStatements, dayMonth, statementDates } from "@/lib/statements";
import { PayStatementDialog } from "./pay-statement-dialog";
import { StatementStatusBadge, StatementTotal } from "./statement-total";

/**
 * Top of Tarjetas (design `Tarjetas`, plan 4.1): pick a credit card, see the
 * statement to pay and what the next one has so far.
 */
export function CardStatementsSummary() {
  const { data: methods, isLoading } = usePaymentMethods();
  const cards = (methods ?? []).filter((m) => m.kind === "credit" && m.isActive);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = cards.find((c) => c.id === picked) ?? cards[0];

  if (isLoading) return <Skeleton className="h-56 w-full rounded-2xl" />;
  if (!selected) {
    return (
      <EmptyState
        icon={CardIcon}
        title="Todavía no cargaste tarjetas de crédito"
        description="Agregá una abajo, con su día de cierre y de vencimiento, y acá vas a ver cada resumen."
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {cards.length > 1 && (
        <Tabs value={selected.id} onValueChange={(v) => setPicked(String(v))}>
          <TabsList aria-label="Tarjeta" className="h-auto w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
            {cards.map((c) => (
              <CardTab key={c.id} method={c} />
            ))}
          </TabsList>
        </Tabs>
      )}
      <Statements method={selected} />
    </div>
  );
}

function CardTab({ method }: { method: PaymentMethod }) {
  const { data: card } = useCreditCard(method.id);
  return (
    <TabsTrigger
      value={method.id}
      className="h-auto min-w-40 flex-none flex-col items-start gap-0.5 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left data-active:border-ink data-active:shadow-none"
    >
      <span className="text-body font-semibold text-ink">{method.name}</span>
      <span className="text-caption font-normal text-ink-muted">
        {card?.lastFour ? `···· ${card.lastFour} · ` : ""}
        {card ? `Cierra el ${card.defaultClosingDay} · vence el ${card.defaultDueDay}` : " "}
      </span>
    </TabsTrigger>
  );
}

function Statements({ method }: { method: PaymentMethod }) {
  const { data, isLoading } = useCardStatements(method.id);
  const { toPay, next } = currentStatements(data);
  const [paying, setPaying] = useState(false);

  if (isLoading || !data) return <Skeleton className="h-48 w-full rounded-2xl" />;

  return (
    <section aria-labelledby="statement-to-pay" className="flex flex-col gap-3">
      {toPay && (
        <Card>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2 id="statement-to-pay" className="text-label uppercase text-ink-muted">
                {toPay.status === "paid" ? "Último resumen" : "Resumen a pagar"}
              </h2>
              <StatementStatusBadge statement={toPay} />
            </div>
            <p className="text-amount">
              <StatementTotal statement={toPay} />
            </p>
            <p className="text-caption text-ink-muted">{statementDates(toPay)}</p>
            <PaidNote statement={toPay} />
            <div className="flex flex-wrap gap-2">
              {toPay.status !== "paid" && <Button onClick={() => setPaying(true)}>Marcar como pagado</Button>}
              <Button variant="outline" nativeButton={false} render={<Link href={`/tarjetas/${method.id}/resumen/${toPay.periodYm}`} />}>
                Ver detalle
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {next && (
        <Link
          href={`/tarjetas/${method.id}/resumen/${next.periodYm}`}
          className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 outline-none hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-focus"
        >
          <span className="flex min-w-0 flex-col">
            <span className="text-body font-semibold text-ink">Próximo resumen</span>
            <span className="text-caption text-ink-muted">Cierra el {dayMonth(next.closingDate)} · lo que va hasta hoy</span>
          </span>
          <StatementTotal statement={next} className="text-heading font-semibold" />
        </Link>
      )}
      {paying && toPay && (
        <PayStatementDialog
          key={toPay.periodYm}
          paymentMethodId={method.id}
          statement={toPay}
          open={paying}
          onOpenChange={setPaying}
        />
      )}
    </section>
  );
}

/** "Pagaste $ 400 el 1/12" for a recorded payment. */
export function PaidNote({ statement }: { statement: CardStatement }) {
  if (statement.status !== "paid" || !statement.paidAt || statement.paidAmount === null) return null;
  const at = new Date(statement.paidAt).toLocaleDateString("es-AR", { day: "numeric", month: "numeric" });
  return (
    <p className="text-caption text-ink-muted">
      Pagaste <Money amount={statement.paidAmount} currency={statement.paidCurrency ?? "ARS"} /> el {at}
    </p>
  );
}
