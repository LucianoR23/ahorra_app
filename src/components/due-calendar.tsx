"use client";

import { es } from "date-fns/locale";
import { CalendarDays, CreditCard, Repeat, TrendingUp, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { MonthNavigator } from "@/components/ui/month-navigator";
import { useCalendar, useCategories, usePaymentMethods } from "@/lib/api/hooks";
import type { CalendarEvent } from "@/lib/api/schemas";
import { dayLabel, isoToday } from "@/lib/format";
import { cn } from "@/lib/utils";

// Vencimientos (plan 7.2): a month of what is due or comes in. The grid
// marks the days with something; the list below shows the month, or the day
// picked. Amounts stay in their currency, like Tarjetas.

/** A YYYY-MM-DD at local midnight, as the day picker works. */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STATUS: Record<string, string> = { paid: "Pagado", overdue: "Vencido" };

function Tile({ icon: Icon, muted = false }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span aria-hidden className={cn("grid size-10 shrink-0 place-items-center rounded-full bg-surface-2", muted ? "text-ink-muted" : "text-ink")}>
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  );
}

/** Each currency of a statement on its own line, pesos first (as the API sorts them). */
function Totals({ totals }: { totals: NonNullable<CalendarEvent["totals"]> }) {
  return (
    <span className="flex flex-col items-end">
      {totals.map((t) => (
        <Money key={t.currency} amount={t.amount} currency={t.currency} />
      ))}
    </span>
  );
}

function EventRow({ event, methodName, categoryName }: { event: CalendarEvent; methodName: (id?: string) => string; categoryName: (id?: string) => string }) {
  const statement = event.paymentMethodId && event.periodYm ? `/tarjetas/${event.paymentMethodId}/resumen/${event.periodYm}` : undefined;
  switch (event.kind) {
    case "recurring_income":
      return (
        <ListRow
          href="/recurrentes"
          leading={<Tile icon={TrendingUp} />}
          title={event.title}
          subtitle="Ingreso fijo"
          trailing={<Money amount={event.amount ?? 0} currency={event.currency} income />}
        />
      );
    case "card_due": {
      const parts = [
        "Vence el resumen",
        event.installmentCount ? `${event.installmentCount} ${event.installmentCount === 1 ? "cuota" : "cuotas"}` : "",
        STATUS[event.status ?? ""] ?? "",
      ];
      return (
        <ListRow
          href={statement}
          leading={<Tile icon={CreditCard} />}
          title={event.title}
          subtitle={parts.filter(Boolean).join(" · ")}
          trailing={event.totals?.length ? <Totals totals={event.totals} /> : null}
        />
      );
    }
    case "recurring_expense": {
      const parts = [categoryName(event.categoryId), methodName(event.paymentMethodId), event.variable ? "monto estimado" : ""];
      return (
        <ListRow
          href="/recurrentes"
          leading={<Tile icon={Repeat} />}
          title={event.title}
          subtitle={parts.filter(Boolean).join(" · ") || "Gasto fijo"}
          trailing={<Money amount={event.amount ?? 0} currency={event.currency} />}
        />
      );
    }
    case "card_closing":
      return (
        <ListRow
          href={statement}
          leading={<Tile icon={CreditCard} muted />}
          title={event.title}
          subtitle="Cierra el resumen: lo que compres después va al siguiente"
        />
      );
  }
}

type DayGroup = { day: string; events: CalendarEvent[] };

function byDay(events: CalendarEvent[]): DayGroup[] {
  const out: DayGroup[] = [];
  for (const e of events) {
    const last = out[out.length - 1];
    if (last?.day === e.date) last.events.push(e);
    else out.push({ day: e.date, events: [e] });
  }
  return out;
}

export function DueCalendar() {
  const [month, setMonth] = useState(() => isoToday().slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  const { data, error, isLoading } = useCalendar(month);
  const { data: methods } = usePaymentMethods({ includeInactive: true });
  const { data: categories } = useCategories();
  const events = data?.events ?? [];

  const methodName = (id?: string) => (id ? (methods?.find((m) => m.id === id)?.name ?? "") : "");
  const categoryName = (id?: string) => (id ? (categories?.find((c) => c.id === id)?.name ?? "") : "");

  // One dot per day: what is paid wins over what comes in, and both over a
  // closing (nothing to pay that day).
  const pay = new Set<string>();
  const income = new Set<string>();
  const closing = new Set<string>();
  for (const e of events) {
    if (e.kind === "card_due" || e.kind === "recurring_expense") pay.add(e.date);
    else if (e.kind === "recurring_income") income.add(e.date);
    else closing.add(e.date);
  }
  const dates = (set: Set<string>, ...skip: Set<string>[]) => [...set].filter((d) => !skip.some((s) => s.has(d))).map(toDate);

  const shown = picked ? events.filter((e) => e.date === picked) : events;
  const changeMonth = (m: string) => {
    setMonth(m);
    setPicked(null);
  };
  const dot = "after:absolute after:bottom-1 after:left-1/2 after:size-1.5 after:-translate-x-1/2 after:rounded-full";

  return (
    <div className="flex flex-col gap-4">
      <MonthNavigator month={month} onMonthChange={changeMonth} />

      <Card className="py-2">
        <CardContent className="px-2">
          <Calendar
            mode="single"
            month={toDate(`${month}-01`)}
            onMonthChange={(d) => changeMonth(toIso(d).slice(0, 7))}
            hideNavigation
            selected={picked ? toDate(picked) : undefined}
            onSelect={(d) => setPicked(d ? toIso(d) : null)}
            locale={es}
            weekStartsOn={1}
            showOutsideDays={false}
            className="w-full bg-transparent p-0 [--cell-size:--spacing(10)]"
            classNames={{ root: "w-full", month_caption: "sr-only" }}
            modifiers={{ pay: dates(pay), income: dates(income, pay), closing: dates(closing, pay, income) }}
            modifiersClassNames={{
              pay: cn(dot, "after:bg-ink"),
              income: cn(dot, "after:bg-positive"),
              closing: cn(dot, "after:bg-ink-muted/50"),
            }}
          />
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 pt-1 text-caption text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-ink" /> Pagás
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-positive" /> Entra
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-1.5 rounded-full bg-ink-muted/50" /> Cierra una tarjeta
            </span>
          </p>
        </CardContent>
      </Card>

      {picked && (
        <div className="flex items-center justify-between px-1">
          <h2 className="text-body font-semibold text-ink">{dayLabel(picked)}</h2>
          <Button variant="link" onClick={() => setPicked(null)}>
            Ver todo el mes
          </Button>
        </div>
      )}

      {error ? (
        <Alert variant="error">No pudimos cargar los vencimientos. Probá de nuevo en un rato.</Alert>
      ) : isLoading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={picked ? "Nada este día" : "Nada este mes"}
          description={
            picked
              ? "Ese día no vence ni entra nada."
              : "Acá aparecen los vencimientos de tus tarjetas y tus gastos e ingresos fijos."
          }
        />
      ) : (
        byDay(shown).map((g, i) => (
          <section key={g.day} aria-label={dayLabel(g.day)} className="rise flex flex-col gap-2" style={{ "--i": i } as React.CSSProperties}>
            {!picked && <h2 className="px-1 text-body font-semibold text-ink-muted">{dayLabel(g.day)}</h2>}
            <Card className="py-1">
              <CardContent>
                <ul className="divide-y divide-border">
                  {g.events.map((e, j) => (
                    <li key={`${e.kind}-${e.recurringId ?? e.paymentMethodId}-${j}`}>
                      <EventRow event={e} methodName={methodName} categoryName={categoryName} />
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
