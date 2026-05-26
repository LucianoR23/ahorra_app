"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Repeat, Trash2, Pause, Play, Edit3, X, LineChart } from "lucide-react";
import { SeriesStatsDialog } from "@/components/series-stats-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useRecurringExpenses,
  useRecurringIncomes,
  useRecurringExpense,
  useRecurringIncome,
  useCategories,
  usePaymentMethods,
  useHouseholds,
} from "@/lib/api/hooks";
import {
  createRecurringExpense,
  patchRecurringExpense,
  toggleRecurringExpense,
  deleteRecurringExpense,
  createRecurringIncome,
  patchRecurringIncome,
  toggleRecurringIncome,
  deleteRecurringIncome,
  type RecurringExpenseInput,
  type RecurringIncomeInput,
} from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { toast } from "@/lib/toast";
import { confirm } from "@/lib/confirm";
import { useHouseholdStore } from "@/stores/household";
import { fmtMoney, isoToday } from "@/lib/format";
import type { Currency, RecurringExpense, RecurringIncome } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
import { DatePicker } from "@/components/ui/date-picker";

const CURRENCIES: Currency[] = ["ARS", "USD", "EUR"];

type Tab = "expenses" | "incomes";

export function RecurringManager() {
  const [tab, setTab] = useState<Tab>("expenses");
  const [creating, setCreating] = useState(false);

  const { data: recExp, isLoading: loadingExp } = useRecurringExpenses();
  const { data: recInc, isLoading: loadingInc } = useRecurringIncomes();

  function refresh() {
    swrMutate(
      (k) => Array.isArray(k) && typeof k[0] === "string" &&
        (k[0].startsWith("/recurring") || k[0].startsWith("/expenses") || k[0].startsWith("/incomes") || k[0].startsWith("/reports")),
      undefined,
      { revalidate: true },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
        <button
          type="button"
          onClick={() => setTab("expenses")}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            tab === "expenses" ? "bg-card shadow-card" : "text-muted-foreground",
          )}
        >
          Gastos fijos
        </button>
        <button
          type="button"
          onClick={() => setTab("incomes")}
          className={cn(
            "cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            tab === "incomes" ? "bg-card shadow-card" : "text-muted-foreground",
          )}
        >
          Ingresos fijos
        </button>
      </div>

      {creating ? (
        tab === "expenses" ? (
          <RecurringExpenseForm onDone={() => { setCreating(false); refresh(); }} />
        ) : (
          <RecurringIncomeForm onDone={() => { setCreating(false); refresh(); }} />
        )
      ) : (
        <Button onClick={() => setCreating(true)} size="lg" className="w-full">
          <Plus className="size-4" /> Nuevo {tab === "expenses" ? "gasto fijo" : "ingreso fijo"}
        </Button>
      )}

      {tab === "expenses" ? (
        loadingExp ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : !recExp || recExp.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-card">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              Todavía no tenés gastos fijos.
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {recExp.map((r) => (
              <RecurringExpenseCard key={r.id} rec={r} onChanged={refresh} />
            ))}
          </div>
        )
      ) : loadingInc ? (
        <Skeleton className="h-28 w-full rounded-2xl" />
      ) : !recInc || recInc.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Todavía no tenés ingresos fijos.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {recInc.map((r) => (
            <RecurringIncomeCard key={r.id} rec={r} onChanged={refresh} />
          ))}
        </div>
      )}
    </div>
  );
}

function frequencyLabel(r: { frequency: string; dayOfMonth?: number | null; dayOfWeek?: number | null; monthOfYear?: number | null }) {
  if (r.frequency === "weekly") {
    return `Cada ${WEEKDAY_LABELS_SHORT[r.dayOfWeek ?? 1]}`;
  }
  if (r.frequency === "monthly") return `Día ${r.dayOfMonth ?? 1} del mes`;
  if (r.frequency === "yearly") {
    return `${r.dayOfMonth ?? 1} de ${MONTH_LABELS_SHORT[(r.monthOfYear ?? 1) - 1]}`;
  }
  return FREQUENCY_LABELS[r.frequency as RecurringFrequency] ?? r.frequency;
}

