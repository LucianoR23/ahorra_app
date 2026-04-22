"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Repeat, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useExpenses,
  useCategories,
  usePaymentMethods,
} from "@/lib/api/hooks";
import { fmtMoney, fmtDateShort, currentMonth, monthStart, monthEnd, fmtMonthLong, shiftMonth } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const PAGE = 20;

type FixedFilter = "all" | "fixed" | "variable";

export function ExpensesList() {
  const [month, setMonth] = useState<string>(currentMonth());
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [fixedFilter, setFixedFilter] = useState<FixedFilter>("all");
  const [offset, setOffset] = useState(0);

  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const { data, isLoading } = useExpenses({
    from: monthStart(month),
    to: monthEnd(month),
    categoryId: categoryId || undefined,
    paymentMethodId: paymentMethodId || undefined,
    limit: PAGE,
    offset,
  });

  const items = data?.items ?? [];
  const filtered =
    fixedFilter === "all"
      ? items
      : fixedFilter === "fixed"
        ? items.filter((e) => !!e.recurringExpenseId)
        : items.filter((e) => !e.recurringExpenseId);

  const total = data?.totalCount ?? 0;
  const showingStart = total === 0 ? 0 : offset + 1;
  const showingEnd = Math.min(offset + items.length, total);

  const categoriesById = new Map<string, string>(
    categories?.map((c) => [c.id, c.name]) ?? [],
  );
  const pmById = new Map<string, string>(
    paymentMethods?.map((p) => [p.id, p.name]) ?? [],
  );

  function resetOffset<T>(setter: (v: T) => void) {
    return (v: T) => {
      setOffset(0);
      setter(v);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
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
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={categoryId} onValueChange={(v) => resetOffset(setCategoryId)(v ?? "")}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Todas las categorías">
                  {(v: string | null) => (v ? (categories?.find((c) => c.id === v)?.name ?? "Todas las categorías") : "Todas las categorías")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas las categorías</SelectItem>
                {categories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentMethodId} onValueChange={(v) => resetOffset(setPaymentMethodId)(v ?? "")}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Todos los métodos">
                  {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Todos los métodos") : "Todos los métodos")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos los métodos</SelectItem>
                {paymentMethods?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-1.5">
            {(["all", "fixed", "variable"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFixedFilter(f)}
                className={cn(
                  "flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-colors",
                  fixedFilter === f
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {f === "all" ? "Todos" : f === "fixed" ? "Fijos" : "Variables"}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      <Card className="rounded-2xl border-0 shadow-card overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Sin movimientos para este filtro.
          </div>
        ) : (
          filtered.map((e, i) => {
            const isLast = i === filtered.length - 1;
            const cat = e.categoryId ? categoriesById.get(e.categoryId) : "Sin categoría";
            const pm = pmById.get(e.paymentMethodId) ?? "—";
            return (
              <Link
                key={e.id}
                href={`/movimientos/${e.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors",
                  !isLast && "border-b border-border",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{e.description}</span>
                    {e.recurringExpenseId && (
                      <Badge variant="secondary" className="h-4 gap-0.5 px-1 text-[9px]">
                        <Repeat className="size-2.5" /> Fijo
                      </Badge>
                    )}
                    {e.installments > 1 && (
                      <Badge variant="outline" className="h-4 px-1 text-[9px]">
                        {e.installments}c
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {cat} · {pm} · {fmtDateShort(e.spentAt)}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold">
                    −{fmtMoney(e.amountBase, e.baseCurrency, { compact: e.amountBase > 99999 })}
                  </div>
                  {e.currency !== e.baseCurrency && (
                    <div className="text-[10px] text-muted-foreground">
                      {fmtMoney(e.amount, e.currency, { decimals: 0 })}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </Card>

      {/* Paginación */}
      {total > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {showingStart}–{showingEnd} de {total}
          </span>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE))}
            >
              ‹ Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={offset + PAGE >= total}
              onClick={() => setOffset(offset + PAGE)}
            >
              Siguiente ›
            </Button>
          </div>
        </div>
      )}

      <Link
        href="/agregar"
        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-card transition-colors hover:bg-primary/90"
      >
        <Plus className="size-4" />
        Agregar gasto
      </Link>
    </div>
  );
}
