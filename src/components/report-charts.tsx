"use client";

// recharts is about a third of the /reportes JavaScript. These charts load
// through next/dynamic (report-charts-lazy.tsx), so the report cards fetch
// and show their numbers without waiting for it (plan 0.14).
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtMoney } from "@/lib/format";

type Currency = "ARS" | "USD" | "EUR";

function fmtK(n: number) {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toFixed(0);
}

export type CategoryDatum = { name: string; total: number; color: string };

export function CategoryBarChart({ data, currency }: { data: CategoryDatum[]; currency: Currency }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, bottom: 0, left: 0 }}>
        <XAxis type="number" tickFormatter={fmtK} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10 }}
          width={90}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(v) => [fmtMoney(Number(v ?? 0), currency), "Total"]}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export type SliceDatum = { name: string; value: number; fill: string };

export function DonutChart({ data }: { data: SliceDatum[] }) {
  return (
    <ResponsiveContainer width={120} height={120}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={30} outerRadius={55} dataKey="value" strokeWidth={0} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export type TrendLine = { key: string; label: string; color: string };

export function TrendsLineChart({
  data,
  lines,
  currency,
}: {
  data: Record<string, string | number>[];
  lines: readonly TrendLine[];
  currency: Currency;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtK} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          formatter={(v, name) => {
            const line = lines.find((l) => l.key === name);
            return [fmtMoney(Number(v ?? 0), currency), line?.label ?? String(name)];
          }}
          contentStyle={{ fontSize: 11, borderRadius: 8 }}
        />
        <Legend
          formatter={(value) => lines.find((l) => l.key === value)?.label ?? value}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 10 }}
        />
        {lines.map((l) => (
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
  );
}
