"use client";

import { useState } from "react";
import { mutate as swrMutate } from "swr";
import { Loader2, Receipt, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDraftExpenses, useRecurringExpenses } from "@/lib/api/hooks";
import { confirmDraftExpense } from "@/lib/api/mutations";
import { toast, toastError } from "@/lib/toast";
import { fmtMoney, fmtDateShort } from "@/lib/format";
import type { Expense, RecurringExpense } from "@/lib/api/schemas";

// invalidateAfterConfirm: el confirm toca varios caches (drafts, lista de
// expenses, recurrente con last_amount actualizado, reportes mensuales).
// Pegamos a todo lo que comparte prefix para evitar UI desincronizada.
function invalidateAfterConfirm() {
  swrMutate(
    (k) => {
      if (!Array.isArray(k) || typeof k[0] !== "string") return false;
      const path = k[0] as string;
      return (
        path.startsWith("/expenses") ||
        path.startsWith("/recurring-expenses") ||
        path.startsWith("/reports") ||
        path.startsWith("/balances")
      );
    },
    undefined,
    { revalidate: true },
  );
}

export function PendingDraftsCard() {
  const { data: drafts, isLoading } = useDraftExpenses();
  // Necesitamos las recurrentes para mostrar el threshold + last_amount en
  // el modal de confirm. Cae al estimado del draft si no se encuentra.
  const { data: recurringList } = useRecurringExpenses();
  const recurringById = new Map<string, RecurringExpense>(
    recurringList?.map((r) => [r.id, r]) ?? [],
  );

  const [confirming, setConfirming] = useState<Expense | null>(null);

  if (!isLoading && (!drafts || drafts.length === 0)) {
    // No mostramos card vacía — la home ya tiene mucho ruido. Solo aparece
    // cuando hay drafts pendientes.
    return null;
  }

  return (
    <Card className="rounded-2xl border-0 bg-amber-50 shadow-card dark:bg-amber-950/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 place-items-center rounded-xl bg-amber-200/60 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100">
            <Receipt className="size-4.5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold">Pendientes de confirmar</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Cargá el monto real de la factura para cerrar el mes.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {isLoading
            ? Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))
            : drafts!.map((d) => (
                <DraftRow
                  key={d.id}
                  draft={d}
                  series={d.recurringExpenseId ? recurringById.get(d.recurringExpenseId) : undefined}
                  onClick={() => setConfirming(d)}
                />
              ))}
        </div>
      </CardContent>

      <ConfirmDialog
        draft={confirming}
        series={confirming?.recurringExpenseId ? recurringById.get(confirming.recurringExpenseId) : undefined}
        onClose={() => setConfirming(null)}
      />
    </Card>
  );
}

function DraftRow({
  draft,
  series,
  onClick,
}: {
  draft: Expense;
  series?: RecurringExpense;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl bg-card p-3 text-left shadow-sm transition hover:shadow-md"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{draft.description}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {fmtDateShort(draft.spentAt)} · estimado
        </div>
      </div>
      <div className="text-right">
        <div className="text-sm font-bold">{fmtMoney(draft.amount, draft.currency)}</div>
        <div className="text-[11px] text-amber-700 dark:text-amber-300">Confirmar →</div>
      </div>
    </button>
  );
}

function ConfirmDialog({
  draft,
  series,
  onClose,
}: {
  draft: Expense | null;
  series?: RecurringExpense;
  onClose: () => void;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  // Reset cuando cambia el draft target (usuario tocó otro item antes de
  // confirmar el primero). Sin reset, el value del modal anterior se
  // arrastra y confunde.
  const draftId = draft?.id ?? null;
  const [boundTo, setBoundTo] = useState<string | null>(null);
  if (draftId !== boundTo) {
    setBoundTo(draftId);
    setValue(draft ? String(draft.amount) : "");
  }

  if (!draft) return null;

  const parsed = Number(value.replace(",", "."));
  const valid = Number.isFinite(parsed) && parsed > 0;
  const prev = series?.lastAmount ?? null;
  // Preview pasivo de variación: si hay last_amount, mostramos % vs mes
  // anterior como info. No es una alerta — es contexto para que el user
  // valide visualmente que el monto que tipeó tiene sentido.
  const previewDelta =
    valid && prev !== null && prev > 0 ? ((parsed - prev) / prev) * 100 : null;

  async function handleConfirm() {
    if (!valid || !draft) return;
    setBusy(true);
    try {
      await confirmDraftExpense(draft.id, parsed);
      toast.success("Gasto confirmado");
      invalidateAfterConfirm();
      onClose();
    } catch (err) {
      toastError(err, "No pudimos confirmar el gasto");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={!!draft} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{draft.description}</DialogTitle>
          <DialogDescription>
            {fmtDateShort(draft.spentAt)} · estimado{" "}
            {fmtMoney(draft.amount, draft.currency)}
            {prev !== null ? ` · mes anterior ${fmtMoney(prev, draft.currency)}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-amount">Monto real de la factura</Label>
            <Input
              id="confirm-amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>

          {previewDelta !== null ? (
            <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[12px] text-muted-foreground">
              <TrendingUp className="size-3.5" />
              <span>
                {previewDelta >= 0 ? "+" : ""}
                {previewDelta.toFixed(1)}% vs mes anterior
              </span>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!valid || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
