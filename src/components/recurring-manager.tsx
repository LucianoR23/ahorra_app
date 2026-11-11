"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Repeat, Sparkles } from "lucide-react";
import { CategoryIcon } from "@/components/category-icon";
import { CategorySelect } from "@/components/category-select";
import { IncomeIcon } from "@/components/incomes-list";
import { SeriesStatsDialog } from "@/components/series-stats-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCategories,
  useHouseholds,
  usePaymentMethods,
  useRecurringExpense,
  useRecurringExpenses,
  useRecurringIncome,
  useRecurringIncomes,
  useRecurringSuggestions,
} from "@/lib/api/hooks";
import { ApiError } from "@/lib/api/errors";
import {
  createRecurringExpense,
  createRecurringIncome,
  deleteRecurringExpense,
  deleteRecurringIncome,
  dismissRecurringSuggestion,
  patchRecurringExpense,
  patchRecurringIncome,
  toggleRecurringExpense,
  toggleRecurringIncome,
  type RecurringExpenseInput,
  type RecurringIncomeInput,
} from "@/lib/api/mutations";
import type { Currency, RecurringExpense, RecurringIncome, RecurringSuggestion } from "@/lib/api/schemas";
import { confirm } from "@/lib/confirm";
import { isoToday, shiftMonth } from "@/lib/format";
import {
  FREQUENCY_LABELS,
  INCOME_SOURCES,
  MONTH_LABELS,
  MONTH_LABELS_SHORT,
  WEEKDAY_LABELS,
  WEEKDAY_LABELS_SHORT,
  incomeSourceLabel,
  type RecurringFrequency,
} from "@/lib/labels";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useHouseholdStore } from "@/stores/household";

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

type Frequency = "weekly" | "monthly" | "yearly";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensual" },
  { value: "yearly", label: "Anual" },
] as const;

// First day of the current month: the lowest "Desde" when creating. A series
// can only start this month or later, so the API can generate this month's
// charge right away.
function firstOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Day of month (1..31) of an ISO date. A monthly series is charged on the day
// of its start date instead of asking for it separately.
function dayFromIso(iso: string): number {
  const d = Number(iso?.slice(8, 10));
  return d >= 1 && d <= 31 ? d : 1;
}

function refresh() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      (k[0].startsWith("/recurring") ||
        k[0].startsWith("/expenses") ||
        k[0].startsWith("/incomes") ||
        k[0].startsWith("/reports")),
    undefined,
    { revalidate: true },
  );
}

function useBaseCurrency(): Currency {
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHouseholdId) ?? households?.[0];
  return (household?.baseCurrency ?? "ARS") as Currency;
}

type Tab = "expenses" | "incomes";
type Open = { kind: Tab; id?: string; suggestion?: RecurringSuggestion } | null;

/** What a new recurring expense starts with when it comes from a suggestion. */
type Prefill = Pick<RecurringExpense, "description" | "amount" | "currency" | "categoryId" | "paymentMethodId" | "startsAt">;

/**
 * The first charge of a suggestion turned into a recurring expense: its day,
 * the month after the last one paid by hand, and never before today (a start
 * in the past would book a charge already loaded). Day 31 in a short month
 * is its last day.
 */
export function suggestionStart(s: Pick<RecurringSuggestion, "lastSpentAt" | "dayOfMonth">, today: string = isoToday()): string {
  const at = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    return `${ym}-${String(Math.min(s.dayOfMonth, last)).padStart(2, "0")}`;
  };
  let ym = shiftMonth(s.lastSpentAt.slice(0, 7), 1);
  while (at(ym) < today) ym = shiftMonth(ym, 1);
  return at(ym);
}

// Price-increase alert of a variable bill: a push when the confirmed bill is
// this much over the previous one.
const THRESHOLDS = [10, 20, 30, 50];

/**
 * Recurrentes (plan 1.10b, no design: the header from `Componentes`, the
 * `Movimientos` list, and the sheet for create/edit). Each row opens its
 * sheet, where it is edited, paused or deleted.
 */
