"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { PiggyBank, Plus, Target, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Money } from "@/components/ui/money";
import { PageHeader } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CategorySelect } from "@/components/category-select";
import { useCategories, useGoalProgress, useGoalsProgress, useHouseholdMembers, useHouseholds } from "@/lib/api/hooks";
import { createGoal, deleteGoal, patchGoal, toggleGoal, type GoalCreateInput } from "@/lib/api/mutations";
import type { Currency, Goal, GoalProgress } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { confirm } from "@/lib/confirm";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

function invalidateGoals() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/goals"),
    undefined,
    { revalidate: true },
  );
}

const TYPE_META: Record<Goal["goalType"], { label: string; icon: typeof Target }> = {
  category_limit: { label: "Límite por categoría", icon: Wallet },
  total_limit: { label: "Límite total", icon: Target },
  savings: { label: "Ahorro", icon: PiggyBank },
};

const STATUS_META: Record<GoalProgress["status"], { label: string; badge: string; text: string; bar: string }> = {
  ok: { label: "En camino", badge: "bg-positive/12 text-positive", text: "text-positive", bar: "bg-positive" },
  warning: { label: "Atención", badge: "bg-warn/12 text-warn", text: "text-warn", bar: "bg-warn" },
  exceeded: { label: "Excedido", badge: "bg-negative-soft text-negative", text: "text-negative", bar: "bg-negative" },
};

const CURRENCIES = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
  { value: "EUR", label: "EUR" },
] as const;

const PERIODS = [
  { value: "monthly", label: "Mensual" },
  { value: "weekly", label: "Semanal" },
] as const;

/** "31/3" */
function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)}/${Number(m)}`;
}

/**
 * Presupuestos y objetivos (plan 1.10b, no design: cards with the progress
 * bar, create and edit in the sheet). Tapping a goal opens its sheet, where
 * it is edited, paused, checked at another date or deleted.
 */
export function GoalsManager({ help }: { help?: React.ReactNode }) {
  const { data: progress, isLoading } = useGoalsProgress();
  const { data: categories } = useCategories();
  const { data: members } = useHouseholdMembers();
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const baseCurrency = (households?.find((h) => h.id === currentHhId)?.baseCurrency ?? "ARS") as Currency;
  const me = useAuthStore((s) => s.user);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);

  const shared = (members?.length ?? 0) > 1;
  const goalName = (g: Goal) =>
    g.goalType === "category_limit"
      ? (categories?.find((c) => c.id === g.categoryId)?.name ?? "Categoría")
      : TYPE_META[g.goalType].label;
  const whose = (id?: string | null) => {
    if (!id) return shared ? "Todo el hogar" : "";
    if (id === me?.id) return "Vos";
    return members?.find((x) => x.userId === id)?.firstName ?? "";
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 pb-4">
      <PageHeader
        title="Presupuestos y objetivos"
        description="Topes de gasto y metas de ahorro, con lo que llevás en el período."
        className="mb-0"
        action={
          <div className="flex items-center gap-2">
            {help}
            <Button size="icon" aria-label="Nuevo objetivo" onClick={() => setCreating(true)}>
              <Plus aria-hidden strokeWidth={2} />
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      ) : !progress?.length ? (
        <EmptyState
          icon={Target}
          title="Todavía no tenés objetivos"
          description="Poné un tope de gasto o una meta de ahorro y seguí cómo vas."
          action={
            <Button variant="outline" onClick={() => setCreating(true)}>
              Crear objetivo
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {progress.map((p) => (
            <li key={p.goal.id}>
              <GoalCard
                progress={p}
                name={goalName(p.goal)}
                whose={whose(p.goal.userId)}
                onOpen={() => setEditing(p.goal)}
              />
            </li>
          ))}
        </ul>
      )}

      {creating && <GoalSheet baseCurrency={baseCurrency} onOpenChange={setCreating} />}
      {editing && (
        <GoalSheet
          key={editing.id}
          goal={editing}
          name={goalName(editing)}
          baseCurrency={baseCurrency}
          onOpenChange={(v) => !v && setEditing(null)}
        />
      )}
    </div>
  );
}

function GoalCard({
  progress: p,
  name,
  whose,
  onOpen,
}: {
  progress: GoalProgress;
  name: string;
  whose: string;
  onOpen: () => void;
}) {
  const Icon = TYPE_META[p.goal.goalType].icon;
  const s = STATUS_META[p.status];
  const pct = Math.max(0, Math.min(100, p.percent));
  return (
    <Card className={cn("py-0", !p.goal.isActive && "opacity-70")}>
      <button
        type="button"
        aria-label={`Editar ${name}`}
        onClick={onOpen}
        className="flex w-full cursor-pointer flex-col gap-3 rounded-xl px-5 py-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <span className="flex w-full items-center gap-3">
          <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
            <Icon className="size-5" strokeWidth={1.75} />
          </span>
          <span className="block min-w-0 flex-1">
            <span className="block truncate text-body font-semibold text-ink">{name}</span>
            <span className="block truncate text-caption text-ink-muted">
              {[whose, p.goal.period === "monthly" ? "Mensual" : "Semanal"].filter(Boolean).join(" · ")}
            </span>
          </span>
          {p.goal.isActive ? (
            <Badge className={s.badge}>{s.label}</Badge>
          ) : (
            <Badge variant="secondary">Pausado</Badge>
          )}
        </span>

        <span className="flex w-full items-baseline justify-between gap-2 text-body">
          <Money amount={p.currentAmount} currency={p.baseCurrency} className="text-title font-bold text-ink" />
          <span className="text-ink-muted">
            de <Money amount={p.targetAmountBase} currency={p.baseCurrency} className="font-semibold text-ink" />
            {p.fxRate !== null && (
              <>
                {" "}(<Money amount={p.targetAmount} currency={p.goal.currency} />)
              </>
            )}
          </span>
        </span>

        <span className="block w-full">
          <span
            role="progressbar"
            aria-label={`Avance de ${name}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            className="block h-2 w-full overflow-hidden rounded-full bg-surface-2"
          >
            <span
              className={cn("block h-full rounded-full transition-[width] duration-(--duration-slow) motion-reduce:transition-none", s.bar)}
              style={{ width: `${pct}%` }}
            />
          </span>
          <span className="mt-1.5 flex justify-between text-caption text-ink-muted">
            <span>{pct.toFixed(0)}%</span>
            <span>
              {shortDate(p.periodStart)} al {shortDate(p.periodEnd)}
            </span>
          </span>
        </span>
        <FxNote progress={p} />
      </button>
    </Card>
  );
}

