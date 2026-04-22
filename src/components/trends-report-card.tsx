"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendsReport } from "@/lib/api/hooks";
import { fmtMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const MONTH_OPTIONS = [3, 6, 12] as const;

function shortMonth(ym: string) {
  const [y, m] = ym.split("-");
  const names = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${names[Number(m) - 1]} ${y.slice(2)}`;
}

function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

const LINES = [
  { key: "spentTotal", label: "Gastado", color: "#ef4444" },
  { key: "income", label: "Ingreso", color: "#22c55e" },
  { key: "dueTotal", label: "A pagar", color: "#f97316" },
  { key: "net", label: "Neto", color: "#3b82f6" },
] as const;

export function TrendsReportCard() {
  const [months, setMonths] = useState<3 | 6 | 12>(6);
  const { data, isLoading } = useTrendsReport(months);
  const cur = (data?.baseCurrency as "ARS" | "USD" | "EUR") ?? "ARS";

  const chartData = data?.points.map((p) => ({
    month: shortMonth(p.month),
    spentTotal: p.spentTotal,
    income: p.income,
    dueTotal: p.dueTotal,
    net: p.net,
  })) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1.5">
        {MONTH_OPTIONS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
              months === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {m} meses
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : !chartData.length ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Sin datos de tendencias.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl border-0 shadow-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-xs font-bold">Evolución mensual</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={fmtK}
                    tick={{ fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(v, name) => {
                      const line = LINES.find((l) => l.key === name);
                      return [fmtMoney(Number(v ?? 0), cur), line?.label ?? String(name)];
                    }}
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                  />
                  <Legend
                    formatter={(value) => LINES.find((l) => l.key === value)?.label ?? value}
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 10 }}
                  />
                  {LINES.map((l) => (
                    <Line
                      key={l.key}
                      type="monotone"
                      dataKey={l.key}
                      stroke={l.color}
                      strokeWidth={2}
                      dot={{ r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            {data?.points.slice(-1).map((p) => (
              <>
                {LINES.map((l) => (
                  <Card key={l.key} className="rounded-2xl border-0 shadow-card">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block size-2 rounded-full" style={{ backgroundColor: l.color }} />
                        <p className="text-[10px] text-muted-foreground">{l.label} (último mes)</p>
                      </div>
                      <p className="mt-0.5 font-mono text-sm font-bold">
                        {fmtMoney(p[l.key], cur)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
