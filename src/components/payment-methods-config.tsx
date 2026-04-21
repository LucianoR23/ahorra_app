"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import {
  Plus, Pencil, Loader2, Power, PowerOff, CreditCard, ChevronDown, ChevronUp, Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  usePaymentMethods,
  useBanks,
  useCreditCard,
  useCreditCardPeriods,
} from "@/lib/api/hooks";
import {
  createPaymentMethod,
  patchPaymentMethod,
  activatePaymentMethod,
  deactivatePaymentMethod,
  patchCreditCard,
  upsertCreditCardPeriod,
  deleteCreditCardPeriod,
  type PaymentMethodCreateInput,
} from "@/lib/api/mutations";
import type { PaymentMethod, PaymentMethodKind } from "@/lib/api/schemas";
import { ApiError } from "@/lib/api/errors";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

const KIND_LABELS: Record<PaymentMethodKind, string> = {
  cash: "Efectivo",
  debit: "Débito",
  credit: "Crédito",
  transfer: "Transferencia",
  other: "Otro",
};

function invalidatePMs() {
  swrMutate(
    (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].startsWith("/payment-methods"),
    undefined,
    { revalidate: true },
  );
}

export function PaymentMethodsConfig() {
  const { data: methods, isLoading } = usePaymentMethods();
  const { data: banks } = useBanks();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  const bankName = (id?: string | null) =>
    id ? (banks?.find((b) => b.id === id)?.name ?? "—") : "Sin banco";

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold">Medios de pago</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Tarjetas, efectivo y cuentas bancarias.
            </p>
          </div>
          <PMFormDialog mode="create" onDone={invalidatePMs} />
        </div>

        {isLoading ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
          </div>
        ) : !methods?.length ? (
          <p className="mt-3 text-xs text-muted-foreground">No hay medios de pago.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {methods.map((pm) => {
              const expanded = expandedId === pm.id;
              return (
                <div key={pm.id} className="rounded-lg border border-border/60">
                  <div
                    className="flex cursor-pointer items-center gap-3 px-3 py-2.5"
                    onClick={() => setExpandedId(expanded ? null : pm.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{pm.name}</span>
                        <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                          {KIND_LABELS[pm.kind]}
                        </Badge>
                        {!pm.isActive && (
                          <Badge variant="outline" className="h-4 px-1.5 text-[9px] text-muted-foreground">
                            Inactivo
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{bankName(pm.bankId)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditing(pm); }}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <TogglePMButton pm={pm} />
                    {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </div>

                  {expanded && pm.kind === "credit" && (
                    <div className="border-t border-border/60 px-3 pb-3 pt-2">
                      <CreditCardDetail paymentMethodId={pm.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {editing && (
          <PMFormDialog
            mode="edit"
            pm={editing}
            open
            onOpenChange={(v) => !v && setEditing(null)}
            onDone={() => { invalidatePMs(); setEditing(null); }}
          />
        )}
      </CardContent>
    </Card>
  );
}

function TogglePMButton({ pm }: { pm: PaymentMethod }) {
  const [busy, setBusy] = useState(false);
  async function handle(e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    try {
      if (pm.isActive) await deactivatePaymentMethod(pm.id);
      else await activatePaymentMethod(pm.id);
      invalidatePMs();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={handle} disabled={busy} className="cursor-pointer text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? <Loader2 className="size-3.5 animate-spin" /> : pm.isActive ? <PowerOff className="size-3.5" /> : <Power className="size-3.5" />}
    </button>
  );
}

function CreditCardDetail({ paymentMethodId }: { paymentMethodId: string }) {
  const { data: card, isLoading: cardLoading } = useCreditCard(paymentMethodId);
  const { data: periods, isLoading: periodsLoading } = useCreditCardPeriods(paymentMethodId);
  const [editingCard, setEditingCard] = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);

  if (cardLoading || periodsLoading) {
    return <Skeleton className="h-16 w-full rounded-md" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {card && (
        <div className="rounded-md bg-muted/40 p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <span className="text-xs font-semibold">{card.alias}</span>
              {card.lastFour && <span className="text-[11px] text-muted-foreground">···· {card.lastFour}</span>}
            </div>
            <button
              type="button"
              onClick={() => setEditingCard(true)}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              Editar
            </button>
          </div>
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            Cierre: día {card.defaultClosingDay} · Vencimiento: día {card.defaultDueDay}
          </div>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground">Períodos cargados</span>
          <button
            type="button"
            onClick={() => setAddingPeriod(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
          >
            <Plus className="size-3" /> Agregar
          </button>
        </div>
        {!periods?.length ? (
          <p className="text-[11px] text-muted-foreground">Sin períodos guardados.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {periods.map((p) => (
              <div key={p.periodYm} className="flex items-center justify-between rounded bg-background px-2 py-1">
                <span className="text-[11px] font-mono font-semibold">{p.periodYm}</span>
                <span className="text-[11px] text-muted-foreground">
                  Cierra {p.closingDate} · Vence {p.dueDate}
                </span>
                <DeletePeriodButton paymentMethodId={paymentMethodId} ym={p.periodYm} />
              </div>
            ))}
          </div>
        )}
      </div>

      {editingCard && card && (
        <CreditCardEditDialog
          paymentMethodId={paymentMethodId}
          card={card}
          open
          onOpenChange={(v) => !v && setEditingCard(false)}
          onDone={() => { invalidatePMs(); setEditingCard(false); }}
        />
      )}

      {addingPeriod && (
        <PeriodFormDialog
          paymentMethodId={paymentMethodId}
          open
          onOpenChange={(v) => !v && setAddingPeriod(false)}
          onDone={() => {
            swrMutate(
              (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].includes("/credit-card/periods"),
              undefined,
              { revalidate: true },
            );
            setAddingPeriod(false);
          }}
        />
      )}
    </div>
  );
}

function DeletePeriodButton({ paymentMethodId, ym }: { paymentMethodId: string; ym: string }) {
  const [busy, setBusy] = useState(false);
  async function handle() {
    if (!confirm(`¿Eliminar el período ${ym}?`)) return;
    setBusy(true);
    try {
      await deleteCreditCardPeriod(paymentMethodId, ym);
      swrMutate(
        (k) => Array.isArray(k) && typeof k[0] === "string" && k[0].includes("/credit-card/periods"),
        undefined,
        { revalidate: true },
      );
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" onClick={handle} disabled={busy} className="cursor-pointer text-muted-foreground hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
    </button>
  );
}

function PeriodFormDialog({
  paymentMethodId,
  open,
  onOpenChange,
  onDone,
}: {
  paymentMethodId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const today = new Date();
  const defaultYm = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const [ym, setYm] = useState(defaultYm);
  const [closingDate, setClosingDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ym || !closingDate || !dueDate) return;
    setErr(null);
    setSaving(true);
    try {
      await upsertCreditCardPeriod(paymentMethodId, ym, { closingDate, dueDate });
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Agregar período</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="period-ym">Mes (YYYY-MM)</Label>
            <Input id="period-ym" value={ym} onChange={(e) => setYm(e.target.value)} placeholder="2026-04" />
          </div>
          <div>
            <Label htmlFor="period-closing">Fecha de cierre</Label>
            <Input id="period-closing" type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="period-due">Fecha de vencimiento</Label>
            <Input id="period-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!ym || !closingDate || !dueDate || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CreditCardEditDialog({
  paymentMethodId,
  card,
  open,
  onOpenChange,
  onDone,
}: {
  paymentMethodId: string;
  card: { alias: string; lastFour?: string | null; defaultClosingDay: number; defaultDueDay: number };
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const [alias, setAlias] = useState(card.alias);
  const [lastFour, setLastFour] = useState(card.lastFour ?? "");
  const [closingDay, setClosingDay] = useState(card.defaultClosingDay.toString());
  const [dueDay, setDueDay] = useState(card.defaultDueDay.toString());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      await patchCreditCard(paymentMethodId, {
        alias: alias.trim(),
        lastFour: lastFour.trim() || null,
        defaultClosingDay: Number(closingDay),
        defaultDueDay: Number(dueDay),
      });
      invalidatePMs();
      onDone();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Editar tarjeta de crédito</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="cc-alias">Alias</Label>
            <Input id="cc-alias" value={alias} onChange={(e) => setAlias(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="cc-last4">Últimos 4 dígitos (opcional)</Label>
            <Input id="cc-last4" value={lastFour} onChange={(e) => setLastFour(e.target.value)} maxLength={4} placeholder="1234" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="cc-closing">Día de cierre</Label>
              <Input id="cc-closing" type="number" min={1} max={31} value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cc-due">Día de vencimiento</Label>
              <Input id="cc-due" type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
            </div>
          </div>
          {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!alias.trim() || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PMFormDialog({
  mode,
  pm,
  open: controlledOpen,
  onOpenChange,
  onDone,
}: {
  mode: "create" | "edit";
  pm?: PaymentMethod;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  onDone: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const { data: banks } = useBanks();

  const [name, setName] = useState(pm?.name ?? "");
  const [kind, setKind] = useState<PaymentMethodKind>(pm?.kind ?? "cash");
  const [bankId, setBankId] = useState(pm?.bankId ?? "");
  const [allowsInstallments, setAllowsInstallments] = useState(pm?.allowsInstallments ?? false);
  const [ccAlias, setCcAlias] = useState("");
  const [ccLastFour, setCcLastFour] = useState("");
  const [ccClosingDay, setCcClosingDay] = useState("20");
  const [ccDueDay, setCcDueDay] = useState("5");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function resetForm() {
    setName(pm?.name ?? "");
    setKind(pm?.kind ?? "cash");
    setBankId(pm?.bankId ?? "");
    setAllowsInstallments(pm?.allowsInstallments ?? false);
    setCcAlias(""); setCcLastFour(""); setCcClosingDay("20"); setCcDueDay("5");
    setErr(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setErr(null);
    setSaving(true);
    try {
      if (mode === "create") {
        const input: PaymentMethodCreateInput = {
          name: name.trim(),
          kind,
          bankId: bankId || null,
          allowsInstallments,
        };
        if (kind === "credit" && ccAlias.trim()) {
          input.creditCard = {
            alias: ccAlias.trim(),
            lastFour: ccLastFour.trim() || null,
            defaultClosingDay: Number(ccClosingDay),
            defaultDueDay: Number(ccDueDay),
          };
        }
        await createPaymentMethod(input);
      } else if (pm) {
        await patchPaymentMethod(pm.id, {
          name: name.trim(),
          bankId: bankId || null,
          allowsInstallments,
        });
      }
      onDone();
      setOpen(false);
      if (mode === "create") resetForm();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setErr(null); }}>
      {mode === "create" && (
        <DialogTrigger render={<Button size="sm" onClick={resetForm} />}>
          <Plus className="mr-1 size-3.5" />
          Agregar
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Nuevo medio de pago" : "Editar medio de pago"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <Label htmlFor="pm-name">Nombre</Label>
            <Input id="pm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Visa Galicia" autoFocus />
          </div>

          {mode === "create" && (
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as PaymentMethodKind)}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(KIND_LABELS) as PaymentMethodKind[]).map((k) => (
                    <SelectItem key={k} value={k}>{KIND_LABELS[k]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Banco (opcional)</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="text-xs">
                <SelectValue placeholder="Sin banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin banco</SelectItem>
                {banks?.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allowsInstallments}
              onChange={(e) => setAllowsInstallments(e.target.checked)}
              className="cursor-pointer rounded"
            />
            Permite cuotas
          </label>

          {mode === "create" && kind === "credit" && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="mb-2 text-[11px] font-semibold">Datos de la tarjeta de crédito</p>
              <div className="flex flex-col gap-2">
                <div>
                  <Label htmlFor="cc-alias-new">Alias</Label>
                  <Input id="cc-alias-new" value={ccAlias} onChange={(e) => setCcAlias(e.target.value)} placeholder="Ej. Visa" />
                </div>
                <div>
                  <Label htmlFor="cc-last4-new">Últimos 4 dígitos (opcional)</Label>
                  <Input id="cc-last4-new" value={ccLastFour} onChange={(e) => setCcLastFour(e.target.value)} maxLength={4} placeholder="1234" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="cc-closing-new">Día cierre</Label>
                    <Input id="cc-closing-new" type="number" min={1} max={31} value={ccClosingDay} onChange={(e) => setCcClosingDay(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="cc-due-new">Día vencimiento</Label>
                    <Input id="cc-due-new" type="number" min={1} max={31} value={ccDueDay} onChange={(e) => setCcDueDay(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">{err}</div>}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={!name.trim() || saving}>
              {saving && <Loader2 className="mr-1 size-3.5 animate-spin" />}
              {mode === "create" ? "Crear" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// re-export for convenience
export { cn };