/**
 * A goal in another currency is measured against its target converted with
 * today's rate, so the percentage moves with the rate. Says so.
 */
function FxNote({ progress }: { progress: GoalProgress }) {
  if (progress.fxRate === null) return null;
  return (
    <span className="block text-caption text-ink-muted">
      Calculado con la cotización de hoy (1 {progress.goal.currency} ={" "}
      <Money amount={progress.fxRate} currency={progress.baseCurrency} />)
    </span>
  );
}

/** Progress at a past or future date, inside the goal's sheet. */
function ProgressAt({ goalId }: { goalId: string }) {
  const [at, setAt] = useState("");
  const { data, isLoading, error } = useGoalProgress(at ? goalId : null, at || undefined);
  const s = data ? STATUS_META[data.status] : null;
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-surface-2 p-4">
      <Label>Ver cómo iba a una fecha</Label>
      <DatePicker value={at} onChange={setAt} placeholder="Elegí una fecha" />
      {isLoading && <Skeleton className="h-6 w-full" />}
      {error && !isLoading && <p className="text-caption text-negative">No se pudo cargar el avance.</p>}
      {data && s && (
        <p className="text-body text-ink">
          <Money amount={data.currentAmount} currency={data.baseCurrency} className="font-semibold" /> de{" "}
          <Money amount={data.targetAmountBase} currency={data.baseCurrency} /> ·{" "}
          {Math.max(0, Math.min(100, data.percent)).toFixed(0)}% · <span className={cn("font-semibold", s.text)}>{s.label}</span>
        </p>
      )}
    </div>
  );
}

