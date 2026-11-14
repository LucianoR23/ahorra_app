"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CardsDue, CommittedWidget } from "@/components/committed/committed-widget";
import { CardPeriodNudges } from "@/components/card-statements/period-nudge";
import { CategoryIcon } from "@/components/category-icon";
import { DiscreetToggle } from "@/components/discreet-toggle";
import { ViewCurrencyPicker, ViewCurrencyNote } from "@/components/view-currency";
import { reportCurrency } from "@/lib/fx";
import { EmailVerificationBanner } from "@/components/email-verification-banner";
import { InstallPrompt } from "@/components/install-prompt";
import { PendingDraftsCard } from "@/components/pending-drafts-card";
import { InboundPendingCard } from "@/components/inbound-pending-card";
import { PushProvider } from "@/components/push-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { DateLabel } from "@/components/ui/date-label";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCategories,
  useLatestInsight,
  useMonthlyReport,
  usePaymentMethods,
  useRecentExpenses,
} from "@/lib/api/hooks";
import type { Expense } from "@/lib/api/schemas";
import { greeting } from "@/lib/format";
import { useIsClient } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useMaskText } from "@/stores/discreet";

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/**
 * Inicio · Yo (designs `Main` and `DesktopInicio`, plans 1.2 and 4.2): what
 * the month cost, what is committed in the cards, the statements to pay,
 * the latest insight and the last movements of Mi plata.
 */
export function InicioYo() {
  return (
    <div className="flex flex-col gap-4 pb-4">
      <Greeting />
      <InstallPrompt />
      <PushProvider />
      <EmailVerificationBanner />
      <CardPeriodNudges />
      <div className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(420px,1fr))]">
        <MonthHero />
        <CommittedWidget />
        <CardsDue />
        <LatestInsight />
        <InboundPendingCard className="md:col-span-full" />
        <div className="md:col-span-full">
          <PendingDraftsCard />
        </div>
        <RecentMovements className="md:col-span-full" />
      </div>
    </div>
  );
}

function Greeting() {
  const name = useAuthStore((s) => s.user?.firstName ?? "");
  const isClient = useIsClient();
  const now = isClient ? new Date() : null;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title font-bold">
          {now ? `${greeting(now.getHours())}${name ? `, ${name}` : ""}` : " "}
        </h1>
        <p className="mt-0.5 text-caption text-ink-muted first-letter:uppercase">
          {now ? now.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" }) : " "}
        </p>
      </div>
      <DiscreetToggle />
    </div>
  );
}

/** "Gastaste en noviembre" with what came in and what is left. */
function MonthHero() {
  const now = new Date();
  const { data: report, isLoading } = useMonthlyReport();
  const currency = reportCurrency(report);
  const spent = report?.spentThisMonth ?? 0;
  const came = report?.incomeThisMonth ?? 0;
  const left = came - spent;
  const pct = came > 0 ? Math.round((spent / came) * 100) : 0;

  return (
    <section
      aria-labelledby="month-spent"
      className="flex flex-col gap-3 md:rounded-xl md:bg-card md:p-6 md:shadow-card md:dark:ring-1 md:dark:ring-border"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="month-spent" className="text-label uppercase text-ink-muted">
          Gastaste en {MONTHS[now.getMonth()]}
        </h2>
        <ViewCurrencyPicker />
      </div>
      {isLoading ? (
        <Skeleton className="h-12 w-56" />
      ) : (
        <p className="text-display font-bold">
          <Money amount={spent} currency={currency} />
        </p>
      )}
      {!isLoading && came === 0 ? (
        <p className="text-caption text-ink-muted">
          <Link href="/ingresos" className="font-semibold text-ink underline underline-offset-4">
            Cargá tus ingresos
          </Link>{" "}
          para ver cuánto te queda.
        </p>
      ) : (
        <dl className="flex gap-8">
          <div>
            <dt className="text-caption text-ink-muted">Entraron</dt>
            <dd className="text-body font-semibold">
              {isLoading ? <Skeleton className="h-5 w-24" /> : <Money amount={came} currency={currency} income />}
            </dd>
          </div>
          <div>
            <dt className="text-caption text-ink-muted">{left < 0 ? "Te pasaste" : "Te quedan"}</dt>
            <dd className={cn("text-body font-semibold", left < 0 && "text-negative")}>
              {isLoading ? <Skeleton className="h-5 w-24" /> : <Money amount={Math.abs(left)} currency={currency} />}
            </dd>
          </div>
        </dl>
      )}
      {came > 0 && !isLoading && (
        <div className="hidden flex-col gap-2 md:flex">
          <div aria-hidden className="h-2 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <p className="text-caption text-ink-muted">Gastaste el {pct}% de lo que entró este mes.</p>
        </div>
      )}
      <ViewCurrencyNote />
    </section>
  );
}

