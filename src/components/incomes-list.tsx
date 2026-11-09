"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useHouseholdMembers, useIncomes, useTotalIncome } from "@/lib/api/hooks";
import { currentMonth, dayLabel, monthEnd, monthStart } from "@/lib/format";
import { groupByDay } from "@/lib/group-by-day";
import { incomeSourceLabel } from "@/lib/labels";
import { useSpaces } from "@/lib/spaces";
import { useAuthStore } from "@/stores/auth";

const PAGE = 50;
const MAX_ROWS = 200;

/** The round green arrow every income row leads with. */
export function IncomeIcon({ size = 40 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="grid shrink-0 place-items-center rounded-full bg-positive/12 text-positive"
    >
      <TrendingUp className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/**
 * Ingresos (plan 1.10b, no design: the `Movimientos` pattern): the month
 * with what came in, and the incomes grouped by day.
 */
export function IncomesList({ help }: { help?: React.ReactNode }) {
  const [month, setMonth] = useState(currentMonth());
  const [rows, setRows] = useState(PAGE);
  const me = useAuthStore((s) => s.user?.id);
  const { current } = useSpaces();
  const { data: members } = useHouseholdMembers();
  const range = { from: monthStart(month), to: monthEnd(month) };
  const { data, isLoading } = useIncomes({ ...range, limit: rows, offset: 0 });
  const { data: total, isLoading: loadingTotal } = useTotalIncome(range);

  const items = data?.items ?? [];
  const count = data?.totalCount ?? 0;
  const baseCurrency = current?.baseCurrency ?? "ARS";
  const shared = (members?.length ?? 0) > 1;
  const who = (uid: string) => (uid === me ? "Vos" : (members?.find((m) => m.userId === uid)?.firstName ?? ""));

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Ingresos"
        className="mb-0 items-center"
        action={
          <div className="flex items-center gap-2">
            {help}
            <Button size="icon" aria-label="Nuevo ingreso" nativeButton={false} render={<Link href="/ingresos/nuevo" />}>
              <Plus aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />

      <MonthNavigator
        month={month}
        onMonthChange={(m) => {
          setRows(PAGE);
          setMonth(m);
        }}
        className="border-0 bg-card shadow-card dark:ring-1 dark:ring-border"
        summary={
          loadingTotal || isLoading ? (
            <Skeleton className="mx-auto mt-1 h-4 w-40" />
          ) : (
            <>
              Entraron <Money amount={total?.total ?? 0} currency={baseCurrency} income className="font-semibold" /> ·{" "}
              {count === 1 ? "1 ingreso" : `${count} ingresos`}
            </>
          )
        }
      />

      {isLoading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Sin ingresos este mes"
          description="Cargá tu sueldo y lo que te entre para ver cuánto te queda."
          action={
            <Button variant="outline" nativeButton={false} render={<Link href="/ingresos/nuevo" />}>
              Cargar un ingreso
            </Button>
          }
        />
      ) : (
        groupByDay(items, (i) => i.receivedAt, (i) => i.amountBase).map((g) => (
          <section key={g.day} aria-label={dayLabel(g.day)} className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between px-1 text-body text-ink-muted">
              <h2 className="font-semibold">{dayLabel(g.day)}</h2>
              <Money amount={g.total} currency={baseCurrency} income />
            </div>
            <Card className="py-1">
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((inc) => {
                    const foreign = inc.currency !== inc.baseCurrency;
                    return (
                      <li key={inc.id}>
                        <ListRow
                          href={`/ingresos/${inc.id}`}
                          leading={<IncomeIcon />}
                          title={inc.description || incomeSourceLabel(inc.source)}
                          subtitle={
                            <>
                              {[incomeSourceLabel(inc.source), shared ? who(inc.receivedBy) : ""].filter(Boolean).join(" · ")}
                              {foreign && (
                                <>
                                  {" · ≈ "}
                                  <Money amount={inc.amountBase} currency={inc.baseCurrency} />
                                </>
                              )}
                            </>
                          }
                          trailing={<Money amount={inc.amount} currency={inc.currency} income />}
                        />
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))
      )}

      {items.length < count &&
        (rows < MAX_ROWS ? (
          <Button variant="secondary" className="self-center" onClick={() => setRows(Math.min(rows + PAGE, MAX_ROWS))}>
            Cargar más
          </Button>
        ) : (
          <p className="text-center text-caption text-ink-muted">
            Ves los últimos {MAX_ROWS} de {count}.
          </p>
        ))}
    </div>
  );
}