function GoalSheet({
  goal,
  name,
  baseCurrency,
  onOpenChange,
}: {
  goal?: Goal;
  name?: string;
  baseCurrency: Currency;
  onOpenChange: (v: boolean) => void;
}) {
  const me = useAuthStore((s) => s.user);
  const { data: categories } = useCategories();
  const { data: members } = useHouseholdMembers();
  const shared = (members?.length ?? 0) > 1;

  const [scope, setScope] = useState<"household" | "user">(goal?.scope ?? "household");
  const [userId, setUserId] = useState<string>(goal?.userId ?? me?.id ?? "");
  const [goalType, setGoalType] = useState<Goal["goalType"]>(goal?.goalType ?? "total_limit");
  const [categoryId, setCategoryId] = useState<string>(goal?.categoryId ?? "");
  const [targetAmount, setTargetAmount] = useState<string>(goal?.targetAmount.toString() ?? "");
  const [currency, setCurrency] = useState<Currency>((goal?.currency as Currency) ?? baseCurrency);
  const [period, setPeriod] = useState<"monthly" | "weekly">(goal?.period ?? "monthly");
  const [busy, setBusy] = useState<"save" | "toggle" | "delete" | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(targetAmount.replace(",", "."));
  const invalid =
    !Number.isFinite(amountNum) ||
    amountNum <= 0 ||
    (goalType === "category_limit" && !categoryId) ||
    (scope === "user" && !userId);
  const memberLabel = (uid: string) => {
    const m = members?.find((x) => x.userId === uid);
    if (!m) return "Elegí a quién";
    return m.userId === me?.id ? "Vos" : `${m.firstName} ${m.lastName}`;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setErr(null);
    setBusy("save");
    try {
      if (goal) {
        await patchGoal(goal.id, {
          categoryId: goal.goalType === "category_limit" ? categoryId : undefined,
          targetAmount: amountNum,
          currency,
          period,
        });
      } else {
        const body: GoalCreateInput = {
          scope,
          userId: scope === "user" ? userId : undefined,
          categoryId: goalType === "category_limit" ? categoryId : undefined,
          goalType,
          targetAmount: amountNum,
          currency,
          period,
        };
        await createGoal(body);
      }
      invalidateGoals();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
      setBusy(null);
    }
  }

  async function handleToggle() {
    if (!goal) return;
    setBusy("toggle");
    try {
      await toggleGoal(goal.id, !goal.isActive);
      invalidateGoals();
      toast.success(goal.isActive ? "Objetivo pausado" : "Objetivo activado");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo cambiar");
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!goal) return;
    const ok = await confirm({
      title: "¿Eliminar este objetivo?",
      description: "Tus gastos no cambian. Para frenarlo un tiempo, pausalo.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy("delete");
    try {
      await deleteGoal(goal.id);
      invalidateGoals();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "No se pudo eliminar");
      setBusy(null);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? name : "Nuevo objetivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!goal && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="goal-type">Tipo</Label>
              <Select value={goalType} onValueChange={(v) => setGoalType(v as Goal["goalType"])}>
                <SelectTrigger id="goal-type" className="w-full">
                  <SelectValue>{(v: unknown) => (v != null ? (TYPE_META[v as Goal["goalType"]]?.label ?? String(v)) : "")}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total_limit">Límite total</SelectItem>
                  <SelectItem value="category_limit">Límite por categoría</SelectItem>
                  <SelectItem value="savings">Ahorro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!goal && shared && (
            <div className="flex flex-col gap-1.5">
              <Label id="goal-scope">Para quién</Label>
              <Segmented
                aria-labelledby="goal-scope"
                value={scope}
                onValueChange={setScope}
                options={[
                  { value: "household", label: "Todo el hogar" },
                  { value: "user", label: "Una persona" },
                ]}
              />
              {scope === "user" && (
                <Select value={userId} onValueChange={(v) => setUserId(v ?? "")}>
                  <SelectTrigger aria-label="Persona" className="w-full">
                    <SelectValue placeholder="Elegí a quién">{(v: string | null) => (v ? memberLabel(v) : "Elegí a quién")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {members?.map((m) => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {memberLabel(m.userId)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {goalType === "category_limit" && (
            <div className="flex flex-col gap-1.5">
              <Label>Categoría</Label>
              <CategorySelect value={categoryId} onValueChange={setCategoryId} categories={categories} emptyLabel="Elegí una" className="w-full" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="goal-amount">Monto</Label>
            <div className="flex items-center gap-2">
              <Input
                id="goal-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="min-w-0 flex-1 tabular-nums"
              />
              <Segmented aria-label="Moneda" value={currency} onValueChange={setCurrency} options={CURRENCIES} className="w-auto shrink-0" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label id="goal-period">Período</Label>
            <Segmented aria-labelledby="goal-period" value={period} onValueChange={setPeriod} options={PERIODS} />
          </div>

          {err && (
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={invalid || busy !== null}>
            {busy === "save" ? "Guardando…" : goal ? "Guardar" : "Crear objetivo"}
          </Button>
        </form>

        {goal && (
          <>
            <ProgressAt goalId={goal.id} />
            <div className="flex flex-col items-center gap-1">
              <Button variant="secondary" className="w-full" onClick={handleToggle} disabled={busy !== null}>
                {goal.isActive ? "Pausar objetivo" : "Activar objetivo"}
              </Button>
              <Button
                variant="ghost"
                className="text-negative hover:bg-negative-soft hover:text-negative"
                onClick={handleDelete}
                disabled={busy !== null}
              >
                {busy === "delete" ? "Eliminando…" : "Eliminar objetivo"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
