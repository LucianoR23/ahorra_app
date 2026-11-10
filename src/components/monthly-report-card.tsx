"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { CategoryBars } from "@/components/category-bars";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { reportCurrency } from "@/lib/fx";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyReport } from "@/lib/api/hooks";
import { currentMonth } from "@/lib/format";

/**
 * Reportes · Mensual (plan 1.10b, no design: the month navigator, then
 * cards). What was spent, billed and due, by category and fixed vs variable.
 */
export function MonthlyReportCard() {
  const [month, setMonth] = useState(currentMonth());
  const { data, isLoading } = useMonthlyReport(month);
  const cur = reportCurrency(data);
  // Go sends an empty slice as null (the SWR fetcher does not apply zod defaults).
  const byCategory = data?.byCategory ?? [];
  const fv = data?.fixedVariable;
  const fvTotal = fv ? fv.fixedTotal + fv.variableTotal : 0;

  return (
    <div className="flex flex-col gap-4">
      <MonthNavigator
        month={month}
        onMonthChange={setMonth}
        max={currentMonth()}
        className="border-0 bg-card shadow-card dark:ring-1 dark:ring-border"
        summary={
          isLoading ? (
            <Skeleton className="mx-auto mt-1 h-4 w-32" />
          ) : data ? (
            <>
              Gastaste <Money amount={data.spentThisMonth} currency={cur} className="font-semibold" />
            </>
          ) : null
        }
      />

      {isLoading ? (
        <>
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </>
      ) : !data ? (
        <EmptyState icon={BarChart3} title="Sin datos para este mes" description="Cuando cargues gastos, acá ves en qué se fue la plata." />
      ) : (
        <>
          <Card className="py-1">
            <CardContent>
              <dl className="divide-y divide-border">
                <Figure label="Gastado" hint="Por la fecha de cada gasto" amount={data.spentThisMonth} currency={cur} />
                <Figure label="Facturado" hint="Lo que cerraron tus tarjetas" amount={data.billedThisMonth} currency={cur} />
                <Figure label="A pagar" hint="Lo que vence este mes" amount={data.dueThisMonth} currency={cur} />
              </dl>
            </CardContent>
          </Card>

          {byCategory.length > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-heading font-semibold">Por categoría</h2>
                <CategoryBars rows={byCategory.map((c) => ({ name: c.categoryName, total: c.total, pct: c.pct }))} currency={cur} />
              </CardContent>
            </Card>
          )}

          {fv && fvTotal > 0 && (
            <Card>
              <CardContent className="flex flex-col gap-4">
                <h2 className="text-heading font-semibold">Fijo y variable</h2>
                <div
                  role="img"
                  aria-label={`Fijo ${Math.round(fv.fixedPct)}%, variable ${Math.round(fv.variablePct)}%`}
                  className="flex h-3 gap-0.5 overflow-hidden rounded-full"
                >
                  <span className="h-full bg-brand" style={{ width: `${(fv.fixedTotal / fvTotal) * 100}%` }} />
                  <span className="h-full flex-1 bg-ink-muted/40" />
                </div>
                <dl className="flex flex-col gap-2 text-body">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="flex items-start gap-2">
                      <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand" />
                      <span>
                        <span className="block">Fijo</span>
                        <span className="block text-caption text-ink-muted">{Math.round(fv.fixedPct)}% · gastos de Recurrentes</span>
                      </span>
                    </dt>
                    <dd className="font-semibold">
                      <Money amount={fv.fixedTotal} currency={cur} />
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="flex items-start gap-2">
                      <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-ink-muted/40" />
                      <span>
                        <span className="block">Variable</span>
                        <span className="block text-caption text-ink-muted">{Math.round(fv.variablePct)}% · cargados a mano</span>
                      </span>
                    </dt>
                    <dd className="font-semibold">
                      <Money amount={fv.variableTotal} currency={cur} />
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Figure({ label, hint, amount, currency }: { label: string; hint: string; amount: number; currency: string }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 py-3">
      <dt>
        <span className="block text-body text-ink">{label}</span>
        <span className="block text-caption text-ink-muted">{hint}</span>
      </dt>
      <dd className="text-body font-semibold text-ink">
        <Money amount={amount} currency={currency} />
      </dd>
    </div>
  );
}
