"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { ArrowRight, TrendingDown, TrendingUp, Trash2, Loader2 } from "lucide-react";
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
  useHouseholdMembers,
  useHouseholds,
} from "@/lib/api/hooks";
import { createSettlement, deleteSettlement } from "@/lib/api/mutations";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";
import { fmtMoney, fmtDateShort, isoToday } from "@/lib/format";
import { ApiError } from "@/lib/api/errors";
import { cn } from "@/lib/utils";

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
  const { data: settlements, isLoading: sLoading } = useSettlements({ limit: 50 });

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
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
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
            <span className="text-[11px] text-muted-foreground">
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
        <h2 className="mb-2 px-1 text-sm font-bold">Historial de pagos</h2>
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
                    <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {fmtDateShort(s.paidAt)}
                      {s.note ? ` · ${s.note}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-sm font-semibold">
                      {fmtMoney(s.amount, s.baseCurrency)}
                    </div>
                  </div>
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
              <Input
                id="pay-date"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
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

function DeleteSettlementButton({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  async function handleClick() {
    if (!confirm("¿Eliminar este pago? La deuda se restaurará.")) return;
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
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-40"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
    </button>
  );
}