function RecurringExpenseCard({ rec, onChanged }: { rec: RecurringExpense; onChanged: () => void }) {
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const [editing, setEditing] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [busy, setBusy] = useState(false);

  const cat = categories?.find((c) => c.id === rec.categoryId);
  const pm = paymentMethods?.find((p) => p.id === rec.paymentMethodId);

  async function onToggle() {
    setBusy(true);
    try {
      await toggleRecurringExpense(rec.id, !rec.isActive);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: "¿Eliminar este gasto fijo?",
      description: "Los gastos ya generados no se eliminan.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRecurringExpense(rec.id);
      onChanged();
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof ApiError ? e.message : "Error");
    }
  }

  if (editing) {
    return (
      <RecurringExpenseEditForm
        id={rec.id}
        fallback={rec}
        onDone={() => { setEditing(false); onChanged(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  // Para series variables, el monto "actual" más útil es el último confirmado
  // (lo que realmente pagaste el mes pasado), no el estimado de la plantilla.
  const displayAmount = rec.amountIsVariable && rec.lastAmount != null ? rec.lastAmount : rec.amount;

  return (
    <Card className={cn("rounded-2xl border-0 shadow-card", !rec.isActive && "opacity-60")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="truncate text-sm font-bold">{rec.description}</span>
              <Badge variant="secondary" className="gap-0.5 text-[9px]">
                <Repeat className="size-2.5" />
              </Badge>
              {rec.amountIsVariable && (
                <Badge variant="outline" className="text-[9px]">Variable</Badge>
              )}
              {!rec.isActive && <Badge variant="outline" className="text-[9px]">Pausado</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {cat?.name ?? "Sin categoría"} · {pm?.name ?? "—"} · {frequencyLabel(rec)}
            </div>
          </div>
          <div className="shrink-0 text-right font-mono text-sm font-bold">
            {fmtMoney(displayAmount, rec.currency, { decimals: 0 })}
            {rec.amountIsVariable && (
              <div className="text-[10px] text-muted-foreground">
                {rec.lastAmount != null ? "último" : "estimado"}
              </div>
            )}
            {!rec.amountIsVariable && rec.installments > 1 && (
              <div className="text-[10px] text-muted-foreground">en {rec.installments}c</div>
            )}
          </div>
        </div>
        <div className="flex gap-1.5 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setShowStats(true)} disabled={busy} className="flex-1">
            <LineChart className="size-3" /> Histórico
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy} className="flex-1">
            <Edit3 className="size-3" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle} disabled={busy}>
            {rec.isActive ? <Pause className="size-3" /> : <Play className="size-3" />}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>

      <SeriesStatsDialog
        recurring={rec}
        open={showStats}
        onClose={() => setShowStats(false)}
      />
    </Card>
  );
}

function RecurringIncomeCard({ rec, onChanged }: { rec: RecurringIncome; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onToggle() {
    setBusy(true);
    try {
      await toggleRecurringIncome(rec.id, !rec.isActive);
      onChanged();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    const ok = await confirm({
      title: "¿Eliminar este ingreso fijo?",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRecurringIncome(rec.id);
      onChanged();
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof ApiError ? e.message : "Error");
    }
  }

  if (editing) {
    return (
      <RecurringIncomeEditForm
        id={rec.id}
        fallback={rec}
        onDone={() => { setEditing(false); onChanged(); }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <Card className={cn("rounded-2xl border-0 shadow-card", !rec.isActive && "opacity-60")}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold">{rec.description || rec.source}</span>
              {!rec.isActive && <Badge variant="outline" className="text-[9px]">Pausado</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {incomeSourceLabel(rec.source)} · {frequencyLabel(rec)}
            </div>
          </div>
          <div className="shrink-0 text-right font-mono text-sm font-bold text-positive">
            +{fmtMoney(rec.amount, rec.currency, { decimals: 0 })}
          </div>
        </div>
        <div className="flex gap-1.5 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={busy} className="flex-1">
            <Edit3 className="size-3" /> Editar
          </Button>
          <Button variant="outline" size="sm" onClick={onToggle} disabled={busy} className="flex-1">
            {rec.isActive ? <><Pause className="size-3" /> Pausar</> : <><Play className="size-3" /> Activar</>}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} disabled={busy}>
            <Trash2 className="size-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Forms (create + edit) ----------------------------------------

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
  frequency: "weekly" | "monthly" | "yearly";
  setFrequency: (v: "weekly" | "monthly" | "yearly") => void;
  dayOfMonth: number | null;
  setDayOfMonth: (v: number | null) => void;
  dayOfWeek: number | null;
  setDayOfWeek: (v: number | null) => void;
  monthOfYear: number | null;
  setMonthOfYear: (v: number | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Frecuencia</Label>
      <div className="grid grid-cols-3 gap-1">
        {(["weekly", "monthly", "yearly"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFrequency(f)}
            className={cn(
              "cursor-pointer rounded-md px-2 py-1.5 text-xs font-semibold transition-colors",
              frequency === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {f === "weekly" ? "Semanal" : f === "monthly" ? "Mensual" : "Anual"}
          </button>
        ))}
      </div>

      {frequency === "weekly" && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-normal text-muted-foreground">Día de la semana</Label>
          <Select value={String(dayOfWeek ?? 1)} onValueChange={(v) => setDayOfWeek(Number(v))}>
            <SelectTrigger>
              <SelectValue>
                {(v: string | null) => (v != null ? WEEKDAY_LABELS[Number(v)] : "")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {WEEKDAY_LABELS.map((d, i) => (
                <SelectItem key={i} value={String(i)}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {frequency === "monthly" && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-normal text-muted-foreground">Día del mes</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth ?? 1}
            onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
            className="h-9"
          />
        </div>
      )}

      {frequency === "yearly" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-normal text-muted-foreground">Mes</Label>
            <Select value={String(monthOfYear ?? 1)} onValueChange={(v) => setMonthOfYear(Number(v))}>
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) => (v != null ? MONTH_LABELS[Number(v) - 1] : "")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONTH_LABELS.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-normal text-muted-foreground">Día</Label>
            <Input
              type="number"
              min={1}
              max={31}
              value={dayOfMonth ?? 1}
              onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
              className="h-9"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RecurringExpenseEditForm({
  id,
  fallback,
  onDone,
  onCancel,
}: {
  id: string;
  fallback: RecurringExpense;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { data, isLoading } = useRecurringExpense(id);
  if (isLoading && !data) {
    return (
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <Skeleton className="h-48 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }
  return (
    <RecurringExpenseForm
      key={(data ?? fallback).lastGenerated ?? id}
      initial={data ?? fallback}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

function RecurringIncomeEditForm({
  id,
  fallback,
  onDone,
  onCancel,
}: {
  id: string;
  fallback: RecurringIncome;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { data, isLoading } = useRecurringIncome(id);
  if (isLoading && !data) {
    return (
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <Skeleton className="h-48 w-full rounded-md" />
        </CardContent>
      </Card>
    );
  }
  return (
    <RecurringIncomeForm
      key={(data ?? fallback).lastGenerated ?? id}
      initial={data ?? fallback}
      onDone={onDone}
      onCancel={onCancel}
    />
  );
}

function RecurringExpenseForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: RecurringExpense;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHouseholdId) ?? households?.[0];
  const baseCurrency = (household?.baseCurrency ?? "ARS") as Currency;

  const [description, setDescription] = useState(initial?.description ?? "");
  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>((initial?.currency as Currency) ?? baseCurrency);
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? "");
  const [installments, setInstallments] = useState(initial?.installments ?? 1);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">(initial?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initial?.dayOfMonth ?? 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial?.dayOfWeek ?? 1);
  const [monthOfYear, setMonthOfYear] = useState<number | null>(initial?.monthOfYear ?? 1);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? isoToday());
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  // amountIsVariable: para servicios donde el monto cambia mes a mes
  // (luz/expensas/wifi). Cuando está activo, el monto cargado funciona como
  // estimado y cada mes generamos un gasto en estado "pendiente de
  // confirmar". Forzamos cuotas=1 porque no podemos repartir un monto
  // que todavía no conocemos.
  const [amountIsVariable, setAmountIsVariable] = useState(initial?.amountIsVariable ?? false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const amount = Number(amountStr.replace(",", "."));
    if (!description.trim() || !(amount > 0) || !paymentMethodId) {
      setErr("Completá descripción, monto y método de pago");
      setBusy(false);
      return;
    }
    const pm = paymentMethods?.find((p) => p.id === paymentMethodId);
    const effectiveInstallments = amountIsVariable || !pm?.allowsInstallments ? 1 : installments;
    const body: RecurringExpenseInput = {
      categoryId: categoryId || null,
      paymentMethodId,
      amount,
      currency,
      description: description.trim(),
      // Variable o método sin cuotas → siempre 1. Evita mandar cuotas>1
      // si el usuario seteó cuotas con crédito y después cambió a débito.
      installments: effectiveInstallments,
      isShared: false,
      frequency,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonth,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      startsAt,
      endsAt: endsAt || null,
      amountIsVariable,
    };
    try {
      if (initial) await patchRecurringExpense(initial.id, body);
      else await createRecurringExpense(body);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{initial ? "Editar gasto fijo" : "Nuevo gasto fijo"}</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-3" />
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" placeholder="Netflix" />
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1.5">
            <Label>{amountIsVariable ? "Monto estimado" : "Monto"}</Label>
            <Input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start justify-between gap-3 rounded-xl border bg-muted/40 p-3">
          <div className="flex-1">
            <Label htmlFor="amountIsVariable" className="text-[13px] font-medium">
              Importe variable
            </Label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Activá esto si el monto cambia mes a mes (luz, expensas, wifi).
              Cada mes vas a confirmar la factura real.
            </p>
          </div>
          <Switch
            id="amountIsVariable"
            checked={amountIsVariable}
            onCheckedChange={setAmountIsVariable}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría">
                  {(v: string | null) => (v ? (categories?.find((c) => c.id === v)?.name ?? "Sin categoría") : "Sin categoría")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categoría</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir">
                  {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Elegir") : "Elegir")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Elegir</SelectItem>
                {paymentMethods?.filter((p) => p.isActive).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!amountIsVariable
          && paymentMethods?.find((p) => p.id === paymentMethodId)?.allowsInstallments && (
          <div className="space-y-1.5">
            <Label>Cuotas por cargo</Label>
            <Input
              type="number"
              min={1}
              value={installments}
              onChange={(e) => setInstallments(Math.max(1, Number(e.target.value) || 1))}
              className="h-9 w-24"
            />
            <p className="text-[11px] text-muted-foreground">
              Cada vez que se genere el gasto se divide en N cuotas (solo crédito).
            </p>
          </div>
        )}

        <FrequencyFields
          frequency={frequency}
          setFrequency={setFrequency}
          dayOfMonth={dayOfMonth}
          setDayOfMonth={setDayOfMonth}
          dayOfWeek={dayOfWeek}
          setDayOfWeek={setDayOfWeek}
          monthOfYear={monthOfYear}
          setMonthOfYear={setMonthOfYear}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <DatePicker value={startsAt} onChange={setStartsAt} />
          </div>
          <div className="space-y-1.5">
            <Label>Hasta (opcional)</Label>
            <DatePicker value={endsAt} onChange={setEndsAt} placeholder="Sin fecha fin" />
          </div>
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} size="sm" className="flex-1" disabled={busy}>
              Cancelar
            </Button>
          )}
          <Button onClick={save} size="sm" className="flex-1" disabled={busy}>
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecurringIncomeForm({
  initial,
  onDone,
  onCancel,
}: {
  initial?: RecurringIncome;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const currentHouseholdId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHouseholdId) ?? households?.[0];
  const baseCurrency = (household?.baseCurrency ?? "ARS") as Currency;
  const { data: paymentMethods } = usePaymentMethods();

  const [description, setDescription] = useState(initial?.description ?? "");
  const [source, setSource] = useState(initial?.source ?? "salary");
  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>((initial?.currency as Currency) ?? baseCurrency);
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? "");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">(initial?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initial?.dayOfMonth ?? 1);
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial?.dayOfWeek ?? 1);
  const [monthOfYear, setMonthOfYear] = useState<number | null>(initial?.monthOfYear ?? 1);
  const [startsAt, setStartsAt] = useState(initial?.startsAt ?? isoToday());
  const [endsAt, setEndsAt] = useState(initial?.endsAt ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setErr(null);
    const amount = Number(amountStr.replace(",", "."));
    if (!(amount > 0) || !source.trim()) {
      setErr("Completá monto y fuente");
      setBusy(false);
      return;
    }
    const body: RecurringIncomeInput = {
      paymentMethodId: paymentMethodId || null,
      amount,
      currency,
      description: description.trim() || undefined,
      source: source.trim(),
      frequency,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonth,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      startsAt,
      endsAt: endsAt || null,
    };
    try {
      if (initial) await patchRecurringIncome(initial.id, body);
      else await createRecurringIncome(body);
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold">{initial ? "Editar ingreso fijo" : "Nuevo ingreso fijo"}</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="size-3" />
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Fuente</Label>
            <Select
              value={(INCOME_SOURCES as readonly string[]).includes(source) ? source : "other"}
              onValueChange={(v) => setSource(v || "other")}
            >
              <SelectTrigger>
                <SelectValue>
                  {(v: string | null) => (v ? incomeSourceLabel(v) : "")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {INCOME_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>{incomeSourceLabel(s)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" placeholder="Sueldo" />
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto] gap-2">
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <Input inputMode="decimal" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} className="h-9 font-mono" />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cuenta destino (opcional)</Label>
          <Select value={paymentMethodId} onValueChange={(v) => setPaymentMethodId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Sin especificar">
                {(v: string | null) => (v ? (paymentMethods?.find((p) => p.id === v)?.name ?? "Sin especificar") : "Sin especificar")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Sin especificar</SelectItem>
              {paymentMethods?.filter((p) => p.isActive).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <FrequencyFields
          frequency={frequency}
          setFrequency={setFrequency}
          dayOfMonth={dayOfMonth}
          setDayOfMonth={setDayOfMonth}
          dayOfWeek={dayOfWeek}
          setDayOfWeek={setDayOfWeek}
          monthOfYear={monthOfYear}
          setMonthOfYear={setMonthOfYear}
        />

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Desde</Label>
            <DatePicker value={startsAt} onChange={setStartsAt} />
          </div>
          <div className="space-y-1.5">
            <Label>Hasta (opcional)</Label>
            <DatePicker value={endsAt} onChange={setEndsAt} placeholder="Sin fecha fin" />
          </div>
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} size="sm" className="flex-1" disabled={busy}>
              Cancelar
            </Button>
          )}
          <Button onClick={save} size="sm" className="flex-1" disabled={busy}>
            {busy ? "Guardando…" : initial ? "Guardar cambios" : "Crear"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
