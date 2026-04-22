"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Repeat, Trash2, Pause, Play, Edit3, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useHouseholdStore } from "@/stores/household";
import { fmtMoney, isoToday } from "@/lib/format";
import type { Currency, RecurringExpense, RecurringIncome } from "@/lib/api/schemas";
import { cn } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
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
    const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
    return `Cada ${days[r.dayOfWeek ?? 1]}`;
  }
  if (r.frequency === "monthly") return `Día ${r.dayOfMonth ?? 1} del mes`;
  if (r.frequency === "yearly") {
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${r.dayOfMonth ?? 1} de ${months[(r.monthOfYear ?? 1) - 1]}`;
  }
  return r.frequency;
}

function RecurringExpenseCard({ rec, onChanged }: { rec: RecurringExpense; onChanged: () => void }) {
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const cat = categories?.find((c) => c.id === rec.categoryId);
  const pm = paymentMethods?.find((p) => p.id === rec.paymentMethodId);

  async function onToggle() {
    setBusy(true);
    try {
      await toggleRecurringExpense(rec.id, !rec.isActive);
      onChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este gasto fijo? Los gastos ya generados no se eliminan.")) return;
    setBusy(true);
    try {
      await deleteRecurringExpense(rec.id);
      onChanged();
    } catch (e) {
      setBusy(false);
      alert(e instanceof ApiError ? e.message : "Error");
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
              {!rec.isActive && <Badge variant="outline" className="text-[9px]">Pausado</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {cat?.name ?? "Sin categoría"} · {pm?.name ?? "—"} · {frequencyLabel(rec)}
            </div>
          </div>
          <div className="shrink-0 text-right font-mono text-sm font-bold">
            {fmtMoney(rec.amount, rec.currency, { decimals: 0 })}
            {rec.installments > 1 && <div className="text-[10px] text-muted-foreground">en {rec.installments}c</div>}
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

function RecurringIncomeCard({ rec, onChanged }: { rec: RecurringIncome; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onToggle() {
    setBusy(true);
    try {
      await toggleRecurringIncome(rec.id, !rec.isActive);
      onChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este ingreso fijo?")) return;
    setBusy(true);
    try {
      await deleteRecurringIncome(rec.id);
      onChanged();
    } catch (e) {
      setBusy(false);
      alert(e instanceof ApiError ? e.message : "Error");
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
              {rec.source} · {frequencyLabel(rec)}
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
        <Select value={String(dayOfWeek ?? 1)} onValueChange={(v) => setDayOfWeek(Number(v))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"].map((d, i) => (
              <SelectItem key={i} value={String(i)}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {frequency === "monthly" && (
        <Input
          type="number"
          min={1}
          max={31}
          value={dayOfMonth ?? 1}
          onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
          className="h-9"
          placeholder="Día del mes"
        />
      )}

      {frequency === "yearly" && (
        <div className="grid grid-cols-2 gap-2">
          <Select value={String(monthOfYear ?? 1)} onValueChange={(v) => setMonthOfYear(Number(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={1}
            max={31}
            value={dayOfMonth ?? 1}
            onChange={(e) => setDayOfMonth(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
            className="h-9"
            placeholder="Día"
          />
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
    const body: RecurringExpenseInput = {
      categoryId: categoryId || null,
      paymentMethodId,
      amount,
      currency,
      description: description.trim(),
      installments,
      isShared: false,
      frequency,
      dayOfMonth: frequency === "weekly" ? null : dayOfMonth,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      monthOfYear: frequency === "yearly" ? monthOfYear : null,
      startsAt,
      endsAt: endsAt || null,
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

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categoría</SelectItem>
                {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Método de pago</Label>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger>
                <SelectValue placeholder="Elegir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Elegir</SelectItem>
                {paymentMethods?.filter((p) => p.isActive).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Cuotas</Label>
          <Input
            type="number"
            min={1}
            value={installments}
            onChange={(e) => setInstallments(Math.max(1, Number(e.target.value) || 1))}
            className="h-9 w-24"
          />
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
  const [source, setSource] = useState(initial?.source ?? "salario");
  const [amountStr, setAmountStr] = useState(initial ? String(initial.amount) : "");
  const [currency, setCurrency] = useState<Currency>((initial?.currency as Currency) ?? baseCurrency);
  const [paymentMethodId, setPaymentMethodId] = useState(initial?.paymentMethodId ?? "");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">(initial?.frequency ?? "monthly");
  const [dayOfMonth, setDayOfMonth] = useState<number | null>(initial?.dayOfMonth ?? 5);
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
            <Input value={source} onChange={(e) => setSource(e.target.value)} className="h-9" placeholder="salario" />
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
          <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
            <SelectTrigger>
              <SelectValue placeholder="Sin especificar" />
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
