"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Plus, Trash2, Pause, Play, Loader2, Target, PiggyBank, Wallet, LineChart, Calendar } from "lucide-react";
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
  useGoalProgress,
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
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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
                  <GoalProgressButton goalId={p.goal.id} goalName={p.goal.goalType === "category_limit" ? catName(p.goal.categoryId) : meta.label} />
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

function GoalProgressButton({ goalId, goalName }: { goalId: string; goalName: string }) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<string>("");
  const { data, isLoading, error } = useGoalProgress(open ? goalId : null, at || undefined);
  const s = data ? STATUS_META[data.status] : null;
  const pct = data ? Math.max(0, Math.min(100, data.percent)) : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="ghost" />}>
        <LineChart className="mr-1 size-3.5" />
        Detalle
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate">{goalName}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="progress-at" className="flex items-center gap-1 text-xs">
              <Calendar className="size-3" />
              Progreso a la fecha
            </Label>
            <Input
              id="progress-at"
              type="date"
              value={at}
              onChange={(e) => setAt(e.target.value)}
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Dejá vacío para ver progreso de hoy.
            </p>
          </div>

          {isLoading && <Skeleton className="h-32 w-full rounded-lg" />}

          {error && !isLoading && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              No se pudo cargar el progreso.
            </div>
          )}

          {data && s && (
            <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4">
              <div className="flex items-center justify-between">
                <Badge
                  variant="outline"
                  className={cn("h-5 px-1.5 text-[10px] border-transparent", s.className)}
                >
                  {s.label}
                </Badge>
                <span className="font-mono text-xs font-bold">{pct.toFixed(1)}%</span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-background">
                <div
                  className={cn("h-full rounded-full transition-all", s.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Actual</div>
                  <div className="mt-0.5 font-mono text-sm font-bold">
                    {fmtMoney(data.currentAmount, data.goal.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Objetivo</div>
                  <div className="mt-0.5 font-mono text-sm font-bold">
                    {fmtMoney(data.targetAmount, data.goal.currency)}
                  </div>
                </div>
                <div className="col-span-2 border-t border-border pt-2">
                  <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Período</div>
                  <div className="mt-0.5 font-mono text-xs">
                    {data.periodStart} → {data.periodEnd}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                <Select value={goalType} onValueChange={(v) => setGoalType(v as Goal["goalType"])}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="total_limit">Límite total</SelectItem>
                    <SelectItem value="category_limit">Límite por categoría</SelectItem>
                    <SelectItem value="savings">Ahorro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Alcance</Label>
                <Select value={scope} onValueChange={(v) => setScope(v as "household" | "user")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="household">Hogar</SelectItem>
                    <SelectItem value="user">Usuario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {scope === "user" && (
                <div>
                  <Label>Miembro</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Seleccionar</SelectItem>
                      {members?.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {m.userId === me?.id ? "Yo" : `${m.firstName} ${m.lastName}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {goalType === "category_limit" && (
            <div>
              <Label>Categoría</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Seleccionar</SelectItem>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">ARS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                </SelectContent>
              </Select>
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