export function RecurringManager({ help }: { help?: React.ReactNode }) {
  const [tab, setTab] = useState<Tab>("expenses");
  const [open, setOpen] = useState<Open>(null);
  const { data: recExp, isLoading: loadingExp } = useRecurringExpenses();
  const { data: recInc, isLoading: loadingInc } = useRecurringIncomes();
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: suggestions, mutate: reloadSuggestions } = useRecurringSuggestions();

  const loading = tab === "expenses" ? loadingExp : loadingInc;
  const count = tab === "expenses" ? (recExp?.length ?? 0) : (recInc?.length ?? 0);
  const newLabel = tab === "expenses" ? "Nuevo gasto fijo" : "Nuevo ingreso fijo";
  const close = (v: boolean) => !v && setOpen(null);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Recurrentes"
        description="Gastos e ingresos que se cargan solos cada mes."
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            {help}
            <Button size="icon" aria-label={newLabel} onClick={() => setOpen({ kind: tab })}>
              <Plus aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="w-full">
        <TabsList className="w-full" aria-label="Tipo">
          <TabsTrigger value="expenses">Gastos fijos</TabsTrigger>
          <TabsTrigger value="incomes">Ingresos fijos</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "expenses" && !loadingExp && suggestions && suggestions.length > 0 && (
        <SuggestionsCard
          suggestions={suggestions}
          onAdd={(sg) => setOpen({ kind: "expenses", suggestion: sg })}
          onDismissed={() => reloadSuggestions()}
        />
      )}

      {loading ? (
        <Card className="py-1">
          <CardContent>
            {[0, 1, 2].map((i) => (
              <ListRowSkeleton key={i} />
            ))}
          </CardContent>
        </Card>
      ) : count === 0 ? (
        <EmptyState
          icon={Repeat}
          title={tab === "expenses" ? "Todavía no tenés gastos fijos" : "Todavía no tenés ingresos fijos"}
          description={
            tab === "expenses"
              ? "Netflix, el alquiler o la luz: cargalos una vez y se suman solos cada mes."
              : "Tu sueldo o un alquiler que cobrás: cargalo una vez y entra solo cada mes."
          }
          action={
            <Button variant="outline" onClick={() => setOpen({ kind: tab })}>
              {newLabel}
            </Button>
          }
        />
      ) : (
        <Card className="py-1">
          <CardContent>
            <ul className="divide-y divide-border">
              {tab === "expenses"
                ? recExp?.map((r) => {
                    const cat = categories?.find((c) => c.id === r.categoryId);
                    const pm = paymentMethods?.find((p) => p.id === r.paymentMethodId);
                    // A variable bill shows what was last paid, not the template's estimate.
                    const amount = r.amountIsVariable && r.lastAmount != null ? r.lastAmount : r.amount;
                    return (
                      <li key={r.id} className={cn(!r.isActive && "opacity-60")}>
                        <ListRow
                          onClick={() => setOpen({ kind: "expenses", id: r.id })}
                          aria-label={`Editar ${r.description}`}
                          leading={<CategoryIcon icon={cat?.icon} />}
                          title={r.description}
                          subtitle={[
                            frequencyLabel(r),
                            pm?.name,
                            r.amountIsVariable ? "Variable" : null,
                            r.isActive ? null : "Pausado",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          trailing={
                            <>
                              <Money amount={amount} currency={r.currency} />
                              {r.amountIsVariable ? (
                                <span className="block text-caption font-normal text-ink-muted">
                                  {r.lastAmount != null ? "último" : "estimado"}
                                </span>
                              ) : r.installments > 1 ? (
                                <span className="block text-caption font-normal text-ink-muted">en {r.installments} cuotas</span>
                              ) : null}
                            </>
                          }
                        />
                      </li>
                    );
                  })
                : recInc?.map((r) => (
                    <li key={r.id} className={cn(!r.isActive && "opacity-60")}>
                      <ListRow
                        onClick={() => setOpen({ kind: "incomes", id: r.id })}
                        aria-label={`Editar ${r.description || incomeSourceLabel(r.source)}`}
                        leading={<IncomeIcon />}
                        title={r.description || incomeSourceLabel(r.source)}
                        subtitle={[frequencyLabel(r), incomeSourceLabel(r.source), r.isActive ? null : "Pausado"]
                          .filter(Boolean)
                          .join(" · ")}
                        trailing={<Money amount={r.amount} currency={r.currency} income />}
                      />
                    </li>
                  ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {open?.kind === "expenses" && (
        <RecurringExpenseSheet
          key={open.id ?? open.suggestion?.key ?? "new"}
          rec={open.id ? recExp?.find((r) => r.id === open.id) : undefined}
          prefill={open.suggestion ? prefillFrom(open.suggestion, paymentMethods) : undefined}
          onOpenChange={close}
        />
      )}
      {open?.kind === "incomes" && (
        <RecurringIncomeSheet
          key={open.id ?? "new"}
          rec={open.id ? recInc?.find((r) => r.id === open.id) : undefined}
          onOpenChange={close}
        />
      )}
    </div>
  );
}

function prefillFrom(sg: RecurringSuggestion, methods: { id: string; isActive: boolean }[] | undefined): Prefill {
  // The card may be another member's: then the user picks theirs.
  const own = methods?.some((m) => m.id === sg.paymentMethodId && m.isActive);
  return {
    description: sg.description,
    amount: sg.amount,
    currency: sg.currency,
    categoryId: sg.categoryId ?? null,
    paymentMethodId: own ? sg.paymentMethodId : "",
    startsAt: suggestionStart(sg),
  };
}

/**
 * Expenses loaded by hand that repeat every month (plan 7.3): add one as a
 * recurring expense (the form opens filled in) or say it is not one, which
 * hides it for everyone in the space.
 */
function SuggestionsCard({
  suggestions,
  onAdd,
  onDismissed,
}: {
  suggestions: RecurringSuggestion[];
  onAdd: (s: RecurringSuggestion) => void;
  onDismissed: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function dismiss(sg: RecurringSuggestion) {
    setBusy(sg.key);
    try {
      await dismissRecurringSuggestion(sg.key);
      await onDismissed();
      toast.success("Listo, no lo sugerimos más");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo descartar");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section aria-labelledby="suggestions-title" className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Sparkles aria-hidden className="size-4 text-ink-muted" strokeWidth={1.75} />
        <h2 id="suggestions-title" className="text-body font-semibold text-ink">
          ¿Son gastos fijos?
        </h2>
      </div>
      <Card className="py-1">
        <CardContent>
          <ul className="divide-y divide-border">
            {suggestions.map((sg) => (
              <li key={sg.key} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body font-semibold text-ink">{sg.description}</p>
                    <p className="text-caption text-ink-muted">
                      Lo cargaste {sg.months} de los últimos 4 meses, cerca del día {sg.dayOfMonth}
                    </p>
                  </div>
                  <span className="shrink-0 text-right">
                    <Money amount={sg.amount} currency={sg.currency} />
                    {sg.maxAmount > sg.minAmount && (
                      <span className="block text-caption font-normal text-ink-muted">
                        antes <Money amount={sg.minAmount} currency={sg.currency} />
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => onAdd(sg)} disabled={busy === sg.key} aria-label={`Agregar ${sg.description} como gasto fijo`}>
                    Agregar como fijo
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => dismiss(sg)}
                    disabled={busy === sg.key}
                    aria-label={`${sg.description} no es un gasto fijo`}
                  >
                    No es fijo
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}

function frequencyLabel(r: { frequency: string; dayOfMonth?: number | null; dayOfWeek?: number | null; monthOfYear?: number | null }) {
  if (r.frequency === "weekly") return `Cada ${WEEKDAY_LABELS_SHORT[r.dayOfWeek ?? 1]}`;
  if (r.frequency === "monthly") return `Día ${r.dayOfMonth ?? 1}`;
  if (r.frequency === "yearly") return `${r.dayOfMonth ?? 1} de ${MONTH_LABELS_SHORT[(r.monthOfYear ?? 1) - 1]}`;
  return FREQUENCY_LABELS[r.frequency as RecurringFrequency] ?? r.frequency;
}

// ---------- Sheets ----------------------------------------------------------

/** The sheet's actions under the form: pause or resume, and delete. */
function SeriesActions({
  active,
  busy,
  onToggle,
  onDelete,
  deleteLabel,
  extra,
}: {
  active: boolean;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
  deleteLabel: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {extra}
      <Button variant="secondary" className="w-full" onClick={onToggle} disabled={busy}>
        {active ? "Pausar" : "Activar"}
      </Button>
      <Button
        variant="ghost"
        className="text-negative hover:bg-negative-soft hover:text-negative"
        onClick={onDelete}
        disabled={busy}
      >
        {deleteLabel}
      </Button>
    </div>
  );
}

function RecurringExpenseSheet({
  rec,
  prefill,
  onOpenChange,
}: {
  rec?: RecurringExpense;
  prefill?: Prefill;
  onOpenChange: (v: boolean) => void;
}) {
  // Edit reads the series fresh: the list may lag behind the last generation.
  const { data, isLoading } = useRecurringExpense(rec?.id ?? null);
  const initial = rec ? (data ?? rec) : undefined;
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState(false);

  async function onToggle() {
    if (!rec) return;
    setBusy(true);
    try {
      await toggleRecurringExpense(rec.id, !rec.isActive);
      refresh();
      toast.success(rec.isActive ? "Gasto fijo pausado" : "Gasto fijo activado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cambiar");
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!rec) return;
    const ok = await confirm({
      title: "¿Eliminar este gasto fijo?",
      description: "Los gastos que ya generó no se eliminan.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRecurringExpense(rec.id);
      refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rec ? "Editar gasto fijo" : "Nuevo gasto fijo"}</DialogTitle>
        </DialogHeader>
        {rec && isLoading && !data ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : (
          <RecurringExpenseForm
            key={initial?.lastGenerated ?? initial?.id ?? "new"}
            initial={initial}
            prefill={prefill}
            onDone={() => {
              refresh();
              onOpenChange(false);
            }}
          />
        )}
        {rec && (
          <SeriesActions
            active={rec.isActive}
            busy={busy}
            onToggle={onToggle}
            onDelete={onDelete}
            deleteLabel="Eliminar gasto fijo"
            extra={
              <Button variant="secondary" className="w-full" onClick={() => setStats(true)} disabled={busy}>
                Ver histórico
              </Button>
            }
          />
        )}
        {rec && <SeriesStatsDialog recurring={rec} open={stats} onClose={() => setStats(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function RecurringIncomeSheet({ rec, onOpenChange }: { rec?: RecurringIncome; onOpenChange: (v: boolean) => void }) {
  const { data, isLoading } = useRecurringIncome(rec?.id ?? null);
  const initial = rec ? (data ?? rec) : undefined;
  const [busy, setBusy] = useState(false);

  async function onToggle() {
    if (!rec) return;
    setBusy(true);
    try {
      await toggleRecurringIncome(rec.id, !rec.isActive);
      refresh();
      toast.success(rec.isActive ? "Ingreso fijo pausado" : "Ingreso fijo activado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cambiar");
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!rec) return;
    const ok = await confirm({
      title: "¿Eliminar este ingreso fijo?",
      description: "Los ingresos que ya generó no se eliminan.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRecurringIncome(rec.id);
      refresh();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{rec ? "Editar ingreso fijo" : "Nuevo ingreso fijo"}</DialogTitle>
        </DialogHeader>
        {rec && isLoading && !data ? (
          <Skeleton className="h-72 w-full rounded-xl" />
        ) : (
          <RecurringIncomeForm
            key={initial?.lastGenerated ?? initial?.id ?? "new"}
            initial={initial}
            onDone={() => {
              refresh();
              onOpenChange(false);
            }}
          />
        )}
        {rec && (
          <SeriesActions active={rec.isActive} busy={busy} onToggle={onToggle} onDelete={onDelete} deleteLabel="Eliminar ingreso fijo" />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------- Forms (create + edit) ----------------------------------------

function Field({ label, htmlFor, id, children }: { label: string; htmlFor?: string; id?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} id={id}>
        {label}
      </Label>
      {children}
    </div>
  );
}

function AmountField({
  label,
  amount,
  setAmount,
  currency,
  setCurrency,
}: {
  label: string;
  amount: string;
  setAmount: (v: string) => void;
  currency: Currency;
  setCurrency: (v: Currency) => void;
}) {
  return (
    <Field label={label} htmlFor="rec-amount">
      <div className="flex items-center gap-2">
        <Input
          id="rec-amount"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="min-w-0 flex-1 tabular-nums"
        />
        <Segmented aria-label="Moneda" value={currency} onValueChange={setCurrency} options={CURRENCIES} className="w-auto shrink-0" />
      </div>
    </Field>
  );
}

function FrequencyFields({
  frequency,
  setFrequency,
  dayOfMonth,
  setDayOfMonth,
  dayOfWeek,
  setDayOfWeek,
  monthOfYear,
  setMonthOfYear,
}: {
  frequency: Frequency;
  setFrequency: (v: Frequency) => void;
  dayOfMonth: number | null;
  setDayOfMonth: (v: number | null) => void;
  dayOfWeek: number | null;
  setDayOfWeek: (v: number | null) => void;
  monthOfYear: number | null;
  setMonthOfYear: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label id="rec-frequency">Frecuencia</Label>
      <Segmented aria-labelledby="rec-frequency" value={frequency} onValueChange={setFrequency} options={FREQUENCIES} />

      {frequency === "weekly" && (
        <Select value={String(dayOfWeek ?? 1)} onValueChange={(v) => setDayOfWeek(Number(v))}>
          <SelectTrigger aria-label="Día de la semana" className="w-full">
            <SelectValue>{(v: string | null) => (v != null ? `Cada ${WEEKDAY_LABELS[Number(v)].toLowerCase()}` : "")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WEEKDAY_LABELS.map((d, i) => (
              <SelectItem key={i} value={String(i)}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {frequency === "monthly" && (
        <p className="text-caption text-ink-muted">
          Se carga el día <span className="font-semibold text-ink">{dayOfMonth ?? 1}</span> de cada mes, según la fecha de
          inicio.
        </p>
      )}

      {frequency === "yearly" && (
        <div className="grid grid-cols-[1fr_6rem] gap-2">
          <Select value={String(monthOfYear ?? 1)} onValueChange={(v) => setMonthOfYear(Number(v))}>
            <SelectTrigger aria-label="Mes" className="w-full">
              <SelectValue>{(v: string | null) => (v != null ? MONTH_LABELS[Number(v) - 1] : "")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {MONTH_LABELS.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Día"
            inputMode="numeric"
            value={dayOfMonth ?? 1}
            onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
          />
        </div>
      )}
    </div>
  );
}

function DateFields({
  frequency,
  startsAt,
  setStartsAt,
  endsAt,
  setEndsAt,
  editing,
}: {
  frequency: Frequency;
  startsAt: string;
  setStartsAt: (v: string) => void;
  endsAt: string;
  setEndsAt: (v: string) => void;
  editing: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Field label={frequency === "monthly" ? "Arranca el" : "Desde"}>
        <DatePicker value={startsAt} onChange={setStartsAt} minDate={editing ? undefined : firstOfCurrentMonth()} disabled={editing} />
        {editing && <p className="text-caption text-ink-muted">No se puede cambiar.</p>}
      </Field>
      <Field label="Hasta">
        <DatePicker value={endsAt} onChange={setEndsAt} placeholder="Sin fin" />
      </Field>
    </div>
  );
}

function FormError({ err }: { err: string | null }) {
  if (!err) return null;
  return (
    <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
      {err}
    </p>
  );
}

function RecurringExpenseForm({ initial, prefill, onDone }: { initial?: RecurringExpense; prefill?: Prefill; onDone: () => void }) {
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const baseCurrency = useBaseCurrency();
  // Editing starts from the series; creating from a suggestion, from it.
  const from = initial ?? prefill;

  const [description, setDescription] = useState(from?.description ?? "");
  const [amountStr, setAmountStr] = useState(from ? String(from.amount) : "");
  const [currency, setCurrency] = useState<Currency>((from?.currency as Currency) ?? baseCurrency);
  const [categoryId, setCategoryId] = useState(from?.categoryId ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(from?.paymentMethodId ?? "");
  const [installments, setInstallments] = useState(initial?.installments ?? 1);
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initial?.dayOfMonth ?? 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial?.dayOfWeek ?? 1);
  const [monthOfYear, setMonthOfYear] = useState<number | null>(initial?.monthOfYear ?? 1);
  const [startsAt, setStartsAt] = useState(from?.startsAt ?? isoToday());
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  // A variable bill (power, expensas, wifi): the amount is an estimate and
  // each month's charge waits for the real one. Always 1 installment, since
  // an unknown amount can't be split.
  const [amountIsVariable, setAmountIsVariable] = useState(initial?.amountIsVariable ?? false);
  // Only a variable bill can go up on its own: the alert lives with it.
  const [threshold, setThreshold] = useState<number | null>(initial?.alertThresholdPct ?? null);
  const thresholds = threshold != null && !THRESHOLDS.includes(threshold) ? [...THRESHOLDS, threshold].sort((a, b) => a - b) : THRESHOLDS;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Creating a monthly series: its day comes from the start date. Editing (the
  // start date is fixed) or yearly: the stored day, which keeps old templates'.
  const dayOfMonthToSend = frequency === "monthly" && !initial ? dayFromIso(startsAt) : dayOfMonth;
  const pm = paymentMethods?.find((p) => p.id === paymentMethodId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amount = Number(amountStr.replace(",", "."));
    if (!description.trim() || !(amount > 0) || !paymentMethodId) {
      setErr("Completá descripción, monto y con qué pagás");
      return;
    }
    setBusy(true);
    // Variable or a method without installments: always 1, even if installments
    // were set with a credit card and the method changed afterwards.
    const effectiveInstallments = amountIsVariable || !pm?.allowsInstallments ? 1 : installments;
    // startsAt only goes on create: the API rejects changing it.
    const base: Omit<RecurringExpenseInput, "startsAt"> = {
      categoryId: categoryId || null,
      paymentMethodId,
      amount,
      currency,
      description: description.trim(),
      installments: effectiveInstallments,
      isShared: false,
      frequency,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonthToSend,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      endsAt: endsAt || null,
      amountIsVariable,
      alertThresholdPct: amountIsVariable ? threshold : null,
    };
    try {
      if (initial) await patchRecurringExpense(initial.id, base);
      else await createRecurringExpense({ ...base, startsAt });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Descripción" htmlFor="rec-description">
        <Input id="rec-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Netflix" />
      </Field>

      <AmountField
        label={amountIsVariable ? "Monto estimado" : "Monto"}
        amount={amountStr}
        setAmount={setAmountStr}
        currency={currency}
        setCurrency={setCurrency}
      />

      <div className="flex items-start justify-between gap-3 rounded-xl bg-surface-2 p-4">
        <div className="flex-1">
          <Label htmlFor="amountIsVariable" className="font-semibold">
            Importe variable
          </Label>
          <p className="mt-0.5 text-caption text-ink-muted">Si cambia cada mes (luz, expensas, wifi). Cada mes confirmás la factura real.</p>
        </div>
        <Switch id="amountIsVariable" checked={amountIsVariable} onCheckedChange={setAmountIsVariable} />
      </div>

      {amountIsVariable && (
        <Field label="Avisame si sube" htmlFor="rec-threshold">
          <Select value={threshold == null ? "none" : String(threshold)} onValueChange={(v) => setThreshold(!v || v === "none" ? null : Number(v))}>
            <SelectTrigger id="rec-threshold" className="w-full">
              <SelectValue>{(v: string | null) => (!v || v === "none" ? "Sin aviso" : `Más de ${v}% que la anterior`)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin aviso</SelectItem>
              {thresholds.map((t) => (
                <SelectItem key={t} value={String(t)}>
                  Más de {t}% que la anterior
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-caption text-ink-muted">Te avisamos cuando confirmás una factura que subió más que eso.</p>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Categoría">
          <CategorySelect value={categoryId} onValueChange={setCategoryId} categories={categories} emptyLabel="Sin categoría" className="w-full" />
        </Field>
        <Field label="Pago" htmlFor="rec-payment">
          <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
            <SelectTrigger id="rec-payment" className="w-full">
              <SelectValue placeholder="Elegí">
                {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Elegí") : "Elegí")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {paymentMethods
                ?.filter((p) => p.isActive)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      {!amountIsVariable && pm?.allowsInstallments && (
        <Field label="Cuotas por cargo" htmlFor="rec-installments">
          <Input
            id="rec-installments"
            inputMode="numeric"
            value={installments}
            onChange={(e) => setInstallments(Math.max(1, Number(e.target.value) || 1))}
            className="w-24"
          />
          <p className="text-caption text-ink-muted">Cada cargo se divide en esas cuotas.</p>
        </Field>
      )}

      <FrequencyFields
        frequency={frequency}
        setFrequency={setFrequency}
        dayOfMonth={dayOfMonthToSend}
        setDayOfMonth={setDayOfMonth}
        dayOfWeek={dayOfWeek}
        setDayOfWeek={setDayOfWeek}
        monthOfYear={monthOfYear}
        setMonthOfYear={setMonthOfYear}
      />

      <DateFields frequency={frequency} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} editing={!!initial} />

      <FormError err={err} />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Guardando…" : initial ? "Guardar" : "Crear gasto fijo"}
      </Button>
    </form>
  );
}

function RecurringIncomeForm({ initial, onDone }: { initial?: RecurringIncome; onDone: () => void }) {
  const baseCurrency = useBaseCurrency();
  const { data: paymentMethods } = usePaymentMethods();

  const [description, setDescription] = useState(initial?.description ?? "");
  const [source, setSource] = useState(initial?.source ?? "salary");
  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>((initial?.currency as Currency) ?? baseCurrency);
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? "");
  const [frequency, setFrequency] = useState<Frequency>(initial?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initial?.dayOfMonth ?? 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial?.dayOfWeek ?? 1);
  const [monthOfYear, setMonthOfYear] = useState<number | null>(initial?.monthOfYear ?? 1);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? isoToday());
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dayOfMonthToSend = frequency === "monthly" && !initial ? dayFromIso(startsAt) : dayOfMonth;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const amount = Number(amountStr.replace(",", "."));
    if (!(amount > 0) || !source.trim()) {
      setErr("Completá monto y fuente");
      return;
    }
    setBusy(true);
    const base: Omit<RecurringIncomeInput, "startsAt"> = {
      paymentMethodId: paymentMethodId || null,
      amount,
      currency,
      description: description.trim() || undefined,
      source: source.trim(),
      frequency,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonthToSend,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      endsAt: endsAt || null,
    };
    try {
      if (initial) await patchRecurringIncome(initial.id, base);
      else await createRecurringIncome({ ...base, startsAt });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fuente" htmlFor="rec-source">
          <Select
            value={(INCOME_SOURCES as readonly string[]).includes(source) ? source : "other"}
            onValueChange={(v) => setSource(v || "other")}
          >
            <SelectTrigger id="rec-source" className="w-full">
              <SelectValue>{(v: string | null) => (v ? incomeSourceLabel(v) : "")}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {INCOME_SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {incomeSourceLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Descripción" htmlFor="rec-description">
          <Input id="rec-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Sueldo" />
        </Field>
      </div>

      <AmountField label="Monto" amount={amountStr} setAmount={setAmountStr} currency={currency} setCurrency={setCurrency} />

      <Field label="Cuenta" htmlFor="rec-account">
        <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
          <SelectTrigger id="rec-account" className="w-full">
            <SelectValue placeholder="Sin especificar">
              {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Sin especificar") : "Sin especificar")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Sin especificar</SelectItem>
            {paymentMethods
              ?.filter((p) => p.isActive && p.kind !== "credit")
              .map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </Field>

      <FrequencyFields
        frequency={frequency}
        setFrequency={setFrequency}
        dayOfMonth={dayOfMonthToSend}
        setDayOfMonth={setDayOfMonth}
        dayOfWeek={dayOfWeek}
        setDayOfWeek={setDayOfWeek}
        monthOfYear={monthOfYear}
        setMonthOfYear={setMonthOfYear}
      />

      <DateFields frequency={frequency} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} editing={!!initial} />

      <FormError err={err} />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? "Guardando…" : initial ? "Guardar" : "Crear ingreso fijo"}
      </Button>
    </form>
  );
}
