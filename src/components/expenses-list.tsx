"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Receipt, Search, X } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { ExportMenu } from "@/components/export-menu";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories, useExpenses, usePaymentMethods } from "@/lib/api/hooks";
import { exportExpenses, type ExpenseExportFilters } from "@/lib/api/mutations";
import type { Category, Expense } from "@/lib/api/schemas";
import { currentMonth, dayLabel, monthEnd, monthStart } from "@/lib/format";
import { groupByDay as groupByDayOf } from "@/lib/group-by-day";
import { useSpaces } from "@/lib/spaces";

/** Rows per "Cargar más"; the API returns at most MAX_ROWS at once. */
export const PAGE = 50;
const MAX_ROWS = 200;

type Kind = "all" | "fixed" | "variable";

const KINDS: { value: Kind; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "fixed", label: "Fijos" },
  { value: "variable", label: "Variables" },
];

/** Expenses grouped by day, newest first, with each day's total in the base currency. */
export function groupByDay(items: Expense[]) {
  return groupByDayOf(items, (e) => e.spentAt, (e) => e.amountBase);
}

/**
 * Movimientos (design `Movimientos`, plan 1.10b): the month with what it
 * adds up to, filter chips, and the expenses grouped by day.
 */
export function ExpensesList({ help }: { help?: React.ReactNode }) {
  const [month, setMonth] = useState(currentMonth());
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const [rows, setRows] = useState(PAGE);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  // A new search starts from the first page (render-time reset, no effect).
  const [prevQuery, setPrevQuery] = useState(debouncedQuery);
  if (debouncedQuery !== prevQuery) {
    setPrevQuery(debouncedQuery);
    setRows(PAGE);
  }

  const { current } = useSpaces();
  const { data: categories } = useCategories();
  const { data: methods } = usePaymentMethods();
  const { data, isLoading } = useExpenses({
    from: monthStart(month),
    to: monthEnd(month),
    categoryId: categoryId || undefined,
    paymentMethodId: paymentMethodId || undefined,
    q: debouncedQuery || undefined,
    kind: kind === "all" ? undefined : kind,
    limit: rows,
  });

  const filters: ExpenseExportFilters = {
    categoryId: categoryId || undefined,
    paymentMethodId: paymentMethodId || undefined,
    q: debouncedQuery || undefined,
    kind: kind === "all" ? undefined : kind,
  };
  const filtered = Object.values(filters).some(Boolean);

  const items = data?.items ?? [];
  const total = data?.totalCount ?? 0;
  const baseCurrency = current?.baseCurrency ?? "ARS";
  const categoryById = new Map<string, Category>(categories?.map((c) => [c.id, c]) ?? []);
  const methodName = (id: string) => methods?.find((m) => m.id === id)?.name ?? "";

  function filter<T>(set: (v: T) => void) {
    return (v: T) => {
      setRows(PAGE);
      set(v);
    };
  }

  function closeSearch() {
    setSearching(false);
    setQuery("");
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Movimientos"
        className="mb-0 items-center"
        action={
          <div className="flex items-center gap-2">
            {help}
            <ExportMenu
              prefix="gastos"
              month={month}
              filtered={filtered}
              download={(range, withFilters) => exportExpenses(range, withFilters ? filters : {})}
            />
            <Button
              variant="secondary"
              size="icon"
              aria-label={searching ? "Cerrar búsqueda" : "Buscar"}
              aria-expanded={searching}
              onClick={() => (searching ? closeSearch() : setSearching(true))}
            >
              {searching ? <X aria-hidden strokeWidth={1.75} /> : <Search aria-hidden strokeWidth={1.75} />}
            </Button>
          </div>
        }
      />

      {searching && (
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted" strokeWidth={1.75} />
          <Input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descripción"
            aria-label="Buscar movimientos"
            className="pl-10"
          />
        </div>
      )}

      <MonthNavigator
        month={month}
        onMonthChange={filter(setMonth)}
        className="border-0 bg-card shadow-card dark:ring-1 dark:ring-border"
        summary={
          isLoading ? (
            <Skeleton className="mx-auto mt-1 h-4 w-40" />
          ) : (
            <>
              Gastaste{" "}
              <Money amount={data?.totalAmountBase ?? 0} currency={baseCurrency} className="font-semibold text-ink" /> ·{" "}
              {total === 1 ? "1 gasto" : `${total} gastos`}
            </>
          )
        }
      />

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Filtros">
        {KINDS.map((k) => (
          <Chip key={k.value} pressed={kind === k.value} onClick={() => filter(setKind)(k.value)}>
            {k.label}
          </Chip>
        ))}
        <FilterMenu
          label="Categoría"
          value={categoryId}
          onChange={filter(setCategoryId)}
          allLabel="Todas las categorías"
          options={categoryOptions(categories ?? [])}
        />
        <FilterMenu
          label="Pago"
          value={paymentMethodId}
          onChange={filter(setPaymentMethodId)}
          allLabel="Todos los medios"
          options={(methods ?? []).map((m) => ({ value: m.id, label: m.name }))}
        />
      </div>

      {isLoading ? (
        <Card>
          <CardContent>
            {[0, 1, 2, 3].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Sin movimientos"
          description={total === 0 && !debouncedQuery && !categoryId && !paymentMethodId && kind === "all" ? "No cargaste gastos este mes." : "Nada coincide con estos filtros."}
        />
      ) : (
        groupByDay(items).map((g, i) => (
          <section
            key={g.day}
            aria-label={dayLabel(g.day)}
            className="rise flex flex-col gap-2"
            style={{ "--i": i } as React.CSSProperties}
          >
            <div className="flex items-baseline justify-between px-1 text-body text-ink-muted">
              <h2 className="font-semibold">{dayLabel(g.day)}</h2>
              <Money amount={g.total} currency={baseCurrency} />
            </div>
            <Card className="py-1">
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.items.map((e) => {
                    const category = e.categoryId ? categoryById.get(e.categoryId) : undefined;
                    const foreign = e.currency !== e.baseCurrency;
                    return (
                      <li key={e.id}>
                        <ListRow
                          href={`/movimientos/${e.id}`}
                          leading={<CategoryIcon icon={category?.icon} />}
                          title={e.description}
                          subtitle={
                            <>
                              {[e.installments > 1 ? `${e.installments} cuotas` : (category?.name ?? "Sin categoría"), methodName(e.paymentMethodId)]
                                .filter(Boolean)
                                .join(" · ")}
                              {foreign && (
                                <>
                                  {" · ≈ "}
                                  <Money amount={e.amountBase} currency={e.baseCurrency} />
                                </>
                              )}
                            </>
                          }
                          trailing={<Money amount={e.amount} currency={e.currency} />}
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

      {items.length < total &&
        (rows < MAX_ROWS ? (
          <Button variant="secondary" className="self-center" onClick={() => setRows(Math.min(rows + PAGE, MAX_ROWS))}>
            Cargar más
          </Button>
        ) : (
          <p className="text-center text-caption text-ink-muted">
            Ves los últimos {MAX_ROWS} de {total}. Filtrá por categoría o medio de pago para ver el resto.
          </p>
        ))}
    </div>
  );
}

/** Top categories with their subcategories right after them, indented. */
function categoryOptions(categories: Category[]) {
  const out: { value: string; label: string; sub?: boolean }[] = [];
  for (const top of categories.filter((c) => !c.parentId)) {
    out.push({ value: top.id, label: top.name });
    for (const sub of categories.filter((c) => c.parentId === top.id)) out.push({ value: sub.id, label: sub.name, sub: true });
  }
  return out;
}

/** A chip that opens a single-choice menu; it reads the chosen option when there is one. */
function FilterMenu({
  label,
  value,
  onChange,
  allLabel,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  allLabel: string;
  options: { value: string; label: string; sub?: boolean }[];
}) {
  const chosen = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Chip active={!!chosen} aria-label={chosen ? `${label}: ${chosen.label}` : label} />}>
        {chosen?.label ?? label}
        <ChevronDown aria-hidden strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-80 min-w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(String(v))}>
          <DropdownMenuRadioItem value="" className="min-h-11 text-body">
            {allLabel}
          </DropdownMenuRadioItem>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className={o.sub ? "min-h-11 pl-6 text-body" : "min-h-11 text-body"}>
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
