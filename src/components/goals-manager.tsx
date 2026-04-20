"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Trash2, Pause, Play, Loader2, Target, PiggyBank, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useGoalsProgress,
  useCategories,
  useHouseholdMembers,
  useHouseholds,
} from "@/lib/api/hooks";
import {
  createGoal,
  patchGoal,
  toggleGoal,
  deleteGoal,
  type GoalCreateInput,
} from "@/lib/api/mutations";
import type { Goal, GoalProgress, Currency } from "@/lib/api/schemas";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { fmtMoney } from "@/lib/format";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-input/20 px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 dark:bg-input/30";

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

const STATUS_META: Record<
  GoalProgress["status"],
  { label: string; className: string; bar: string }
> = {
  on_track: { label: "En camino", className: "bg-emerald-500/15 text-emerald-500", bar: "bg-emerald-500" },
  warning: { label: "Atención", className: "bg-amber-500/15 text-amber-500", bar: "bg-amber-500" },
  exceeded: { label: "Excedido", className: "bg-destructive/15 text-destructive", bar: "bg-destructive" },
  achieved: { label: "Logrado", className: "bg-primary/15 text-primary", bar: "bg-primary" },
};

export function GoalsManager() {
  const { data: progress, isLoading } = useGoalsProgress();
  const { data: categories } = useCategories();
  const { data: members } = useHouseholdMembers();
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHhId);
  const baseCurrency = (household?.baseCurrency ?? "ARS") as Currency;
  const me = useAuthStore((s) => s.user);

  const catName = (id?: string | null) =>
    id ? categories?.find((c) => c.id === id)?.name ?? "Categoría" : "—";
  const memberName = (id?: string | null) => {
    if (!id) return "Hogar";
    if (id === me?.id) return "Yo";
    const m = members?.find((x) => x.userId === id);
    return m ? `${m.firstName} ${m.lastName[0] ?? ""}.` : "—";
  };

  const [editing, setEditing] = useState<Goal | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {progress ? `${progress.length} objetivo${progress.length === 1 ? "" : "s"}` : ""}
        </div>
        <GoalFormDialog
          mode="create"
          baseCurrency={baseCurrency}
          onDone={invalidateGoals}
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : !progress?.length ? (
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Todavía no hay objetivos. Creá uno para seguir tu progreso.
          </CardContent>
        </Card>
      ) : (
        progress.map((p) => {
          const meta = TYPE_META[p.goal.goalType];
          const Icon = meta.icon;
          const s = STATUS_META[p.status];
          const pct = Math.max(0, Math.min(100, p.percent));
          return (
            <Card key={p.goal.id} className="rounded-2xl border-0 shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-bold">
                        {p.goal.goalType === "category_limit"
                          ? catName(p.goal.categoryId)
                          : meta.label}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("h-5 px-1.5 text-[10px]", s.className, "border-transparent")}
                      >
                        {s.label}
                      </Badge>
                      {!p.goal.isActive && (
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                          Pausado
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {memberName(p.goal.userId)} · {p.goal.period === "monthly" ? "Mensual" : "Anual"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(p.goal)}
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Editar
                  </button>
                </div>

                <div className="mt-3 flex items-baseline justify-between text-sm">
                  <span className="font-mono font-bold">
                    {fmtMoney(p.currentAmount, p.goal.currency)}
                  </span>
                  <span className="text-muted-foreground">
                    de <span className="font-semibold text-foreground">{fmtMoney(p.targetAmount, p.goal.currency)}</span>
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full transition-all", s.bar)}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{pct.toFixed(0)}%</span>
                  <span>
                    {p.periodStart} → {p.periodEnd}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      try {
                        await toggleGoal(p.goal.id, !p.goal.isActive);
                        invalidateGoals();
                      } catch (e) {
                        alert(e instanceof ApiError ? e.message : "Error");
                      }
                    }}
                  >
                    {p.goal.isActive ? (
                      <>
                        <Pause className="mr-1 size-3.5" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="mr-1 size-3.5" /> Activar
                      </>
                    )}
                  </Button>
                  <DeleteGoalButton id={p.goal.id} />
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {editing && (
        <GoalFormDialog
          mode="edit"
          goal={editing}
          baseCurrency={baseCurrency}
          open
          onOpenChange={(v) => !v && setEditing(null)}
          onDone={() => {
            invalidateGoals();
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DeleteGoalButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    if (!confirm("¿Eliminar este objetivo?")) return;
    setBusy(true);
    try {
      await deleteGoal(id);
      invalidateGoals();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button size="sm" variant="ghost" onClick={handle} disabled={busy}>
      {busy ? (
        <Loader2 className="mr-1 size-3.5 animate-spin" />
      ) : (
        <Trash2 className="mr-1 size-3.5" />
      )}
      Eliminar
    </Button>
  );
}

function GoalFormDialog({
  mode,
  goal,
  baseCurrency,
  open: controlledOpen,
  onOpenChange,
  onDone,
}: {
  mode: "create" | "edit";
  goal?: Goal;
  baseCurrency: Currency;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onDone: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const me = useAuthStore((s) => s.user);
  const { data: categories } = useCategories();
  const { data: members } = useHouseholdMembers();

  const [scope, setScope] = useState<"household" | "user">(goal?.scope ?? "household");
  const [userId, setUserId] = useState<string>(goal?.userId ?? me?.id ?? "");
  const [goalType, setGoalType] = useState<Goal["goalType"]>(goal?.goalType ?? "total_limit");
  const [categoryId, setCategoryId] = useState<string>(goal?.categoryId ?? "");
  const [targetAmount, setTargetAmount] = useState<string>(goal?.targetAmount.toString() ?? "");
  const [currency, setCurrency] = useState<Currency>((goal?.currency as Currency) ?? baseCurrency);
  const [period, setPeriod] = useState<"monthly" | "yearly">(goal?.period ?? "monthly");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(targetAmount);
  const invalid =
    !Number.isFinite(amountNum) ||
    amountNum <= 0 ||
    (goalType === "category_limit" && !categoryId) ||
    (scope === "user" && !userId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setErr(null);
    setSaving(true);
    try {
      if (mode === "create") {
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
      } else if (goal) {
        await patchGoal(goal.id, {
          categoryId: goal.goalType === "category_limit" ? categoryId : undefined,
          targetAmount: amountNum,
          currency,
          period,
        });
      }
      onDone();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" && (
        <DialogTrigger render={<Button size="sm" />}>
          <Plus className="mr-1 size-3.5" />
          Nuevo objetivo
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo objetivo" : "Editar objetivo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === "create" && (
            <>
              <div>
                <Label>Tipo</Label>
                <select
                  className={selectClass}
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value as Goal["goalType"])}
                >
                  <option value="total_limit">Límite total</option>
                  <option value="category_limit">Límite por categoría</option>
                  <option value="savings">Ahorro</option>
                </select>
              </div>
              <div>
                <Label>Alcance</Label>
                <select
                  className={selectClass}
                  value={scope}
                  onChange={(e) => setScope(e.target.value as "household" | "user")}
                >
                  <option value="household">Hogar</option>
                  <option value="user">Usuario</option>
                </select>
              </div>
              {scope === "user" && (
                <div>
                  <Label>Miembro</Label>
                  <select
                    className={selectClass}
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                  >
                    <option value="">Seleccionar</option>
                    {members?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userId === me?.id ? "Yo" : `${m.firstName} ${m.lastName}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {goalType === "category_limit" && (
            <div>
              <Label>Categoría</Label>
              <select
                className={selectClass}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Seleccionar</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="goal-amount">Monto</Label>
              <Input
                id="goal-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
              />
            </div>
            <div>
              <Label>Moneda</Label>
              <select
                className={selectClass}
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <Label>Período</Label>
            <div className="flex gap-1.5">
              {(["monthly", "yearly"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "flex-1 rounded-md px-2 py-2 text-xs font-semibold transition-colors",
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/70",
                  )}
                >
                  {p === "monthly" ? "Mensual" : "Anual"}
                </button>
              ))}
            </div>
          </div>

          {err && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {err}
            </div>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={invalid || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
