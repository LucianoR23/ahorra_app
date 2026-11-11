"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";
import { TrendsLineChart } from "@/components/report-charts-lazy";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { reportCurrency } from "@/lib/fx";
import { Segmented } from "@/components/ui/segmented";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendsReport } from "@/lib/api/hooks";
import { fmtMonthLong } from "@/lib/format";
import { useViewCurrency } from "@/stores/view-currency";

const RANGES = [
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
] as const;

const AMOUNTS = [
  { value: "nominal", label: "Sin ajustar" },
  { value: "real", label: "Pesos de hoy" },
] as const;

function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

// Theme colors (README §5): what you spent is the highlighted series.
const LINES = [
  { key: "spentTotal", label: "Gastado", color: "var(--color-brand)" },
  { key: "income", label: "Ingresos", color: "var(--color-positive)" },
  { key: "dueTotal", label: "A pagar", color: "var(--color-ink-muted)", dashed: true },
  { key: "net", label: "Neto", color: "var(--color-ink)" },
] as const;

function monthName(ym: string) {
  return fmtMonthLong(ym).split(" ")[0];
}

/**
 * Months after the last published index go as they are. INDEC publishes a
 * month around the 12th of the next, so normally one or two are pending and
 * get named; more means our copy is behind, not INDEC.
 */
function PendingMonths({ months }: { months: string[] }) {
  if (months.length === 0) return null;
  if (months.length > 2) {
    return <span className="block">Desde {monthName(months[0]).toLowerCase()} van sin ajustar hasta que tengamos el dato del INDEC.</span>;
  }
  const names = months.map((m, i) => (i === 0 ? monthName(m) : monthName(m).toLowerCase())).join(" y ");
  return (
    <span className="block">
      {names} {months.length === 1 ? "va" : "van"} sin ajustar: el INDEC todavía no publicó su inflación.
    </span>
  );
}

/** Reportes · Tendencias (plan 1.10b): the last 3, 6 or 12 months. */
export function TrendsReportCard() {
  const [months, setMonths] = useState<"3" | "6" | "12">("6");
  const [real, setReal] = useState(false);
  const { foreign } = useViewCurrency();
  const { data, error, isLoading } = useTrendsReport(Number(months) as 3 | 6 | 12, real);
  // Today's pesos (plan 5.4) only make sense in pesos, in a space kept in pesos.
  const canAdjust = !foreign && (data ? data.baseCurrency === "ARS" : real);
  const cur = reportCurrency(data);
  const points = data?.points ?? [];
  const chartData = points.map((p) => ({
    month: shortMonth(p.month),
    spentTotal: p.spentTotal,
    income: p.income,
    dueTotal: p.dueTotal,
    net: p.net,
  }));
  const last = points.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <Segmented aria-label="Período" value={months} onValueChange={setMonths} options={RANGES} />
      {canAdjust && (
        <Segmented
          aria-label="Montos"
          value={real ? "real" : "nominal"}
          onValueChange={(v) => setReal(v === "real")}
          options={AMOUNTS}
        />
      )}

      {real && error && !foreign ? (
        <Alert variant="error">
          Todavía no tenemos el índice de inflación del INDEC.{" "}
          <Button variant="link" onClick={() => setReal(false)}>
            Ver sin ajustar
          </Button>
        </Alert>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : chartData.length === 0 ? (
        <EmptyState icon={LineChart} title="Sin datos todavía" description="Con un par de meses cargados, acá ves cómo vienen tus gastos e ingresos." />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <h2 className="text-heading font-semibold">Mes a mes</h2>
              <TrendsLineChart data={chartData} lines={LINES} currency={cur as "ARS" | "USD" | "EUR"} />
              {data?.adjust === "cpi" && data.cpiThrough && (
                <p className="text-caption text-ink-muted">
                  En pesos de hoy, con la inflación del INDEC hasta {fmtMonthLong(data.cpiThrough).toLowerCase()}.
                  <PendingMonths months={points.map((p) => p.month).filter((m) => m > data.cpiThrough!)} />
                </p>
              )}
            </CardContent>
          </Card>

          {last && (
            <Card className="py-1">
              <CardContent>
                <h2 className="pt-3 text-caption font-semibold text-ink-muted">{fmtMonthLong(last.month)}</h2>
                <dl className="divide-y divide-border">
                  {LINES.map((l) => (
                    <div key={l.key} className="flex min-h-12 items-center justify-between gap-4 py-2 text-body">
                      <dt className="flex items-center gap-2">
                        <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.label}
                      </dt>
                      <dd className="font-semibold">
                        <Money amount={last[l.key]} currency={cur} income={l.key === "income"} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="pb-3 text-caption text-ink-muted">Neto: ingresos menos lo que tenés a pagar.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
