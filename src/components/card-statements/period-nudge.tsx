"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useCardPeriodStatus, useCommitted } from "@/lib/api/hooks";
import type { CreditCardPeriodStatus } from "@/lib/api/schemas";
import { upsertCreditCardPeriod } from "@/lib/api/mutations";
import { invalidateStatements, dayMonth } from "@/lib/statements";
import { toast, toastError } from "@/lib/toast";

/** Days before the estimated closing when the nudge shows (plan 4.3). */
export const NUDGE_DAYS = 7;

type OpenPeriod = CreditCardPeriodStatus["openPeriod"];

/**
 * The open period to ask about: its dates come from the card's default days
 * and it closes within NUDGE_DAYS. Undefined otherwise.
 */
export function periodToConfirm(status: CreditCardPeriodStatus | undefined, today = new Date()): OpenPeriod | undefined {
  const open = status?.openPeriod;
  if (!open || open.loaded) return undefined;
  const [y, m, d] = open.closingDate.split("-").map(Number);
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((Date.UTC(y, m - 1, d) - start) / 86_400_000);
  return days >= 0 && days <= NUDGE_DAYS ? open : undefined;
}

/**
 * "Cargá el cierre de este mes de tu Visa" (plan 4.3): the card's closing
 * this month is estimated from its usual day. "Son esas" keeps the
 * estimate; "Cambiar fechas" loads the real ones.
 */
export function CardPeriodNudge({ paymentMethodId, cardName }: { paymentMethodId: string; cardName: string }) {
  const { data, mutate } = useCardPeriodStatus(paymentMethodId);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const open = periodToConfirm(data);
  if (!open) return null;

  async function save(closingDate: string, dueDate: string) {
    setSaving(true);
    try {
      await upsertCreditCardPeriod(paymentMethodId, open!.periodYm, { closingDate, dueDate });
      await Promise.all([mutate(), invalidateStatements(paymentMethodId)]);
      toast.success("Fechas guardadas");
      setEditing(false);
    } catch (err) {
      toastError(err, "No se pudieron guardar las fechas");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Alert>
      <p className="font-semibold">Cargá el cierre de este mes de tu {cardName}</p>
      <p className="mt-0.5">
        Si no, usamos los días de siempre: cierra el {dayMonth(open.closingDate)} y vence el {dayMonth(open.dueDate)}.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={saving} onClick={() => save(open.closingDate, open.dueDate)}>
          Son esas
        </Button>
        <Button size="sm" variant="ghost" disabled={saving} onClick={() => setEditing(true)}>
          Cambiar fechas
        </Button>
      </div>
      {editing && (
        <OpenPeriodDialog
          key={open.periodYm}
          cardName={cardName}
          period={open}
          saving={saving}
          onSave={save}
          onOpenChange={setEditing}
        />
      )}
    </Alert>
  );
}

function OpenPeriodDialog({
  cardName,
  period,
  saving,
  onSave,
  onOpenChange,
}: {
  cardName: string;
  period: OpenPeriod;
  saving: boolean;
  onSave: (closingDate: string, dueDate: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [closingDate, setClosingDate] = useState(period.closingDate);
  const [dueDate, setDueDate] = useState(period.dueDate);
  const dueBeforeClosing = !!closingDate && !!dueDate && dueDate < closingDate;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (closingDate && dueDate && !dueBeforeClosing) onSave(closingDate, dueDate);
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Cierre de este mes</DialogTitle>
          <DialogDescription>Las fechas del resumen de tu {cardName}, como figuran en el banco.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Cierre</Label>
            <DatePicker value={closingDate} onChange={setClosingDate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Vencimiento</Label>
            <DatePicker value={dueDate} onChange={setDueDate} aria-invalid={dueBeforeClosing} />
          </div>
          {dueBeforeClosing && <p className="text-caption text-negative">El vencimiento no puede ser anterior al cierre.</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!closingDate || !dueDate || dueBeforeClosing || saving}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The nudges of every credit card, for Inicio. */
export function CardPeriodNudges() {
  const { data } = useCommitted(6);
  return (
    <>
      {(data?.cards ?? []).map((c) => (
        <CardPeriodNudge key={c.paymentMethodId} paymentMethodId={c.paymentMethodId} cardName={c.name} />
      ))}
    </>
  );
}
