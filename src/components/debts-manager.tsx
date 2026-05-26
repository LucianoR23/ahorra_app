"use client";

import { useMemo, useState } from "react";
import { mutate as swrMutate } from "swr";
import { ArrowRight, TrendingDown, TrendingUp, Trash2, Loader2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useBalances,
  useBalancesMe,
  useSettlements,
  useSettlement,
  useHouseholdMembers,
  useHouseholds,
} from "@/lib/api/hooks";
import { createSettlement, deleteSettlement } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { fmtMoney, fmtDateShort, isoToday } from "@/lib/format";
import { ApiError } from "@/lib/api/errors";
import { confirm } from "@/lib/confirm";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

function invalidateDebts() {
  swrMutate(
    (k) =>
      Array.isArray(k) &&
      typeof k[0] === "string" &&
      (k[0].startsWith("/balances") || k[0].startsWith("/settlements")),
    undefined,
    { revalidate: true },
  );
}

export function DebtsManager() {
  const me = useAuthStore((s) => s.user);
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const household = households?.find((h) => h.id === currentHhId) ?? null;
  const baseCurrency = household?.baseCurrency ?? "ARS";

  const { data: balances, isLoading: balLoading } = useBalances();
  const { data: meBal, isLoading: meLoading } = useBalancesMe();
  const { data: members } = useHouseholdMembers();

  // Filtros del historial. "withUser" = OR (from o to), 'datePreset' resuelve
  // a from/to ISO via computeRange().
  const [withUserId, setWithUserId] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState<string>("");
  const [customTo, setCustomTo] = useState<string>("");
  const [singleDay, setSingleDay] = useState<string>("");

  const dateRange = useMemo(
    () => computeRange(datePreset, customFrom, customTo, singleDay),
    [datePreset, customFrom, customTo, singleDay],
  );

  const { data: settlements, isLoading: sLoading } = useSettlements({
    limit: 50,
    withUser: withUserId || undefined,
    from: dateRange.from,
    to: dateRange.to,
  });

  const memberName = (id: string) => {
    if (id === me?.id) return "Yo";
    const m = members?.find((x) => x.userId === id);
    return m ? `${m.firstName} ${m.lastName[0] ?? ""}.` : "—";
  };

  const net = meBal?.net ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Mi balance neto */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4">
          <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            Mi balance neto
          </div>
          {meLoading ? (
            <Skeleton className="mt-2 h-9 w-40" />
          ) : (
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={cn(
                  "font-mono text-3xl font-extrabold tracking-tight",
                  net > 0 ? "text-emerald-500" : net < 0 ? "text-destructive" : "text-foreground",
                )}
              >
                {net > 0 ? "+" : ""}
                {fmtMoney(net, baseCurrency)}
              </span>
              {net > 0 && <TrendingUp className="size-5 text-emerald-500" />}
              {net < 0 && <TrendingDown className="size-5 text-destructive" />}
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {net > 0
              ? "Te deben netos en total."
              : net < 0
                ? "Debés netos en total."
                : "Estás en cero."}
          </p>
        </CardContent>
      </Card>

      {/* Deudas — matriz */}
      <div>
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-sm font-bold">Deudas actuales</h2>
          {balances && (
            <span className="text-[12px] text-muted-foreground">
              {balances.balances.length} pendiente{balances.balances.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        <Card className="rounded-2xl border-0 shadow-card overflow-hidden">
          {balLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-14 w-full rounded-md" />
              <Skeleton className="h-14 w-full rounded-md" />
            </div>
          ) : !balances?.balances.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Todo saldado. No hay deudas pendientes.
            </div>
          ) : (
            balances.balances.map((b, i) => {
              const isLast = i === balances.balances.length - 1;
              const isMeFrom = b.from === me?.id;
              const isMeTo = b.to === me?.id;
              return (
                <div
                  key={`${b.from}-${b.to}`}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    !isLast && "border-b border-border",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className={cn("font-semibold", isMeFrom && "text-destructive")}>
                        {memberName(b.from)}
                      </span>
                      <ArrowRight className="size-3.5 text-muted-foreground" />
                      <span className={cn("font-semibold", isMeTo && "text-emerald-500")}>
                        {memberName(b.to)}
                      </span>
                    </div>
                    <div className="mt-0.5 font-mono text-base font-bold tracking-tight">
                      {fmtMoney(b.amount, baseCurrency)}
                    </div>
                  </div>
                  {(isMeFrom || isMeTo) && (
                    <PayDebtDialog
                      fromUser={b.from}
                      toUser={b.to}
                      maxAmount={b.amount}
                      fromLabel={memberName(b.from)}
                      toLabel={memberName(b.to)}
                      baseCurrency={baseCurrency}
                    />
                  )}
                </div>
              );
            })
          )}
        </Card>
      </div>

      {/* Historial */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-bold">Historial de pagos</h2>
          {(withUserId || datePreset !== "all") && (
            <button
              type="button"
              onClick={() => {
                setWithUserId("");
                setDatePreset("all");
                setCustomFrom("");
                setCustomTo("");
                setSingleDay("");
              }}
              className="cursor-pointer text-[11px] font-semibold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Filtros */}
        <Card className="mb-2 rounded-2xl border-0 shadow-card">
          <CardContent className="space-y-2 p-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <FilterChip active={withUserId === ""} onClick={() => setWithUserId("")}>
                Todos
              </FilterChip>
              {members?.map((m) => {
                const label = m.userId === me?.id ? "Yo" : `${m.firstName} ${m.lastName[0] ?? ""}.`;
                return (
                  <FilterChip
                    key={m.userId}
                    active={withUserId === m.userId}
                    onClick={() => setWithUserId(m.userId)}
                  >
                    {label}
                  </FilterChip>
                );
              })}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={datePreset} onValueChange={(v) => setDatePreset((v as DatePreset) ?? "all")}>
                <SelectTrigger className="text-xs">
                  <SelectValue>
                    {(v: string | null) => DATE_PRESET_LABELS[(v ?? "all") as DatePreset]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((k) => (
                    <SelectItem key={k} value={k}>{DATE_PRESET_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {datePreset === "day" && (
                <DatePicker value={singleDay} onChange={setSingleDay} placeholder="Día" />
              )}
              {datePreset === "range" && (
                <div className="flex flex-1 gap-2">
                  <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="Desde" />
                  <DatePicker value={customTo} onChange={setCustomTo} placeholder="Hasta" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-0 shadow-card overflow-hidden">
          {sLoading ? (
            <div className="p-3 space-y-2">
              <Skeleton className="h-12 w-full rounded-md" />
              <Skeleton className="h-12 w-full rounded-md" />
            </div>
          ) : !settlements?.items.length ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Aún no registraste pagos.
            </div>
          ) : (
            settlements.items.map((s, i) => {
              const isLast = i === settlements.items.length - 1;
              return (
                <div
                  key={s.id}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3",
                    !isLast && "border-b border-border",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="truncate font-semibold">{memberName(s.fromUser)}</span>
                      <ArrowRight className="size-3 text-muted-foreground" />
                      <span className="truncate font-semibold">{memberName(s.toUser)}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {fmtDateShort(s.paidAt)}
                      {s.note ? ` · ${s.note}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold">
                      {fmtMoney(s.amount, s.baseCurrency)}
                    </div>
                  </div>
                  <SettlementDetailButton id={s.id} fromLabel={memberName(s.fromUser)} toLabel={memberName(s.toUser)} />
                  <DeleteSettlementButton id={s.id} />
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

type DatePreset = "all" | "this_month" | "last_month" | "last_30" | "last_90" | "year" | "day" | "range";

const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  all: "Todo el período",
  this_month: "Este mes",
  last_month: "Mes pasado",
  last_30: "Últimos 30 días",
  last_90: "Últimos 90 días",
  year: "Este año",
  day: "Día específico",
  range: "Rango personalizado",
};

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function computeRange(
  preset: DatePreset,
  customFrom: string,
  customTo: string,
  singleDay: string,
): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case "all":
      return {};
    case "this_month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: toIso(from), to: toIso(to) };
    }
    case "last_month": {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: toIso(from), to: toIso(to) };
    }
    case "last_30": {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { from: toIso(from), to: toIso(now) };
    }
    case "last_90": {
      const from = new Date(now);
      from.setDate(from.getDate() - 90);
      return { from: toIso(from), to: toIso(now) };
    }
    case "year": {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      return { from: toIso(from), to: toIso(to) };
    }
    case "day":
      return singleDay ? { from: singleDay, to: singleDay } : {};
    case "range":
      return {
        from: customFrom || undefined,
        to: customTo || undefined,
      };
  }
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center rounded-full border px-3 py-1 text-[11px] font-semibold transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-primary"
          : "border-border bg-card text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function PayDebtDialog({
  fromUser,
  toUser,
  maxAmount,
  fromLabel,
  toLabel,
  baseCurrency,
}: {
  fromUser: string;
  toUser: string;
  maxAmount: number;
  fromLabel: string;
  toLabel: string;
  baseCurrency: string;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(isoToday());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(amount);
  const invalid =
    !Number.isFinite(amountNum) ||
    amountNum <= 0 ||
    amountNum > maxAmount + 0.005;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setErr(null);
    setSaving(true);
    try {
      await createSettlement({
        fromUser,
        toUser,
        amount: Number(amountNum.toFixed(2)),
        note: note.trim() || undefined,
        paidAt,
      });
      invalidateDebts();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (next) {
        setAmount(maxAmount.toFixed(2));
        setNote("");
        setPaidAt(isoToday());
        setErr(null);
      }
    }}>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>Pagar</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="rounded-md bg-muted/60 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">De</span>
              <span className="font-semibold">{fromLabel}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Para</span>
              <span className="font-semibold">{toLabel}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Deuda actual</span>
              <span className="font-mono font-semibold">
                {fmtMoney(maxAmount, baseCurrency)}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="pay-amount">Monto</Label>
            <Input
              id="pay-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
            {amountNum > maxAmount + 0.005 && (
              <p className="mt-1 text-xs text-destructive">
                No podés pagar más que la deuda actual.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="pay-date">Fecha</Label>
              <DatePicker value={paidAt} onChange={setPaidAt} />
            </div>
            <div>
              <Label htmlFor="pay-note">Nota</Label>
              <Input
                id="pay-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Opcional"
              />
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
              Confirmar pago
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SettlementDetailButton({
  id,
  fromLabel,
  toLabel,
}: {
  id: string;
  fromLabel: string;
  toLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useSettlement(open ? id : null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Ver detalle del pago"
            className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          />
        }
      >
        <Eye className="size-3.5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Detalle del pago</DialogTitle>
        </DialogHeader>

        {isLoading && <Skeleton className="h-32 w-full rounded-lg" />}

        {error && !isLoading && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
            No se pudo cargar el detalle.
          </div>
        )}

        {data && (
          <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-center gap-2 text-base font-semibold">
              <span className="truncate">{fromLabel}</span>
              <ArrowRight className="size-4 text-muted-foreground" />
              <span className="truncate">{toLabel}</span>
            </div>

            <div className="text-center">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Monto</div>
              <div className="mt-0.5 font-mono text-2xl font-bold tracking-tight">
                {fmtMoney(data.amount, data.baseCurrency)}
              </div>
              <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">
                {data.baseCurrency}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pagado</div>
                <div className="mt-0.5">{fmtDateShort(data.paidAt)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Registrado</div>
                <div className="mt-0.5">
                  {new Date(data.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
              </div>
            </div>

            {data.note && (
              <div className="border-t border-border pt-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Nota</div>
                <p className="mt-1 whitespace-pre-wrap text-xs">{data.note}</p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ID</div>
              <code className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                {data.id}
              </code>
            </div>
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="ghost" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteSettlementButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function handleClick() {
    const ok = await confirm({
      title: "¿Eliminar este pago?",
      description: "La deuda se restaurará.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteSettlement(id);
      invalidateDebts();
    } catch {
      /* noop */
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label="Eliminar pago"
      className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

