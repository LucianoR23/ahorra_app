"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBarChart, DonutChart } from "@/components/report-charts-lazy";
import { Skeleton } from "@/components/ui/skeleton";
import { useMonthlyReport } from "@/lib/api/hooks";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#8b5cf6",
  "#06b6d4", "#ef4444", "#eab308", "#ec4899",
  "#14b8a6", "#64748b",
];

function isoMonthCurrent() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[Number(m) - 1]} ${y}`;
}

function prevMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonth(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function MonthlyReportCard() {
  const [month, setMonth] = useState(isoMonthCurrent());
  const { data, isLoading } = useMonthlyReport(month);
  const cur = (data?.baseCurrency as "ARS" | "USD" | "EUR") ?? "ARS";

  const catData = data?.byCategory.map((c, i) => ({
    name: c.categoryName,
    total: c.total,
    pct: c.pct,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  })) ?? [];

  const fvData = data
    ? [
        { name: "Fijo", value: data.fixedVariable.fixedTotal, pct: data.fixedVariable.fixedPct, fill: "#3b82f6" },
        { name: "Variable", value: data.fixedVariable.variableTotal, pct: data.fixedVariable.variablePct, fill: "#f97316" },
      ]
    : [];

  const isCurrentOrFuture = month >= isoMonthCurrent();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(prevMonth(month))}
          className="cursor-pointer rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
        >
          ‹ Anterior
        </button>
        <span className="text-sm font-bold">{monthLabel(month)}</span>
        <button
          type="button"
          onClick={() => setMonth(nextMonth(month))}
          disabled={isCurrentOrFuture}
          className={cn(
            "rounded-md px-2 py-1 text-xs",
            isCurrentOrFuture
              ? "cursor-not-allowed text-muted-foreground/40"
              : "cursor-pointer text-muted-foreground hover:bg-muted",
          )}
        >
          Siguiente ›
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      ) : !data ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sin datos para este mes.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Gastado", value: data.spentThisMonth },
              { label: "Facturado", value: data.billedThisMonth },
              { label: "A pagar", value: data.dueThisMonth },
            ].map((s) => (
              <Card key={s.label} className="rounded-2xl border-0 shadow-card">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="mt-0.5 font-mono text-sm font-bold">{fmtMoney(s.value, cur)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {catData.length > 0 && (
            <Card className="rounded-2xl border-0 shadow-card">
              <CardContent className="p-4">
                <h3 className="mb-3 text-xs font-bold">Por categoría</h3>
                <CategoryBarChart data={catData} currency={cur} />
                <div className="mt-2 flex flex-col gap-1">
                  {catData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: c.color }} />
                        <span className="text-muted-foreground">{c.name}</span>
                      </div>
                      <span className="font-semibold">{c.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {fvData.length > 0 && (
            <Card className="rounded-2xl border-0 shadow-card">
              <CardContent className="p-4">
                <h3 className="mb-3 text-xs font-bold">Fijo vs Variable</h3>
                {fvData.every((d) => d.value === 0) ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">
                    Sin datos para este mes.
                  </p>
                ) : (
                  <div className="flex items-center gap-4">
                    <DonutChart data={fvData} />
                    <div className="flex flex-col gap-2">
                      {fvData.map((d) => (
                        <div key={d.name}>
                          <div className="flex items-center gap-1.5">
                            <span className="inline-block size-2.5 rounded-sm" style={{ backgroundColor: d.fill }} />
                            <span className="text-xs font-semibold">{d.name}</span>
                          </div>
                          <p className="ml-4 font-mono text-xs">{fmtMoney(d.value, cur)}</p>
                          <p className="ml-4 text-xs text-muted-foreground">{d.pct.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