const SUMMARY_HEADINGS: Record<string, string> = { weekly_review: "Tu semana", monthly_review: "Tu mes" };

/** The latest insight (design "Tu semana"); nothing until there is one. */
function LatestInsight() {
  const { data } = useLatestInsight();
  const mask = useMaskText();
  const insight = data?.items[0];
  if (!insight) return null;
  // A summary (plan 8.2) says it all in its body; other notices need the title.
  const summary = SUMMARY_HEADINGS[insight.insightType];

  return (
    <section aria-labelledby="latest-insight" className="flex flex-col gap-3 rounded-xl bg-brand-soft p-5 text-ink">
      <h2 id="latest-insight" className="flex items-center gap-2 text-label uppercase">
        <Sparkles aria-hidden className="size-4 text-brand-ink" strokeWidth={1.75} />
        {summary ?? "Novedad"}
      </h2>
      {!summary && <p className="text-body font-semibold">{mask(insight.title)}</p>}
      <p className="whitespace-pre-line text-body">{mask(insight.body)}</p>
      <Link href="/notificaciones" className="self-start text-body font-semibold underline underline-offset-4">
        Ver notificaciones
      </Link>
    </section>
  );
}

/** "Últimos movimientos": a list on mobile, a table on desktop. */
function RecentMovements({ className }: { className?: string }) {
  const { data, isLoading } = useRecentExpenses(5);
  const { data: categories } = useCategories();
  const { data: methods } = usePaymentMethods();
  const expenses = data?.items ?? [];
  const category = (e: Expense) => categories?.find((c) => c.id === e.categoryId);
  const method = (e: Expense) => methods?.find((m) => m.id === e.paymentMethodId)?.name ?? "";

  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-heading font-semibold">Últimos movimientos</h2>
          <Link href="/movimientos" className="text-body font-semibold text-brand-ink hover:underline">
            Ver todos
          </Link>
        </div>
        {isLoading ? (
          <div>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <p className="py-2 text-body text-ink-muted">Todavía no cargaste gastos.</p>
        ) : (
          <>
            <ul className="divide-y divide-border md:hidden">
              {expenses.map((e) => (
                <li key={e.id}>
                  <ListRow
                    href={`/movimientos/${e.id}`}
                    leading={<CategoryIcon icon={category(e)?.icon} />}
                    title={<MovementTitle expense={e} />}
                    subtitle={
                      <>
                        {[category(e)?.name ?? "Sin categoría", method(e)].filter(Boolean).join(" · ")} · <DateLabel date={e.spentAt} />
                      </>
                    }
                    trailing={<Money amount={e.amount} currency={e.currency} />}
                  />
                </li>
              ))}
            </ul>
            <table className="hidden w-full text-body md:table">
              <thead>
                <tr className="border-b border-border text-left text-caption text-ink-muted">
                  <th className="py-2 font-normal">Descripción</th>
                  <th className="py-2 font-normal">Categoría</th>
                  <th className="py-2 font-normal">Pago</th>
                  <th className="py-2 font-normal">Fecha</th>
                  <th className="py-2 text-right font-normal">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 font-semibold">
                      <Link href={`/movimientos/${e.id}`} className="hover:underline">
                        <MovementTitle expense={e} />
                      </Link>
                    </td>
                    <td className="py-3">{category(e)?.name ?? "Sin categoría"}</td>
                    <td className="py-3">{method(e)}</td>
                    <td className="py-3">
                      <DateLabel date={e.spentAt} />
                    </td>
                    <td className="py-3 text-right font-semibold">
                      <Money amount={e.amount} currency={e.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function MovementTitle({ expense }: { expense: Expense }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2">
      <span className="truncate">{expense.description}</span>
      {expense.installments > 1 && (
        <span className="shrink-0 text-caption font-normal text-ink-muted">{expense.installments} cuotas</span>
      )}
      {expense.status === "draft" && (
        <Badge variant="outline" className="shrink-0">
          Borrador
        </Badge>
      )}
    </span>
  );
}
