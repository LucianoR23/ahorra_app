"use client";

import { useState } from "react";
import { ChartLine } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Money } from "@/components/ui/money";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendsLineChart } from "@/components/report-charts-lazy";
import { useRateHistory } from "@/lib/api/hooks";
import { historyPrice, periodChange, RATE_SOURCES, rateSourceLabel, sourceOf } from "@/lib/fx";
import { dayMonth } from "@/lib/statements";
import { useSpaces } from "@/lib/spaces";
import { cn } from "@/lib/utils";

const PERIODS = [
  { value: "30", label: "30 días" },
  { value: "180", label: "6 meses" },
  { value: "365", label: "1 año" },
] as const;

type Period = (typeof PERIODS)[number]["value"];

const SINCE: Record<Period, string> = { "30": "en 30 días", "180": "en 6 meses", "365": "en un año" };

const LINE = [{ key: "venta", label: "Venta", color: "var(--color-brand)" }] as const;

const pesos = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 0 });

/**
 * "Cotizaciones" (plan 5.2b): how a dollar moved, one point per day. Starts
 * at the space's dollar; the selling price, like conversions use.
 */
export function RateHistory() {
  const { current } = useSpaces();
  const [source, setSource] = useState<string>(sourceOf(current?.fxSource));
  const [period, setPeriod] = useState<Period>("30");
  const { data, isLoading } = useRateHistory(source, Number(period));

  const points = data?.points ?? [];
  const last = points[points.length - 1];
  const change = periodChange(points);
  const chart = points.map((p) => ({ month: dayMonth(p.day), venta: historyPrice(p) }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={source} onValueChange={(v) => v && setSource(v)}>
          <SelectTrigger aria-label="Dólar" className="w-auto min-w-36">
            <SelectValue>{(v: string | null) => (v ? `Dólar ${rateSourceLabel(v)}` : "Dólar")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {RATE_SOURCES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                Dólar {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Segmented aria-label="Período" value={period} onValueChange={setPeriod} options={PERIODS} className="w-auto" />
      </div>

      {isLoading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : !last ? (
        <EmptyState
          icon={ChartLine}
          title="Todavía no hay cotizaciones"
          description={`No tenemos datos del dólar ${rateSourceLabel(source)} en este período.`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-caption text-ink-muted">Dólar {rateSourceLabel(source)} · venta</p>
              <p className="text-display font-bold">
                <Money amount={historyPrice(last)} cents="always" />
              </p>
              {change !== null && (
                <p className={cn("text-body font-semibold", change > 0 ? "text-negative" : change < 0 ? "text-positive" : "text-ink-muted")}>
                  {change > 0 ? "+" : ""}
                  {change.toLocaleString("es-AR", { maximumFractionDigits: 1 })}% {SINCE[period]}
                </p>
              )}
            </div>
            <TrendsLineChart data={chart} lines={LINE} currency="ARS" yTick={pesos} fitY dots={points.length <= 31} />
            <p className="text-caption text-ink-muted">
              Un valor por día, el último de cada día. Actualizada el {dayMonth(last.day)}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
