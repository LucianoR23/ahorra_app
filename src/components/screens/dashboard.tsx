"use client";

import { Bell, Sparkles, AlertTriangle, Info, TrendingUp, PiggyBank } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { CategoryIcon } from "@/components/category-icon";
import { PushProvider } from "@/components/push-provider";
import { InstallPrompt } from "@/components/install-prompt";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { PendingDraftsCard } from "@/components/pending-drafts-card";
import { fmtARS, greeting } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/hooks";
import { useAuthStore } from "@/stores/auth";
import { InsightsUnreadBadge } from "@/components/insights-inbox";
import {
  useMonthlyReport,
  useRecentExpenses,
  useLatestInsight,
  useCategories,
  useTotalIncome,
} from "@/lib/api/hooks";
import type { Category, MonthlyReport, Expense, Insight } from "@/lib/api/schemas";

export function Dashboard() {
  const { data: report, isLoading: loadingReport } = useMonthlyReport();
  const { data: expensesResp, isLoading: loadingExpenses } = useRecentExpenses(5);
  const { data: insights, isLoading: loadingInsight } = useLatestInsight();
  const { data: categories } = useCategories();

  const insight = insights?.[0];
  const expenses = expensesResp?.items ?? [];
  const categoriesById = new Map<string, Category>(
    categories?.map((c) => [c.id, c]) ?? [],
  );

  const topCat = report?.byCategory?.[0];
  const fixedPct = report?.fixedVariable.fixedPct ?? 0;

  return (
    <div className="flex flex-col gap-4 pb-4">
      <Header />
      <InstallPrompt />
      <PushProvider />
      <EmailVerificationBanner />

      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Gastado este mes"
          value={loadingReport ? null : fmtARS(report?.spentThisMonth ?? 0, { compact: true })}
          sub={report ? report.month : "\u00A0"}
          tone="ai"
        />
        <StatCard
          label="A pagar este mes"
          value={loadingReport ? null : fmtARS(report?.dueThisMonth ?? 0, { compact: true })}
          sub={report ? `Facturado ${fmtARS(report.billedThisMonth, { compact: true })}` : "\u00A0"}
          tone="warn"
        />
        <StatCard
          label="Mayor categoría"
          value={loadingReport ? null : topCat?.categoryName ?? "—"}
          sub={topCat ? `${fmtARS(topCat.total, { compact: true })} · ${Math.round(topCat.pct)}%` : "Sin datos"}
          textValue
          tone="primary"
        />
        <StatCard
          label="Fijos vs variables"
          value={loadingReport ? null : `${Math.round(fixedPct)}%`}
          sub={`Fijos ${report ? fmtARS(report.fixedVariable.fixedTotal, { compact: true }) : "—"}`}
          tone="positive"
        />
      </div>

      <CoachBubble insight={insight} loading={loadingInsight} />

      <PendingDraftsCard />

      <IncomeCard spent={report?.spentThisMonth ?? 0} loadingReport={loadingReport} />

      <ForecastCard report={report} loading={loadingReport} />

      <RecentList expenses={expenses} loading={loadingExpenses} categoriesById={categoriesById} />
    </div>
  );
}

function Header() {
  const user = useAuthStore((s) => s.user);
  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  const dateLabel = now
    ? now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })
    : "\u00A0";
  const greet = now ? greeting(now.getHours()) : "\u00A0";
  const name = user?.firstName ?? "";

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[14px] font-medium text-muted-foreground">
          {greet}
          {now && name ? `, ${name}` : ""}
        </div>
        <h1 className="mt-0.5 text-2xl md:text-[28px] font-bold tracking-tight first-letter:uppercase">
          {dateLabel}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle className="size-10.5 rounded-2xl bg-card shadow-card border border-border" />
        <Link
          href="/notificaciones"
          aria-label="Notificaciones"
          className="relative grid size-10.5 place-items-center rounded-2xl bg-card shadow-card border border-border text-foreground"
        >
          <Bell className="size-4.5" />
          <span className="absolute -right-1 -top-1">
            <InsightsUnreadBadge />
          </span>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone,
  textValue,
}: {
  label: string;
  value: string | null;
  sub: string;
  tone: "ai" | "positive" | "warn" | "primary";
  textValue?: boolean;
}) {
  const toneClass = {
    ai: "text-ai",
    positive: "text-positive",
    warn: "text-warn",
    primary: "text-primary",
  }[tone];
  return (
    <Card className="shadow-card rounded-2xl border-0 py-0">
      <CardContent className="p-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          {label}
        </div>
        {value === null ? (
          <Skeleton className="mt-1.5 h-6 w-20" />
        ) : (
          <div
            className={cn(
              "mt-1 font-bold tracking-tight truncate",
              textValue ? "text-lg" : "text-xl font-mono",
            )}
          >
            {value}
          </div>
        )}
        <div className={cn("mt-1 text-[12px] font-semibold truncate", toneClass)}>{sub}</div>
      </CardContent>
    </Card>
  );
}

