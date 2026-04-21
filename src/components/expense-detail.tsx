"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { mutate as swrMutate } from "swr";
import { ArrowLeft, Repeat, Trash2, Check, Edit3, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useExpense,
  useCategories,
  usePaymentMethods,
  useHouseholdMembers,
} from "@/lib/api/hooks";
import {
  deleteExpense,
  patchExpense,
  patchInstallment,
  type InstallmentPatchInput,
} from "@/lib/api/mutations";
import { ApiError } from "@/lib/api/errors";
import { fmtMoney, fmtDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Installment } from "@/lib/api/schemas";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export function ExpenseDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useExpense(id);
  const { data: categories } = useCategories();
  const { data: paymentMethods } = usePaymentMethods();
  const { data: members } = useHouseholdMembers();

  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    swrMutate(
      (k) => Array.isArray(k) && typeof k[0] === "string" &&
        (k[0].startsWith("/expenses") || k[0].startsWith("/reports") || k[0].startsWith("/balances")),
      undefined,
      { revalidate: true },
    );
  }

  async function onDelete() {
    if (!confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) return;
    setDeleting(true);
    try {
      await deleteExpense(id);
      refresh();
      router.replace("/movimientos");
    } catch (e) {
      setDeleting(false);
      alert(e instanceof ApiError ? e.message : "No se pudo eliminar");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link href="/movimientos" className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <ArrowLeft className="size-4" /> Movimientos
        </Link>
        <Card className="rounded-2xl border-0 shadow-card">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {error instanceof ApiError ? error.message : "No se pudo cargar el gasto."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { expense, installments } = data;
  const category = categories?.find((c) => c.id === expense.categoryId);
  const pm = paymentMethods?.find((p) => p.id === expense.paymentMethodId);
  const memberName = (uid: string) => {
    const m = members?.find((x) => x.userId === uid);
    return m ? `${m.firstName} ${m.lastName}`.trim() || m.email : uid.slice(0, 8);
  };

  return (
    <div className="flex flex-col gap-4">
      <Link href="/movimientos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Movimientos
      </Link>

      {/* Header */}
      <Card className="rounded-2xl border-0 shadow-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="truncate text-xl font-bold tracking-tight">{expense.description}</h1>
                {expense.recurringExpenseId && (
                  <Badge variant="secondary" className="gap-0.5">
                    <Repeat className="size-2.5" /> Fijo
                  </Badge>
                )}
                {expense.isShared && <Badge variant="outline">Compartido</Badge>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {fmtDateShort(expense.spentAt)} · {category?.name ?? "Sin categoría"} · {pm?.name ?? "—"}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-mono text-xl font-bold">
                {fmtMoney(expense.amountBase, expense.baseCurrency, { decimals: 0 })}
              </div>
              {expense.currency !== expense.baseCurrency && (
                <div className="text-[11px] text-muted-foreground">
                  {fmtMoney(expense.amount, expense.currency, { decimals: 0 })}
                  {expense.rateUsed && ` @ ${expense.rateUsed.toFixed(2)}`}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditing(!editing)}
              className="flex-1"
            >
              <Edit3 className="size-3" /> {editing ? "Cancelar" : "Editar"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={deleting}
              className="flex-1"
            >
              <Trash2 className="size-3" /> {deleting ? "Eliminando…" : "Eliminar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {editing && (
        <EditExpense
          expense={expense}
          categories={categories ?? []}
          onSaved={() => { setEditing(false); refresh(); }}
        />
      )}

      {/* Installments */}
      <div>
        <h2 className="mb-2 text-sm font-bold">
          {installments.length > 1 ? `Cuotas (${installments.length})` : "Cuota"}
        </h2>
        <Card className="rounded-2xl border-0 shadow-card overflow-hidden">
          {installments.map((inst, i) => (
            <InstallmentRow
              key={inst.id}
              expenseId={expense.id}
              installment={inst}
              baseCurrency={expense.baseCurrency}
              isLast={i === installments.length - 1}
              getName={memberName}
              onChanged={refresh}
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

function EditExpense({
  expense,
  categories,
  onSaved,
}: {
  expense: { id: string; description: string; spentAt: string; categoryId?: string | null };
  categories: { id: string; name: string }[];
  onSaved: () => void;
}) {
  const [description, setDescription] = useState(expense.description);
  const [spentAt, setSpentAt] = useState(expense.spentAt);
  const [categoryId, setCategoryId] = useState(expense.categoryId ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSave() {
    setSaving(true);
    setErr(null);
    try {
      await patchExpense(expense.id, {
        description,
        spentAt,
        categoryId: categoryId || null,
      });
      onSaved();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Error");
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-2xl border-0 shadow-card">
      <CardContent className="p-4 space-y-3">
        <div className="space-y-1.5">
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Fecha</Label>
            <Input type="date" value={spentAt} onChange={(e) => setSpentAt(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sin categoría</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button onClick={onSave} disabled={saving} size="sm" className="w-full">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </CardContent>
    </Card>
  );
}

function InstallmentRow({
  expenseId,
  installment,
  baseCurrency,
  isLast,
  getName,
  onChanged,
}: {
  expenseId: string;
  installment: Installment;
  baseCurrency: string;
  isLast: boolean;
  getName: (uid: string) => string;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingDates, setEditingDates] = useState(false);
  const [billingDate, setBillingDate] = useState(installment.billingDate ?? "");
  const [dueDate, setDueDate] = useState(installment.dueDate ?? "");
  const [busy, setBusy] = useState(false);

  async function apply(input: InstallmentPatchInput) {
    setBusy(true);
    try {
      await patchInstallment(expenseId, installment.installmentNumber, input);
      onChanged();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "No se pudo actualizar");
    } finally {
      setBusy(false);
    }
  }

  async function togglePaid() {
    await apply({ isPaid: !installment.isPaid });
  }

  async function saveDates() {
    const input: InstallmentPatchInput = {};
    if (billingDate) input.billingDate = billingDate;
    else input.billingDate = null;
    if (dueDate) input.dueDate = dueDate;
    else input.dueDate = null;
    await apply(input);
    setEditingDates(false);
  }

  return (
    <div className={cn(!isLast && "border-b border-border")}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "grid size-8 shrink-0 place-items-center rounded-full text-xs font-bold",
            installment.isPaid ? "bg-positive/20 text-positive" : "bg-muted text-muted-foreground",
          )}>
            {installment.isPaid ? <Check className="size-4" /> : installment.installmentNumber}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Cuota {installment.installmentNumber}</span>
              {installment.isPaid && <Badge variant="secondary" className="text-[9px]">Pagada</Badge>}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
              {installment.billingDate ? (
                <>Factura {fmtDateShort(installment.billingDate)}{installment.dueDate ? ` · vence ${fmtDateShort(installment.dueDate)}` : ""}</>
              ) : (
                "Sin fecha de facturación"
              )}
            </div>
          </div>
          <div className="shrink-0 font-mono text-sm font-semibold">
            {fmtMoney(installment.installmentAmountBase, baseCurrency, { decimals: 0 })}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 pt-1 space-y-3 bg-muted/20">
          {/* Shares */}
          {installment.shares && installment.shares.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">División</div>
              {installment.shares.map((s) => (
                <div key={s.userId} className="flex items-center justify-between text-xs">
                  <span className="truncate">{getName(s.userId)}</span>
                  <span className="font-mono font-semibold">
                    {fmtMoney(s.amountBaseOwed, baseCurrency, { decimals: 0 })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Date editing */}
          {editingDates ? (
            <div className="space-y-2 rounded-md bg-background p-2 border border-border">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Factura</Label>
                  <Input type="date" value={billingDate} onChange={(e) => setBillingDate(e.target.value)} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px]">Vencimiento</Label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-8 text-xs" />
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" onClick={() => setEditingDates(false)} className="flex-1" disabled={busy}>
                  <X className="size-3" /> Cancelar
                </Button>
                <Button size="sm" onClick={saveDates} className="flex-1" disabled={busy}>
                  {busy ? "…" : "Guardar"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditingDates(true)} disabled={busy} className="flex-1">
                <Edit3 className="size-3" /> Editar fechas
              </Button>
              <Button
                size="sm"
                variant={installment.isPaid ? "outline" : "default"}
                onClick={togglePaid}
                disabled={busy}
                className="flex-1"
              >
                <Check className="size-3" /> {installment.isPaid ? "Marcar impaga" : "Marcar pagada"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
