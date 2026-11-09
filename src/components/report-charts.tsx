"use client";

// recharts is about a third of the /reportes JavaScript. These charts load
// through next/dynamic (report-charts-lazy.tsx), so the report cards fetch
// and show their numbers without waiting for it (plan 0.14).
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDiscreet, useFormatAmount } from "@/stores/discreet";

type Currency = "ARS" | "USD" | "EUR";

// Discreet mode keeps the charts (they are proportions, design ModoDiscreto)
// but drops the axis numbers and masks the tooltips.
const noTick = () => "";

function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

export type TrendLine = { key: string; label: string; color: string; dashed?: boolean };

export function TrendsLineChart({
  data,
  lines,
  currency,
}: {
  data: Record<string, string | number>[];
  lines: readonly TrendLine[];
  currency: Currency;
}) {
  const hidden = useDiscreet();
  const formatAmount = useFormatAmount();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" />
        <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          tickFormatter={hidden ? noTick : fmtK}
          tick={{ fontSize: 12, fill: "var(--color-ink-muted)" }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip
          formatter={(v, name) => {
            const line = lines.find((l) => l.key === name);
            return [formatAmount(Number(v ?? 0), currency), line?.label ?? String(name)];
          }}
          contentStyle={{
            fontSize: 12,
            borderRadius: 12,
            background: "var(--color-popover)",
            border: "1px solid var(--color-border)",
            color: "var(--color-ink)",
          }}
        />
        {lines.map((l) => (
          <Line
            key={l.key}
            type="monotone"
            dataKey={l.key}
            stroke={l.color}
            strokeWidth={2}
            strokeDasharray={l.dashed ? "4 4" : undefined}
            dot={{ r: 3, strokeWidth: 0, fill: l.color }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