function CoachBubble({ insight, loading }: { insight: Insight | undefined; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-start gap-2.5">
        <Skeleton className="size-9.5 rounded-full" />
        <Skeleton className="h-24 flex-1 rounded-[18px]" />
      </div>
    );
  }
  if (!insight) {
    return (
      <Card className="shadow-card rounded-2xl border-0 py-0">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Tu coach está revisando tus gastos. Volvé en unas horas.
        </CardContent>
      </Card>
    );
  }
  const Icon = insight.severity === "danger" ? AlertTriangle : insight.severity === "warning" ? Info : Sparkles;
  const tone = insight.severity === "danger" ? "text-warn" : insight.severity === "warning" ? "text-warn" : "text-ai";
  const bgFrom = insight.severity === "info" ? "from-ai" : "from-warn";
  const bgTo = insight.severity === "info" ? "to-ai/60" : "to-warn/60";
  return (
    <div className="flex items-start gap-2.5">
      <div className={cn("grid size-9.5 shrink-0 place-items-center rounded-full bg-linear-to-br text-white shadow-lg", bgFrom, bgTo, insight.severity === "info" ? "shadow-ai/40" : "shadow-warn/40")}>
        <Icon className="size-4.5" />
      </div>
      <div className="flex-1 rounded-[18px] rounded-tl-lg bg-card p-4 shadow-card border border-border/40">
        <div className={cn("text-[12px] font-bold uppercase tracking-[1.2px]", tone)}>
          Tu coach de hoy
        </div>
        <div className="mt-1 text-[16px] font-bold tracking-tight">{insight.title}</div>
        <p className="mt-1.5 text-[14px] leading-relaxed text-muted-foreground whitespace-pre-line">
          {insight.body}
        </p>
      </div>
    </div>
  );
}

function ForecastCard({ report, loading }: { report: MonthlyReport | undefined; loading: boolean }) {
  if (loading || !report) {
    return (
      <Card className="shadow-card rounded-2xl border-0 py-0">
        <CardContent className="p-4">
          <Skeleton className="h-30 w-full" />
        </CardContent>
      </Card>
    );
  }

  const spent = report.spentThisMonth;
  const due = report.dueThisMonth;
  const total = spent + due;

  const size = 120;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const spentPct = total > 0 ? spent / total : 0;

  return (
    <Card className="shadow-card rounded-2xl border-0 py-0">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--surface-alt)" strokeWidth={stroke} fill="none" />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              stroke="var(--positive)"
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${spentPct * C} ${C}`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
              Gastado
            </div>
            <div className="mt-0.5 font-mono text-base font-bold tracking-tight">
              {fmtARS(spent, { compact: true })}
            </div>
            <div className="mt-0.5 font-mono text-[11px] font-bold text-muted-foreground">
              de {fmtARS(total, { compact: true })}
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2.5 inline-flex items-center gap-1 rounded-[8px] bg-positive/15 px-2.5 py-1 text-[12px] font-bold text-positive">
            {report.month}
          </div>
          <div className="text-[12px] font-semibold uppercase tracking-[0.8px] text-muted-foreground">
            Facturado
          </div>
          <div className="mt-0.5 font-mono text-[24px] font-bold tracking-tight">
            {fmtARS(report.billedThisMonth, { compact: true })}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            A pagar {fmtARS(due, { compact: true })} · {report.baseCurrency}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function currentMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { from: fmt(from), to: fmt(to) };
}

function IncomeCard({ spent, loadingReport }: { spent: number; loadingReport: boolean }) {
  const range = currentMonthRange();
  const { data, isLoading } = useTotalIncome(range);
  const income = data?.total ?? 0;
  const currency = data?.baseCurrency ?? "ARS";
  const net = income - spent;
  const savingsRate = income > 0 ? Math.max(0, Math.min(100, (net / income) * 100)) : 0;
  const isPositive = net >= 0;

  return (
    <Card className="shadow-card rounded-2xl border-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-positive/15 text-positive">
            <TrendingUp className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
              Ingresos de este mes
            </div>
            {isLoading ? (
              <Skeleton className="mt-1 h-7 w-32" />
            ) : (
              <div className="mt-0.5 font-mono text-[24px] font-bold tracking-tight">
                {fmtARS(income, { compact: true })}
                <span className="ml-1 text-[11px] font-semibold text-muted-foreground">{currency}</span>
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
              Neto
            </div>
            {isLoading || loadingReport ? (
              <Skeleton className="mt-1 h-5 w-16" />
            ) : (
              <div
                className={cn(
                  "mt-0.5 font-mono text-base font-bold tracking-tight",
                  isPositive ? "text-positive" : "text-destructive",
                )}
              >
                {isPositive ? "+" : "−"}
                {fmtARS(Math.abs(net), { compact: true })}
              </div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <PiggyBank className="size-3" />
              Tasa de ahorro
            </span>
            <span className="font-mono font-bold text-foreground">
              {isLoading || loadingReport ? "…" : `${Math.round(savingsRate)}%`}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                isPositive ? "bg-positive" : "bg-destructive",
              )}
              style={{ width: `${savingsRate}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentList({
  expenses,
  loading,
  categoriesById,
}: {
  expenses: Expense[];
  loading: boolean;
  categoriesById: Map<string, Category>;
}) {
  return (
    <Card className="shadow-card rounded-2xl border-0 py-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 pb-2">
        <h2 className="text-[16px] font-bold">Recientes</h2>
        <Link href="/movimientos" className="text-xs font-semibold text-primary hover:underline">
          Ver todo →
        </Link>
      </div>
      {loading ? (
        <div className="flex flex-col gap-2 px-4 pb-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-md" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <div className="px-4 pb-4 text-sm text-muted-foreground">Todavía no cargaste gastos.</div>
      ) : (
        expenses.map((e, i) => {
          const cat = e.categoryId ? categoriesById.get(e.categoryId) : undefined;
          const isLast = i === expenses.length - 1;
          return (
            <div
              key={e.id}
              className={cn("flex items-center gap-3 px-4 py-2.5", !isLast && "border-b border-border")}
            >
              <CategoryIcon cat="default" size={38} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{e.description}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {cat?.name ?? "Sin categoría"} · {e.spentAt}
                  {e.installments > 1 ? ` · ${e.installments} cuotas` : ""}
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-semibold">
                −{fmtARS(e.amountBase, { compact: e.amountBase > 99999 })}
              </div>
            </div>
          );
        })
      )}
    </Card>
  );
}
