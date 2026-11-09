"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { ArrowLeftRight, ChevronDown, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { DatePicker } from "@/components/ui/date-picker";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ListRow, ListRowSkeleton } from "@/components/ui/list-row";
import { Money } from "@/components/ui/money";
import { Skeleton } from "@/components/ui/skeleton";
import { useBalances, useBalancesMe, useHouseholdMembers, useHouseholds, useSettlements } from "@/lib/api/hooks";
import { createSettlement, deleteSettlement } from "@/lib/api/mutations";
import type { Settlement } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { confirm } from "@/lib/confirm";
import { fmtDateShort, isoToday } from "@/lib/format";
import { toastError } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth";
import { useHouseholdStore } from "@/stores/household";

const PAGE = 50;
const MAX_ROWS = 200;

export function invalidateDebts() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && (k[0].startsWith("/balances") || k[0].startsWith("/settlements")),
    undefined,
    { revalidate: true },
  );
}

/**
 * Cuentas entre ustedes (plan 1.10b, no design: the `Movimientos` list).
 * Your net balance on top, who owes whom with a button to pay, and the
 * payments, filtered by person and date; each payment opens its sheet.
 */
export function DebtsManager() {
  const me = useAuthStore((s) => s.user);
  const currentHhId = useHouseholdStore((s) => s.currentId);
  const { data: households } = useHouseholds();
  const baseCurrency = households?.find((h) => h.id === currentHhId)?.baseCurrency ?? "ARS";
  const { data: balances, isLoading: balLoading } = useBalances();
  const { data: meBal, isLoading: meLoading } = useBalancesMe();
  const { data: members } = useHouseholdMembers();

  const [withUserId, setWithUserId] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [singleDay, setSingleDay] = useState("");
  const [rows, setRows] = useState(PAGE);
  const [open, setOpen] = useState<Settlement | null>(null);

  const range = computeRange(datePreset, customFrom, customTo, singleDay);
  const { data: settlements, isLoading: sLoading } = useSettlements({
    limit: rows,
    withUser: withUserId || undefined,
    from: range.from,
    to: range.to,
  });

  const firstName = (id: string) => (id === me?.id ? "Vos" : (members?.find((x) => x.userId === id)?.firstName ?? "Alguien"));
  // Go sends an empty slice as null (the SWR fetcher does not apply zod defaults).
  const debts = balances?.balances ?? [];
  const items = settlements?.items ?? [];
  const count = settlements?.totalCount ?? 0;
  const net = meBal?.net ?? 0;

  function debtLabel(from: string, to: string) {
    if (to === me?.id) return `${firstName(from)} te debe`;
    if (from === me?.id) return `Le debés a ${firstName(to)}`;
    return `${firstName(from)} le debe a ${firstName(to)}`;
  }

  function payLabel(from: string, to: string) {
    if (from === me?.id) return `Le pagaste a ${firstName(to)}`;
    if (to === me?.id) return `${firstName(from)} te pagó`;
    return `${firstName(from)} le pagó a ${firstName(to)}`;
  }

  function filter<T>(set: (v: T) => void) {
    return (v: T) => {
      setRows(PAGE);
      set(v);
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-1 text-center">
          <p className="text-body text-ink-muted">{net > 0 ? "Te deben" : net < 0 ? "Debés" : "Tu saldo"}</p>
          {meLoading ? (
            <Skeleton className="h-10 w-40" />
          ) : (
            <p className={cn("text-display font-bold", net > 0 ? "text-positive" : net < 0 ? "text-negative" : "text-ink")}>
              <Money amount={Math.abs(net)} currency={baseCurrency} />
            </p>
          )}
          <p className="text-caption text-ink-muted">
            {net === 0 ? "Están al día." : "Sumando lo que te deben y lo que debés en el hogar."}
          </p>
        </CardContent>
      </Card>

      <section aria-label="Lo que se deben" className="flex flex-col gap-2">
        <h2 className="px-1 text-caption font-semibold text-ink-muted">Lo que se deben</h2>
        {balLoading ? (
          <Card className="py-1">
            <CardContent>
              <ListRowSkeleton />
            </CardContent>
          </Card>
        ) : debts.length === 0 ? (
          <Card>
            <CardContent className="text-center text-body text-ink-muted">Todo saldado. Nadie le debe nada a nadie.</CardContent>
          </Card>
        ) : (
          <Card className="py-1">
            <CardContent>
              <ul className="divide-y divide-border">
                {debts.map((b) => {
                  const mine = b.from === me?.id || b.to === me?.id;
                  return (
                    <li key={`${b.from}-${b.to}`} className="flex min-h-16 items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body text-ink">{debtLabel(b.from, b.to)}</p>
                        <p className={cn("text-title font-bold", b.to === me?.id ? "text-positive" : b.from === me?.id ? "text-negative" : "text-ink")}>
                          <Money amount={b.amount} currency={baseCurrency} />
                        </p>
                      </div>
                      {mine && (
                        <PayDebtDialog
                          fromUser={b.from}
                          toUser={b.to}
                          maxAmount={b.amount}
                          fromLabel={firstName(b.from)}
                          toLabel={firstName(b.to)}
                          baseCurrency={baseCurrency}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      <section aria-label="Pagos" className="flex flex-col gap-2">
        <h2 className="px-1 text-caption font-semibold text-ink-muted">Pagos</h2>
        <div role="group" aria-label="Filtros" className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:px-0 [&::-webkit-scrollbar]:hidden">
          <Chip pressed={withUserId === ""} onClick={() => filter(setWithUserId)("")}>
            Todos
          </Chip>
          {members
            ?.filter((m) => m.userId !== me?.id)
            .map((m) => (
              <Chip key={m.userId} pressed={withUserId === m.userId} onClick={() => filter(setWithUserId)(m.userId)}>
                Con {m.firstName}
              </Chip>
            ))}
          <DateMenu value={datePreset} onChange={filter(setDatePreset)} />
        </div>
        {datePreset === "day" && <DatePicker value={singleDay} onChange={filter(setSingleDay)} placeholder="Elegí el día" />}
        {datePreset === "range" && (
          <div className="grid grid-cols-2 gap-2">
            <DatePicker value={customFrom} onChange={filter(setCustomFrom)} placeholder="Desde" />
            <DatePicker value={customTo} onChange={filter(setCustomTo)} placeholder="Hasta" />
          </div>
        )}

        {sLoading ? (
          <Card className="py-1">
            <CardContent>
              {[0, 1].map((i) => (
                <ListRowSkeleton key={i} />
              ))}
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <EmptyState
            icon={HandCoins}
            title={withUserId || datePreset !== "all" ? "Sin pagos con estos filtros" : "Todavía no registraron pagos"}
            description="Cuando alguien salde una deuda, registralo con «Pagar» y aparece acá."
          />
        ) : (
          <Card className="py-1">
            <CardContent>
              <ul className="divide-y divide-border">
                {items.map((s) => (
                  <li key={s.id}>
                    <ListRow
                      onClick={() => setOpen(s)}
                      leading={
                        <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                          <ArrowLeftRight className="size-5" strokeWidth={1.75} />
                        </span>
                      }
                      title={payLabel(s.fromUser, s.toUser)}
                      subtitle={[fmtDateShort(s.paidAt), s.note].filter(Boolean).join(" · ")}
                      trailing={<Money amount={s.amount} currency={s.baseCurrency} />}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {items.length < count &&
          (rows < MAX_ROWS ? (
            <Button variant="secondary" className="self-center" onClick={() => setRows(Math.min(rows + PAGE, MAX_ROWS))}>
              Cargar más
            </Button>
          ) : (
            <p className="text-center text-caption text-ink-muted">
              Ves los últimos {MAX_ROWS} de {count}.
            </p>
          ))}
      </section>

      {open && (
        <SettlementSheet
          settlement={open}
          fromLabel={firstName(open.fromUser)}
          toLabel={firstName(open.toUser)}
          onOpenChange={(v) => !v && setOpen(null)}
        />
      )}
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
  day: "Un día",
  range: "Entre dos fechas",
};

function DateMenu({ value, onChange }: { value: DatePreset; onChange: (v: DatePreset) => void }) {
  const active = value !== "all";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Chip active={active} aria-label={`Fecha: ${DATE_PRESET_LABELS[value]}`} />}>
        {active ? DATE_PRESET_LABELS[value] : "Fecha"}
        <ChevronDown aria-hidden strokeWidth={1.75} />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-56">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as DatePreset)}>
          {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((k) => (
            <DropdownMenuRadioItem key={k} value={k} className="min-h-11 text-body">
              {DATE_PRESET_LABELS[k]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function computeRange(preset: DatePreset, customFrom: string, customTo: string, singleDay: string): { from?: string; to?: string } {
  const now = new Date();
  switch (preset) {
    case "all":
      return {};
    case "this_month":
      return { from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)), to: toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "last_month":
      return { from: toIso(new Date(now.getFullYear(), now.getMonth() - 1, 1)), to: toIso(new Date(now.getFullYear(), now.getMonth(), 0)) };
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
    case "year":
      return { from: toIso(new Date(now.getFullYear(), 0, 1)), to: toIso(new Date(now.getFullYear(), 11, 31)) };
    case "day":
      return singleDay ? { from: singleDay, to: singleDay } : {};
    case "range":
      return { from: customFrom || undefined, to: customTo || undefined };
  }
}

/** "Registrar pago" of one debt. `trigger` replaces the "Pagar" button. */
export function PayDebtDialog({
  fromUser,
  toUser,
  maxAmount,
  fromLabel,
  toLabel,
  baseCurrency,
  trigger,
}: {
  fromUser: string;
  toUser: string;
  maxAmount: number;
  fromLabel: string;
  toLabel: string;
  baseCurrency: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(maxAmount.toFixed(2));
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(isoToday());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const amountNum = Number(amount.replace(",", "."));
  const tooMuch = amountNum > maxAmount + 0.005;
  const invalid = !Number.isFinite(amountNum) || amountNum <= 0 || tooMuch;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid) return;
    setErr(null);
    setSaving(true);
    try {
      await createSettlement({ fromUser, toUser, amount: Number(amountNum.toFixed(2)), note: note.trim() || undefined, paidAt });
      invalidateDebts();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo registrar el pago");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setAmount(maxAmount.toFixed(2));
          setNote("");
          setPaidAt(isoToday());
          setErr(null);
        }
      }}
    >
      {trigger ? <DialogTrigger render={trigger} /> : <DialogTrigger render={<Button variant="secondary" />}>Pagar</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>
            {fromLabel === "Vos" ? `Le pagás a ${toLabel}` : `${fromLabel} te paga`}. La deuda es de{" "}
            <Money amount={maxAmount} currency={baseCurrency} className="font-semibold text-ink" />.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">Monto</Label>
            <Input
              id="pay-amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={tooMuch}
              aria-describedby={tooMuch ? "pay-amount-error" : undefined}
              className="tabular-nums"
            />
            {tooMuch && (
              <p id="pay-amount-error" className="text-caption text-negative">
                No puede ser más que la deuda.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Fecha</Label>
              <DatePicker value={paidAt} onChange={setPaidAt} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-note">Nota</Label>
              <Input id="pay-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
            </div>
          </div>
          {err && (
            <p role="alert" className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
              {err}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={invalid || saving}>
            {saving ? "Guardando…" : "Confirmar pago"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** A payment's sheet: who paid whom, how much, when, the note; delete at the end. */
function SettlementSheet({
  settlement: s,
  fromLabel,
  toLabel,
  onOpenChange,
}: {
  settlement: Settlement;
  fromLabel: string;
  toLabel: string;
  onOpenChange: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    const ok = await confirm({
      title: "¿Eliminar este pago?",
      description: "La deuda vuelve a estar como antes del pago.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteSettlement(s.id);
      invalidateDebts();
      onOpenChange(false);
    } catch (e) {
      toastError(e, "No se pudo eliminar el pago");
      setBusy(false);
    }
  }

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex min-h-12 items-center justify-between gap-4 py-2 text-body">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-right font-semibold text-ink">{value}</dd>
    </div>
  );

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pago</DialogTitle>
        </DialogHeader>
        <p className="text-center text-display font-bold">
          <Money amount={s.amount} currency={s.baseCurrency} />
        </p>
        <dl className="divide-y divide-border">
          {row("De", fromLabel)}
          {row("Para", toLabel)}
          {row("Fecha", fmtDateShort(s.paidAt))}
          {s.note ? row("Nota", <span className="font-normal whitespace-pre-wrap">{s.note}</span>) : null}
        </dl>
        <Button
          variant="ghost"
          className="self-center text-negative hover:bg-negative-soft hover:text-negative"
          onClick={handleDelete}
          disabled={busy}
        >
          {busy ? "Eliminando…" : "Eliminar pago"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
