"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListRow } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardStatement, useHouseholds, usePaymentMethods } from "@/lib/api/hooks";
import type { CardStatementDetail, StatementAdjustment } from "@/lib/api/schemas";
import { deleteStatementAdjustment, unpayCardStatement } from "@/lib/api/mutations";
import { confirm } from "@/lib/confirm";
import { fmtDateShort } from "@/lib/format";
import { ADJUSTMENT_LABELS, invalidateStatements, statementDates } from "@/lib/statements";
import { toast, toastError } from "@/lib/toast";
import { AdjustmentDialog } from "./adjustment-dialog";
import { PaidNote } from "./card-statements-summary";
import { MinimumPaymentDialog } from "./minimum-payment-dialog";
import { PayStatementDialog } from "./pay-statement-dialog";
import { StatementStatusBadge, StatementTotal } from "./statement-total";

/** One statement (plan 4.1): total, payment, installments and adjustments. */
export function CardStatementDetailView({ paymentMethodId, ym }: { paymentMethodId: string; ym: string }) {
  const router = useRouter();
  const { data: methods } = usePaymentMethods();
  const { data: st, isLoading } = useCardStatement(paymentMethodId, ym);
  const name = methods?.find((m) => m.id === paymentMethodId)?.name ?? "la tarjeta";

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title={`Resumen de ${name}`} back={{ href: "/tarjetas", label: "Tarjetas" }} />
      <MonthNavigator
        month={ym}
        onMonthChange={(m) => router.replace(`/tarjetas/${paymentMethodId}/resumen/${m}`)}
        summary={st ? statementDates(st) : undefined}
      />
      {isLoading || !st ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          <Summary paymentMethodId={paymentMethodId} statement={st} />
          <Installments statement={st} />
          <Adjustments paymentMethodId={paymentMethodId} statement={st} />
        </>
      )}
    </div>
  );
}

function Summary({ paymentMethodId, statement: st }: { paymentMethodId: string; statement: CardStatementDetail }) {
  const [dialog, setDialog] = useState<"pay" | "minimum" | null>(null);

  async function unpay() {
    const ok = await confirm({
      title: "¿Desmarcar el pago?",
      description: "Las cuotas de este resumen vuelven a quedar sin pagar.",
      confirmLabel: "Desmarcar",
    });
    if (!ok) return;
    try {
      await unpayCardStatement(paymentMethodId, st.periodYm);
      await invalidateStatements(paymentMethodId);
      toast.success("Pago desmarcado");
    } catch (err) {
      toastError(err, "No se pudo desmarcar el pago");
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label uppercase text-ink-muted">{st.status === "open" ? "Lo que va hasta hoy" : "Total"}</p>
          <StatementStatusBadge statement={st} />
        </div>
        <p className="text-amount">
          <StatementTotal statement={st} />
        </p>
        <PaidNote statement={st} />
        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-caption text-ink-muted">
            Pago mínimo{" "}
            {st.minimumPayment !== null ? <Money amount={st.minimumPayment} className="font-semibold text-ink" /> : "sin cargar"}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setDialog("minimum")}>
            {st.minimumPayment !== null ? "Editar" : "Cargar"}
          </Button>
        </div>
        {st.status !== "open" && (
          <div className="flex flex-wrap gap-2">
            {st.status === "paid" ? (
              <Button variant="outline" onClick={unpay}>
                Desmarcar pago
              </Button>
            ) : (
              <Button onClick={() => setDialog("pay")}>Marcar como pagado</Button>
            )}
          </div>
        )}
      </CardContent>
      {dialog === "pay" && (
        <PayStatementDialog paymentMethodId={paymentMethodId} statement={st} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
      {dialog === "minimum" && (
        <MinimumPaymentDialog paymentMethodId={paymentMethodId} statement={st} open onOpenChange={(o) => !o && setDialog(null)} />
      )}
    </Card>
  );
}

function Installments({ statement: st }: { statement: CardStatementDetail }) {
  const { data: spaces } = useHouseholds();
  const spaceName = (id: string) => {
    const space = spaces?.find((h) => h.id === id);
    if (!space) return null;
    return space.kind === "personal" ? "Mi plata" : space.name;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cuotas</CardTitle>
      </CardHeader>
      <CardContent>
        {st.installments.length === 0 ? (
          <p className="text-caption text-ink-muted">No hay cuotas en este resumen.</p>
        ) : (
          <ul>
            {st.installments.map((i) => (
              <li key={i.installmentId}>
                <ListRow
                  title={i.description}
                  subtitle={[
                    i.totalInstallments > 1 ? `Cuota ${i.installmentNumber} de ${i.totalInstallments}` : null,
                    spaceName(i.householdId),
                    fmtDateShort(i.spentAt),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  trailing={<Money amount={i.amount} currency={i.currency} />}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Adjustments({ paymentMethodId, statement: st }: { paymentMethodId: string; statement: CardStatementDetail }) {
  const [editing, setEditing] = useState<StatementAdjustment | "new" | null>(null);

  async function remove(a: StatementAdjustment) {
    const ok = await confirm({ title: `¿Borrar "${a.description}"?`, confirmLabel: "Borrar", destructive: true });
    if (!ok) return;
    try {
      await deleteStatementAdjustment(paymentMethodId, st.periodYm, a.id);
      await invalidateStatements(paymentMethodId);
    } catch (err) {
      toastError(err, "No se pudo borrar");
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Intereses, impuestos y otros</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => setEditing("new")}>
          <Plus aria-hidden data-icon="inline-start" /> Agregar
        </Button>
      </CardHeader>
      <CardContent>
        {st.adjustments.length === 0 ? (
          <p className="text-caption text-ink-muted">
            Sumá lo que figura en el resumen y no cargaste como gasto: intereses, impuestos, comisiones o bonificaciones.
          </p>
        ) : (
          <ul>
            {st.adjustments.map((a) => (
              <li key={a.id}>
                <ListRow
                  title={a.description}
                  subtitle={ADJUSTMENT_LABELS[a.kind]}
                  trailing={
                    <span className="flex items-center gap-1">
                      <Money amount={a.kind === "credit" ? -a.amount : a.amount} currency={a.currency} />
                      <Button variant="ghost" size="icon-sm" aria-label={`Editar ${a.description}`} onClick={() => setEditing(a)}>
                        <Pencil aria-hidden />
                      </Button>
                      <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${a.description}`} onClick={() => remove(a)}>
                        <Trash2 aria-hidden />
                      </Button>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editing !== null && (
        <AdjustmentDialog
          paymentMethodId={paymentMethodId}
          periodYm={st.periodYm}
          adjustment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </Card>
  );
}
