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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CardStatement, Currency } from "@/lib/api/schemas";
import { payCardStatement } from "@/lib/api/mutations";
import { invalidateStatements, totalIn } from "@/lib/statements";
import { toast, toastError } from "@/lib/toast";

/**
 * "Marcar como pagado" (plan 4.1): the total by default, or what was paid
 * (the minimum, part of it). Every installment of the statement is marked
 * paid either way; a partial payment is only recorded.
 */
export function PayStatementDialog({
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
  const currencies = statement.totals.length > 0 ? statement.totals.map((t) => t.currency) : (["ARS"] as Currency[]);
  const [currency, setCurrency] = useState<Currency>(currencies.includes("ARS") ? "ARS" : currencies[0]);
  const [amount, setAmount] = useState(String(totalIn(statement, currency) || ""));
  const [saving, setSaving] = useState(false);

  const value = Number(amount.replace(",", "."));
  const valid = Number.isFinite(value) && value > 0;

  function changeCurrency(next: Currency) {
    setCurrency(next);
    setAmount(String(totalIn(statement, next) || ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await payCardStatement(paymentMethodId, statement.periodYm, { amount: value, currency });
      await invalidateStatements(paymentMethodId);
      toast.success("Resumen marcado como pagado");
      onOpenChange(false);
    } catch (err) {
      toastError(err, "No se pudo marcar como pagado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como pagado</DialogTitle>
          <DialogDescription>
            Las {statement.installmentCount} cuotas de este resumen quedan pagadas. Si pagaste una parte, poné cuánto.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <Label htmlFor="pay-amount">Monto pagado</Label>
              <Input
                id="pay-amount"
                className="mt-1.5"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
            {currencies.length > 1 && (
              <div className="w-28">
                <Label htmlFor="pay-currency">Moneda</Label>
                <Select value={currency} onValueChange={(v) => v && changeCurrency(v as Currency)}>
                  <SelectTrigger id="pay-currency" className="mt-1.5 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!valid || saving}>
              Marcar como pagado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
