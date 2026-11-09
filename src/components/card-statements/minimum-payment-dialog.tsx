"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CardStatement } from "@/lib/api/schemas";
import { setStatementMinimum } from "@/lib/api/mutations";
import { invalidateStatements } from "@/lib/statements";
import { toastError } from "@/lib/toast";

/** The minimum payment printed on the statement, in pesos (plan 4.1). */
export function MinimumPaymentDialog({
  paymentMethodId,
  statement,
  open,
  onOpenChange,
}: {
  paymentMethodId: string;
  statement: CardStatement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [amount, setAmount] = useState(statement.minimumPayment !== null ? String(statement.minimumPayment) : "");
  const [saving, setSaving] = useState(false);
  const value = Number(amount.replace(",", "."));
  const valid = amount.trim() !== "" && Number.isFinite(value) && value >= 0;

  async function save(minimum: number | null) {
    setSaving(true);
    try {
      await setStatementMinimum(paymentMethodId, statement.periodYm, minimum);
      await invalidateStatements(paymentMethodId);
      onOpenChange(false);
    } catch (err) {
      toastError(err, "No se pudo guardar el pago mínimo");
    } finally {
      setSaving(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (valid) void save(value);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Pago mínimo</DialogTitle>
          <DialogDescription>El que figura en el resumen, en pesos.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="minimum-amount">Monto</Label>
            <Input
              id="minimum-amount"
              className="mt-1.5"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            {statement.minimumPayment !== null && (
              <Button type="button" variant="ghost" disabled={saving} onClick={() => save(null)}>
                Quitar
              </Button>
            )}
            <Button type="submit" disabled={!valid || saving}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
