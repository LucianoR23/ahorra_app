"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useIncomes, useHouseholdMembers } from "@/lib/api/hooks";
import { fmtMoney, fmtDateShort, currentMonth, monthStart, monthEnd, fmtMonthLong, shiftMonth } from "@/lib/format";

const PAGE = 20;

export function IncomesList() {
  const [month, setMonth] = useState(currentMonth());
  const [offset, setOffset] = useState(0);
  const { data: members } = useHouseholdMembers();
  const { data, isLoading } = useIncomes({
    from: monthStart(month),
    to: monthEnd(month),
    limit: PAGE,
    offset,
  });

  const items = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const baseCurrency = items[0]?.baseCurrency ?? "ARS";
  const sum = items.reduce((a, i) => a + i.amountBase, 0);

  const memberName = new Map<string, string>(
    members?.map((u) => [u.userId, u.firstName.trim() || u.email]) ?? [],
  );

  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setOffset(0); setMonth(shiftMonth(month, -1)); }}
            className="grid size-8 place-items-center rounded-md hover:bg-muted"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="text-sm font-bold first-letter:uppercase">{fmtMonthLong(month)}</div>
          <button
            type="button"
            onClick={() => { setOffset(0); setMonth(shiftMonth(month, 1)); }}
            className="grid size-8 place-items-center rounded-md hover:bg-muted"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="size-4" />
          </button>
        </CardContent>
      </Card>

      {/* Totales */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-positive/20 text-positive">
              <TrendingUp className="size-5" />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                Ingresos del mes
              </div>
              <div className="font-mono text-xl font-bold">
                +{fmtMoney(sum, baseCurrency, { decimals: 0 })}
              </div>
            </div>
            <Link
              href="/ingresos/nuevo"
              className="inline-flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-card hover:bg-primary/90"
              aria-label="Nuevo ingreso"
            >
              <Plus className="size-4" />
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="rounded-2xl border-0 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Sin ingresos en este mes.
          </div>
        ) : (
          items.map((inc, i) => (
            <Link
              key={inc.id}
              href={`/ingresos/${inc.id}`}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors ${i === items.length - 1 ? "" : "border-b border-border"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {inc.description || inc.source}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {inc.source} · {memberName.get(inc.receivedBy) ?? "—"} · {fmtDateShort(inc.receivedAt)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="font-mono text-sm font-semibold text-positive">
                  +{fmtMoney(inc.amountBase, inc.baseCurrency, { decimals: 0 })}
                </div>
                {inc.currency !== inc.baseCurrency && (
                  <div className="text-[10px] text-muted-foreground">
                    {fmtMoney(inc.amount, inc.currency, { decimals: 0 })}
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </Card>

      {total > PAGE && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {offset + 1}–{Math.min(offset + items.length, total)} de {total}
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
              ‹
            </Button>
            <Button variant="outline" size="sm" disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>
              ›
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
