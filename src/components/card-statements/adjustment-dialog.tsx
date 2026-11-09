"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdjustmentKind, Currency, StatementAdjustment } from "@/lib/api/schemas";
import { createStatementAdjustment, updateStatementAdjustment } from "@/lib/api/mutations";
import { ADJUSTMENT_LABELS, invalidateStatements } from "@/lib/statements";
import { toastError } from "@/lib/toast";

const KINDS = Object.keys(ADJUSTMENT_LABELS) as AdjustmentKind[];
const CURRENCIES: Currency[] = ["ARS", "USD", "EUR"];

/** Adds or edits a line of the statement that isn't an expense (plan 4.1). */
export function AdjustmentDialog({
  paymentMethodId,
  periodYm,
  adjustment,
  onClose,
}: {
  paymentMethodId: string;
  periodYm: string;
  adjustment: StatementAdjustment | null;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<AdjustmentKind>(adjustment?.kind ?? "interest");
  const [description, setDescription] = useState(adjustment?.description ?? "");
  const [amount, setAmount] = useState(adjustment ? String(adjustment.amount) : "");
  const [currency, setCurrency] = useState<Currency>(adjustment?.currency ?? "ARS");
  const [saving, setSaving] = useState(false);

  const value = Number(amount.replace(",", "."));
  const valid = description.trim() !== "" && Number.isFinite(value) && value > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    const input = { kind, description: description.trim(), amount: value, currency };
    try {
      if (adjustment) await updateStatementAdjustment(paymentMethodId, periodYm, adjustment.id, input);
      else await createStatementAdjustment(paymentMethodId, periodYm, input);
      await invalidateStatements(paymentMethodId);
      onClose();
    } catch (err) {
      toastError(err, "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{adjustment ? "Editar" : "Agregar al resumen"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="adj-kind">Tipo</Label>
            <Select value={kind} onValueChange={(v) => v && setKind(v as AdjustmentKind)}>
              <SelectTrigger id="adj-kind" className="mt-1.5 w-full">
                <SelectValue>{(v: AdjustmentKind) => ADJUSTMENT_LABELS[v]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {ADJUSTMENT_LABELS[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="adj-description">Descripción</Label>
            <Input
              id="adj-description"
              className="mt-1.5"
              maxLength={80}
              value={description}
              placeholder="Ej.: IVA sobre intereses"
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="adj-amount">Monto</Label>
              <Input
                id="adj-amount"
                className="mt-1.5"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="w-28">
              <Label htmlFor="adj-currency">Moneda</Label>
              <Select value={currency} onValueChange={(v) => v && setCurrency(v as Currency)}>
                <SelectTrigger id="adj-currency" className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {kind === "credit" && <p className="text-caption text-ink-muted">Una bonificación se resta del total.</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              {adjustment ? "Guardar" : "Agregar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
